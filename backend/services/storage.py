"""
Cloud-aware file storage.
- Cloud mode  (SUPABASE_URL + SUPABASE_SERVICE_KEY set): files go to Supabase Storage
- Local mode  (env vars absent):                         files go to local disk (existing behaviour)
"""
import os
import tempfile
from pathlib import Path

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

BUCKETS = ("uploads", "thumbnails", "texts")


def is_cloud() -> bool:
    return bool(SUPABASE_URL and SUPABASE_KEY)


def _client():
    from supabase import create_client
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def _ensure_buckets():
    """Create buckets if they don't exist (idempotent)."""
    client = _client()
    existing = {b.name for b in client.storage.list_buckets()}
    for name in BUCKETS:
        if name not in existing:
            client.storage.create_bucket(name, options={"public": True})


# ── Upload ─────────────────────────────────────────────────────────────────────

def upload(bucket: str, name: str, data: bytes, mime: str = "application/octet-stream") -> str:
    """Upload bytes → Supabase. Returns the public URL."""
    client = _client()
    try:
        client.storage.from_(bucket).remove([name])  # overwrite if exists
    except Exception:
        pass
    client.storage.from_(bucket).upload(
        name, data, file_options={"content-type": mime, "upsert": "true"}
    )
    return client.storage.from_(bucket).get_public_url(name)


def upload_file(bucket: str, local_path: str) -> str:
    """Upload a local file → Supabase. Returns the public URL."""
    path = Path(local_path)
    mime_map = {".pdf": "application/pdf", ".epub": "application/epub+zip",
                ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".txt": "text/plain"}
    mime = mime_map.get(path.suffix.lower(), "application/octet-stream")
    return upload(bucket, path.name, path.read_bytes(), mime)


# ── Download ───────────────────────────────────────────────────────────────────

def download_to_temp(bucket: str, name: str) -> str:
    """Download from Supabase → temp file. Caller must delete the file."""
    data = _client().storage.from_(bucket).download(name)
    suffix = Path(name).suffix
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    tmp.write(data)
    tmp.flush()
    tmp.close()
    return tmp.name


# ── Delete ─────────────────────────────────────────────────────────────────────

def delete(bucket: str, name: str):
    try:
        _client().storage.from_(bucket).remove([name])
    except Exception:
        pass


# ── Public URL (for already-uploaded files) ────────────────────────────────────

def public_url(bucket: str, name: str) -> str:
    return _client().storage.from_(bucket).get_public_url(name)
