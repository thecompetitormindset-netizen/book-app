from pathlib import Path

THUMB_DIR = Path(__file__).parent.parent.parent / "thumbnails"
THUMB_DIR.mkdir(exist_ok=True)


def thumb_path_for(filename: str) -> Path:
    stem = Path(filename).stem
    return THUMB_DIR / f"{stem}.jpg"


def generate_thumbnail(file_path: str, file_format: str) -> str | None:
    """Generate a thumbnail JPEG. Returns a filename (local) or full URL (cloud), or None."""
    from services.storage import is_cloud, upload as cloud_upload
    dest = thumb_path_for(Path(file_path).name)
    try:
        if file_format == "pdf":
            _thumb_pdf(file_path, dest)
        elif file_format == "epub":
            ok = _thumb_epub(file_path, dest)
            if not ok:
                return None
        else:
            return None

        if is_cloud():
            url = cloud_upload("thumbnails", dest.name, dest.read_bytes(), "image/jpeg")
            dest.unlink(missing_ok=True)
            return url
        return dest.name
    except Exception:
        return None


def _thumb_pdf(src: str, dest: Path):
    import fitz  # pymupdf

    doc = fitz.open(src)
    page = doc[0]
    # Render at 1.0× scale for a compact thumbnail
    mat = fitz.Matrix(1.0, 1.0)
    pix = page.get_pixmap(matrix=mat)
    pix.save(str(dest), output="jpeg", jpg_quality=75)
    doc.close()


def _thumb_epub(src: str, dest: Path) -> bool:
    import ebooklib
    from ebooklib import epub
    from PIL import Image
    import io

    book = epub.read_epub(src, options={"ignore_ncx": True})

    # Try cover metadata first
    cover_id = None
    meta = book.get_metadata("OPF", "cover")
    if meta:
        cover_id = meta[0][1].get("content")

    cover_data = None

    for item in book.get_items():
        item_id = item.get_id() or ""
        item_name = item.get_name() or ""
        is_image = item.media_type and item.media_type.startswith("image/")

        if not is_image:
            continue

        if cover_id and item_id == cover_id:
            cover_data = item.get_content()
            break

        lower_name = item_name.lower()
        lower_id = item_id.lower()
        if any(k in lower_name or k in lower_id for k in ("cover", "thumbnail", "front")):
            cover_data = item.get_content()
            break

    if not cover_data:
        return False

    img = Image.open(io.BytesIO(cover_data)).convert("RGB")
    img.thumbnail((400, 600), Image.LANCZOS)
    img.save(str(dest), "JPEG", quality=85)
    return True
