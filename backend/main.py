import os
import random
import shutil
from pathlib import Path

BOOKS_FOLDER = Path("/Users/nabinbudhathoki/Documents/Books ")

from typing import Optional
from dotenv import load_dotenv
import asyncio
import threading
from concurrent.futures import ThreadPoolExecutor
from fastapi import BackgroundTasks, Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

load_dotenv()

from database import Base, engine, get_db
from models import Book
from services.book_info import fetch_book_info
from services.parser import extract_text
from services.storage import is_cloud, upload, upload_file, download_to_temp, delete as storage_delete, public_url as storage_public_url
from services.study_guide import generate_study_guide
from services.summarizer import summarize_book, stream_chat
from services.thumbnailer import generate_thumbnail

Base.metadata.create_all(bind=engine)

# Migrate older databases
with engine.connect() as conn:
    for col in [
        "ALTER TABLE books ADD COLUMN thumbnail VARCHAR(500)",
        "ALTER TABLE books ADD COLUMN genre VARCHAR(100)",
        "ALTER TABLE books ADD COLUMN book_description TEXT",
        "ALTER TABLE books ADD COLUMN study_guide TEXT",
        "ALTER TABLE books ADD COLUMN study_status VARCHAR(20) DEFAULT 'none'",
        "ALTER TABLE books ADD COLUMN reading_status VARCHAR(20) DEFAULT 'unread'",
        "ALTER TABLE books ADD COLUMN rating INTEGER DEFAULT 0",
        "ALTER TABLE books ADD COLUMN notes TEXT",
        "ALTER TABLE books ADD COLUMN finished_at DATETIME",
    ]:
        try:
            conn.execute(text(col))
            conn.commit()
        except Exception:
            pass

UPLOAD_DIR   = Path(__file__).parent.parent / "uploads"
THUMB_DIR    = Path(__file__).parent.parent / "thumbnails"
TEXT_DIR     = Path(__file__).parent.parent / "texts"
FRONTEND_DIR = Path(__file__).parent.parent / "frontend" / "dist"
UPLOAD_DIR.mkdir(exist_ok=True)
THUMB_DIR.mkdir(exist_ok=True)
TEXT_DIR.mkdir(exist_ok=True)

COVER_COLORS = [
    "#4F46E5", "#7C3AED", "#DB2777", "#DC2626",
    "#D97706", "#059669", "#0284C7", "#9333EA",
    "#C2410C", "#0F766E", "#1D4ED8", "#BE185D",
]

app = FastAPI(title="BookSummary API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/thumbnails", StaticFiles(directory=str(THUMB_DIR)), name="thumbnails")

# Parallel processing pool — 3 books summarized simultaneously
_pool = ThreadPoolExecutor(max_workers=3, thread_name_prefix="book-worker")

def _submit(fn, *args):
    """Submit a task to the parallel pool (replaces BackgroundTasks for book processing)."""
    _pool.submit(fn, *args)

# Serve built frontend assets
if FRONTEND_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR / "assets")), name="assets")


@app.on_event("startup")
async def resume_pending():
    """On every startup, re-queue any books that were left pending or processing."""
    def _run():
        from database import SessionLocal
        db = SessionLocal()
        try:
            stuck = db.query(Book).filter(
                Book.summary_status.in_(["pending", "processing"])
            ).all()
            if stuck:
                print(f"[startup] Resuming {len(stuck)} pending/stuck books…")
            for book in stuck:
                book.summary_status = "pending"
                db.commit()
                file_path = UPLOAD_DIR / book.filename
                if file_path.exists():
                    _submit(process_book, book.id, str(file_path), book.file_format)
        finally:
            db.close()

    # Run in a background thread so startup completes immediately
    t = threading.Thread(target=_run, daemon=True)
    t.start()


