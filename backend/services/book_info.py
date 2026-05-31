import re
import urllib.parse
from pathlib import Path

import httpx

THUMB_DIR = Path(__file__).parent.parent.parent / "thumbnails"
THUMB_DIR.mkdir(exist_ok=True)

HEADERS = {"User-Agent": "BookSummaryApp/1.0 (personal project)"}


def _maybe_cloud_upload(dest: Path) -> str:
    """If running in cloud mode, upload to Supabase and return public URL; else return filename."""
    from services.storage import is_cloud, upload as cloud_upload
    if is_cloud():
        url = cloud_upload("thumbnails", dest.name, dest.read_bytes(), "image/jpeg")
        dest.unlink(missing_ok=True)
        return url
    return dest.name


def _clean_title(title: str) -> str:
    """Strip filename junk like publisher names, years, edition numbers."""
    # Remove parenthetical content: (2004), (John Wiley), etc.
    title = re.sub(r"\(.*?\)", "", title)
    # Remove edition markers
    title = re.sub(r"\b\d+(st|nd|rd|th)\s+ed(ition)?\b", "", title, flags=re.I)
    # Remove year standalone
    title = re.sub(r"\b(19|20)\d{2}\b", "", title)
    # Remove publisher names that commonly appear in filenames
    title = re.sub(r"\b(wiley|springer|elsevier|pearson|mcgraw|oreilly|packt|apress|crc)\b", "", title, flags=re.I)
    return re.sub(r"\s{2,}", " ", title).strip(" -_.,")


def _download_cover(client: httpx.Client, url: str, dest: Path) -> bool:
    try:
        r = client.get(url, timeout=10)
        if r.status_code == 200 and len(r.content) > 2000:
            dest.write_bytes(r.content)
            return True
    except Exception:
        pass
    return False


def fetch_book_info(title: str, author: str, dest_stem: str) -> dict:
    """
    Search Open Library for a cover image and description.
    Tries multiple query strategies. Falls back silently on any failure.
    Returns dict with any of: thumbnail (local filename), book_description.
    """
    result = {}
    dest = THUMB_DIR / f"{dest_stem}.jpg"
    clean = _clean_title(title)

    try:
        with httpx.Client(timeout=12, headers=HEADERS, follow_redirects=True) as client:

            # Try multiple search strategies, stopping as soon as we get a hit
            search_attempts = [{"q": f"{clean} {author}".strip()}]
            if author and author.lower() != "unknown":
                search_attempts.insert(0, {"title": clean, "author": author})
            search_attempts.append({"q": clean})

            doc = None
            for params in search_attempts:
                params["limit"] = "5"
                params["fields"] = "key,title,author_name,cover_i,isbn,first_sentence"
                try:
                    resp = client.get("https://openlibrary.org/search.json", params=params)
                    docs = resp.json().get("docs", [])
                    if docs:
                        # Prefer docs that have a cover
                        doc = next((d for d in docs if d.get("cover_i")), docs[0])
                        break
                except Exception:
                    continue

            if not doc:
                return result

            cover_id = doc.get("cover_i")
            work_key = doc.get("key")

            # Publisher description
            if work_key:
                try:
                    wr = client.get(f"https://openlibrary.org{work_key}.json")
                    if wr.status_code == 200:
                        works = wr.json()
                        desc = works.get("description")
                        if isinstance(desc, dict):
                            desc = desc.get("value", "")
                        if isinstance(desc, str) and len(desc) > 30:
                            result["book_description"] = desc.strip()
                except Exception:
                    pass

            if not result.get("book_description"):
                fs = doc.get("first_sentence")
                if isinstance(fs, list) and fs:
                    result["book_description"] = fs[0]
                elif isinstance(fs, str):
                    result["book_description"] = fs

            # Cover by cover_id (most reliable)
            if cover_id:
                if _download_cover(client, f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg", dest):
                    result["thumbnail"] = _maybe_cloud_upload(dest)

            # Cover by ISBN fallback
            if not result.get("thumbnail"):
                for isbn in doc.get("isbn", [])[:5]:
                    if _download_cover(client, f"https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg", dest):
                        result["thumbnail"] = _maybe_cloud_upload(dest)
                        break

    except Exception:
        pass

    return result