def book_to_dict(book: Book) -> dict:
    return {
        "id": book.id,
        "title": book.title,
        "author": book.author,
        "filename": book.filename,
        "file_format": book.file_format,
        "file_size": book.file_size,
        "page_count": book.page_count,
        "summary": book.summary,
        "book_description": book.book_description,
        "summary_status": book.summary_status,
        "study_status": book.study_status,
        "genre": book.genre,
        "cover_color": book.cover_color,
        "thumbnail": book.thumbnail,
        "uploaded_at": book.uploaded_at.isoformat(),
        "reading_status": book.reading_status or "unread",
        "rating": book.rating or 0,
        "notes": book.notes,
        "finished_at": book.finished_at.isoformat() if book.finished_at else None,
    }


def get_book_text(filename: str) -> str:
    stem = Path(filename).stem
    if is_cloud():
        try:
            data = __import__("services.storage", fromlist=["_client"])
            from supabase import create_client
            import os as _os
            c = create_client(_os.environ["SUPABASE_URL"], _os.environ["SUPABASE_SERVICE_KEY"])
            raw = c.storage.from_("texts").download(f"{stem}.txt")
            return raw.decode("utf-8", errors="ignore")
        except Exception:
            return ""
    text_file = TEXT_DIR / f"{stem}.txt"
    if text_file.exists():
        return text_file.read_text(encoding="utf-8", errors="ignore")
    return ""


def process_book(book_id: int, file_path: str, file_format: str):
    """Background task: thumbnail → cover fetch → parse → save text → summarize."""
    from database import SessionLocal

    db = SessionLocal()
    try:
        book = db.query(Book).filter(Book.id == book_id).first()
        if not book:
            return

        # 1. Fetch real cover + publisher description from Open Library
        dest_stem = Path(file_path).stem
        info = fetch_book_info(book.title, book.author, dest_stem)
        if info.get("thumbnail"):
            book.thumbnail = info["thumbnail"]
        if info.get("book_description"):
            book.book_description = info["book_description"]
        db.commit()

        # 2. Fall back to rendering PDF/EPUB cover if Open Library had nothing
        if not book.thumbnail:
            thumb = generate_thumbnail(file_path, file_format)
            if thumb:
                book.thumbnail = thumb
                db.commit()

        book.summary_status = "processing"
        db.commit()

        # 3. Extract text
        extracted_text, page_count, parsed_title, parsed_author = extract_text(file_path, file_format)

        if book.title == Path(file_path).stem:
            book.title = parsed_title
        if book.author == "Unknown":
            book.author = parsed_author
        book.page_count = page_count
        db.commit()

        # 4. Save full text for chat
        if is_cloud():
            upload("texts", f"{dest_stem}.txt", extracted_text.encode("utf-8", errors="ignore"), "text/plain")
        else:
            text_file = TEXT_DIR / f"{dest_stem}.txt"
            text_file.write_text(extracted_text, encoding="utf-8", errors="ignore")

        # 5. Summarize — keep old summary safe until the new one is ready
        summary, genre = summarize_book(book.title, book.author, extracted_text)
        book.summary = summary
        book.genre = genre
        book.summary_status = "done"
        db.commit()

    except Exception as e:
        db2 = SessionLocal()
        book2 = db2.query(Book).filter(Book.id == book_id).first()
        if book2:
            # Only mark error if there was no prior summary — never overwrite a good one
            if not book2.summary:
                book2.summary_status = "error"
                book2.summary = f"Error generating summary: {str(e)}"
            else:
                book2.summary_status = "done"  # keep the old summary
            db2.commit()
        db2.close()
    finally:
        db.close()


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/api/books")
def list_books(db: Session = Depends(get_db)):
    books = db.query(Book).order_by(Book.uploaded_at.desc()).all()
    return [book_to_dict(b) for b in books]


@app.get("/api/books/{book_id}")
def get_book(book_id: int, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book_to_dict(book)


@app.post("/api/books/upload")
async def upload_book(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    suffix = Path(file.filename).suffix.lower()
    if suffix not in (".pdf", ".epub"):
        raise HTTPException(status_code=400, detail="Only PDF and EPUB files are supported")

    file_format = suffix.lstrip(".")
    safe_name = Path(file.filename).stem[:100] + suffix
    dest = UPLOAD_DIR / safe_name

    counter = 1
    while dest.exists():
        dest = UPLOAD_DIR / f"{Path(file.filename).stem[:100]}_{counter}{suffix}"
        counter += 1

    content = await file.read()
    file_size = len(content)
    safe_filename = dest.name

    if is_cloud():
        # In cloud mode: store in Supabase, use a temp file for processing
        mime = "application/pdf" if file_format == "pdf" else "application/epub+zip"
        upload("uploads", safe_filename, content, mime)
        # Write temp file for process_book to use
        dest.write_bytes(content)
    else:
        with open(dest, "wb") as f:
            f.write(content)

    book = Book(
        title=Path(file.filename).stem,
        author="Unknown",
        filename=safe_filename,
        file_format=file_format,
        file_size=file_size,
        cover_color=random.choice(COVER_COLORS),
        summary_status="pending",
    )
    db.add(book)
    db.commit()
    db.refresh(book)

    _submit(process_book, book.id, str(dest), file_format)
    return book_to_dict(book)


@app.delete("/api/books/{book_id}")
def delete_book(book_id: int, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    stem = Path(book.filename).stem
    if is_cloud():
        storage_delete("uploads", book.filename)
        if book.thumbnail and not book.thumbnail.startswith("http"):
            storage_delete("thumbnails", book.thumbnail)
        storage_delete("texts", f"{stem}.txt")
    else:
        for path in [
            UPLOAD_DIR / book.filename,
            THUMB_DIR / book.thumbnail if book.thumbnail and not book.thumbnail.startswith("http") else None,
            TEXT_DIR / f"{stem}.txt",
        ]:
            if path and path.exists():
                path.unlink()

    db.delete(book)
    db.commit()
    return {"message": "Book deleted"}


@app.post("/api/books/{book_id}/regenerate")
def regenerate_summary(
    book_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    # Mark as processing but KEEP the old summary visible while new one generates
    book.summary_status = "processing"
    db.commit()

    file_path = UPLOAD_DIR / book.filename
    _submit(process_book, book.id, str(file_path), book.file_format)
    return book_to_dict(book)


class ChatRequest(BaseModel):
    question: str
    history: list[dict] = []


@app.post("/api/books/{book_id}/chat")
def chat_with_book(
    book_id: int,
    body: ChatRequest,
    db: Session = Depends(get_db),
):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    if not body.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    book_text = get_book_text(book.filename)

    def generate():
        try:
            for token in stream_chat(
                title=book.title,
                author=book.author,
                summary=book.summary or "",
                book_text=book_text,
                question=body.question.strip(),
            ):
                yield token
        except Exception as e:
            yield f"\n\n[Error: {str(e)}]"

    return StreamingResponse(generate(), media_type="text/plain; charset=utf-8")


@app.get("/api/books/folder/scan")
def scan_folder(db: Session = Depends(get_db)):
    if not BOOKS_FOLDER.exists():
        raise HTTPException(status_code=404, detail=f"Folder not found: {BOOKS_FOLDER}")

    existing = {b.filename for b in db.query(Book.filename).all()}
    files = []
    for f in sorted(BOOKS_FOLDER.iterdir()):
        if f.suffix.lower() in (".pdf", ".epub") and f.is_file():
            safe_name = f.stem[:100] + f.suffix.lower()
            files.append({
                "name": f.name,
                "safe_name": safe_name,
                "size": f.stat().st_size,
                "format": f.suffix.lower().lstrip("."),
                "already_imported": safe_name in existing,
            })
    return {"folder": str(BOOKS_FOLDER), "files": files}


@app.post("/api/books/folder/import")
def import_from_folder(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    if not BOOKS_FOLDER.exists():
        raise HTTPException(status_code=404, detail=f"Folder not found: {BOOKS_FOLDER}")

    existing_filenames = {b.filename for b in db.query(Book.filename).all()}
    imported = []

    for src in sorted(BOOKS_FOLDER.iterdir()):
        if src.suffix.lower() not in (".pdf", ".epub") or not src.is_file():
            continue

        safe_name = src.stem[:100] + src.suffix.lower()
        if safe_name in existing_filenames:
            continue

        dest = UPLOAD_DIR / safe_name
        counter = 1
        while dest.exists():
            dest = UPLOAD_DIR / f"{src.stem[:100]}_{counter}{src.suffix.lower()}"
            counter += 1

        shutil.copy2(src, dest)

        book = Book(
            title=src.stem,
            author="Unknown",
            filename=dest.name,
            file_format=src.suffix.lower().lstrip("."),
            file_size=src.stat().st_size,
            cover_color=random.choice(COVER_COLORS),
            summary_status="pending",
        )
        db.add(book)
        db.commit()
        db.refresh(book)

        background_tasks.add_task(process_book, book.id, str(dest), book.file_format)
        imported.append(book_to_dict(book))
        existing_filenames.add(dest.name)

    return {"imported": len(imported), "books": imported}


def _run_study_guide(book_id: int):
    """Background task: generate study guide and store as JSON."""
    import json as _json
    from database import SessionLocal

    db = SessionLocal()
    try:
        book = db.query(Book).filter(Book.id == book_id).first()
        if not book:
            return

        book_text = get_book_text(book.filename)
        if not book_text:
            # Re-extract if text file is missing
            file_path = UPLOAD_DIR / book.filename
            if file_path.exists():
                from services.parser import extract_text as _extract
                book_text, _, _, _ = _extract(str(file_path), book.file_format)

        guide = generate_study_guide(book.title, book.author, book_text)
        book.study_guide = _json.dumps(guide)
        book.study_status = "done"
        db.commit()
    except Exception as e:
        book2 = db.query(Book).filter(Book.id == book_id).first()
        if book2:
            book2.study_status = "error"
            db.commit()
    finally:
        db.close()


@app.post("/api/books/{book_id}/study")
def start_study_guide(
    book_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    book.study_status = "processing"
    book.study_guide = None
    db.commit()

    _submit(_run_study_guide, book_id)
    return {"study_status": "processing"}


@app.get("/api/books/{book_id}/study")
def get_study_guide(book_id: int, db: Session = Depends(get_db)):
    import json as _json

    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    if book.study_status == "done" and book.study_guide:
        return {"study_status": "done", "guide": _json.loads(book.study_guide)}

    return {"study_status": book.study_status or "none", "guide": None}


def _backfill_thumbnails():
    """Background task: generate thumbnails for every book that doesn't have one."""
    from database import SessionLocal

    db = SessionLocal()
    try:
        books = db.query(Book).filter(Book.thumbnail.is_(None)).all()
        for book in books:
            try:
                dest_stem = Path(book.filename).stem
                # Try Open Library first
                info = fetch_book_info(book.title, book.author, dest_stem)
                if info.get("thumbnail"):
                    book.thumbnail = info["thumbnail"]
                    if info.get("book_description") and not book.book_description:
                        book.book_description = info["book_description"]
                    db.commit()
                    continue

                # Fall back to rendering the PDF/EPUB
                file_path = UPLOAD_DIR / book.filename
                if file_path.exists():
                    thumb = generate_thumbnail(str(file_path), book.file_format)
                    if thumb:
                        book.thumbnail = thumb
                        db.commit()
            except Exception:
                continue
    finally:
        db.close()


@app.post("/api/admin/backfill-thumbnails")
def backfill_thumbnails(background_tasks: BackgroundTasks):
    """Trigger thumbnail generation for all books missing one."""
    background_tasks.add_task(_backfill_thumbnails)
    return {"message": "Backfill started"}


@app.patch("/api/books/{book_id}/meta")
def update_book_meta(book_id: int, body: dict, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    if "reading_status" in body:
        status = body["reading_status"]
        if status not in ("unread", "reading", "finished"):
            raise HTTPException(status_code=400, detail="Invalid reading_status")
        book.reading_status = status
        if status == "finished" and not book.finished_at:
            book.finished_at = datetime.utcnow()
        elif status != "finished":
            book.finished_at = None

    if "rating" in body:
        book.rating = max(0, min(5, int(body["rating"])))

    if "notes" in body:
        book.notes = (body["notes"] or "")[:5000] or None

    db.commit()
    return book_to_dict(book)


@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    from collections import defaultdict
    import json as _json

    books = db.query(Book).all()
    total = len(books)
    done = sum(1 for b in books if b.summary_status == "done")
    pending = sum(1 for b in books if b.summary_status in ("pending", "processing"))
    error = sum(1 for b in books if b.summary_status == "error")

    # Reading status
    unread   = sum(1 for b in books if (b.reading_status or "unread") == "unread")
    reading  = sum(1 for b in books if (b.reading_status or "unread") == "reading")
    finished = sum(1 for b in books if (b.reading_status or "unread") == "finished")

    # Pages & reading time (250 words/page, avg page ~300 words)
    total_pages = sum(b.page_count or 0 for b in books if (b.reading_status or "unread") == "finished")
    reading_hours = round(total_pages * 1.5 / 60, 1)

    # Ratings
    rated = [b.rating for b in books if b.rating and b.rating > 0]
    avg_rating = round(sum(rated) / len(rated), 1) if rated else 0

    # Genre breakdown
    genres: dict = defaultdict(int)
    for b in books:
        if b.genre:
            genres[b.genre] += 1
    top_genres = sorted(genres.items(), key=lambda x: -x[1])[:10]

    # Finished per month (last 12 months)
    monthly: dict = defaultdict(int)
    for b in books:
        if b.finished_at:
            key = b.finished_at.strftime("%Y-%m")
            monthly[key] += 1

    # Top rated books
    top_rated = sorted(
        [b for b in books if b.rating and b.rating >= 4],
        key=lambda b: -(b.rating or 0)
    )[:5]

    # Total flashcards
    total_fc = 0
    for b in books:
        if b.study_guide:
            try:
                guide = _json.loads(b.study_guide)
                total_fc += len(guide.get("flashcards", []))
            except Exception:
                pass

    return {
        "total": total,
        "done": done,
        "pending": pending,
        "error": error,
        "pct": round(done / total * 100) if total else 0,
        "reading_status": {"unread": unread, "reading": reading, "finished": finished},
        "total_pages_read": total_pages,
        "reading_hours": reading_hours,
        "avg_rating": avg_rating,
        "rated_count": len(rated),
        "top_genres": [{"genre": g, "count": c} for g, c in top_genres],
        "monthly_finished": dict(sorted(monthly.items())),
        "top_rated": [book_to_dict(b) for b in top_rated],
        "total_flashcards": total_fc,
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}


# ── Serve React frontend (catch-all — must be last) ───────────────────────────
@app.get("/favicon.svg")
@app.get("/icons.svg")
def static_root_files(request_path: str = "favicon.svg"):
    p = FRONTEND_DIR / request_path.lstrip("/")
    if p.exists():
        return FileResponse(str(p))
    return FileResponse(str(FRONTEND_DIR / "index.html"))


@app.get("/{full_path:path}")
def serve_frontend(full_path: str):
    # API routes are handled above; everything else gets the React app
    if full_path.startswith("api/") or full_path.startswith("thumbnails/") or full_path.startswith("assets/"):
        raise HTTPException(status_code=404)
    file_path = FRONTEND_DIR / full_path
    if file_path.exists() and file_path.is_file():
        return FileResponse(str(file_path))
    return FileResponse(str(FRONTEND_DIR / "index.html"))
