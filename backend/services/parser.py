import io
import re
from pathlib import Path


def extract_text_from_pdf(file_path: str) -> tuple[str, int, str, str]:
    """Returns (text, page_count, title, author)."""
    import pdfplumber

    title = Path(file_path).stem
    author = "Unknown"
    text_parts = []
    page_count = 0

    with pdfplumber.open(file_path) as pdf:
        page_count = len(pdf.pages)
        metadata = pdf.metadata or {}
        if metadata.get("Title"):
            title = metadata["Title"]
        if metadata.get("Author"):
            author = metadata["Author"]

        # Extract text from first 80 pages max to keep context manageable
        for page in pdf.pages[:80]:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)

    return "\n\n".join(text_parts), page_count, title, author


def extract_text_from_epub(file_path: str) -> tuple[str, int, str, str]:
    """Returns (text, chapter_count, title, author)."""
    import ebooklib
    from ebooklib import epub
    from bs4 import BeautifulSoup

    book = epub.read_epub(file_path, options={"ignore_ncx": True})

    title = book.get_metadata("DC", "title")
    title = title[0][0] if title else Path(file_path).stem

    author = book.get_metadata("DC", "creator")
    author = author[0][0] if author else "Unknown"

    text_parts = []
    chapter_count = 0

    for item in book.get_items_of_type(ebooklib.ITEM_DOCUMENT):
        soup = BeautifulSoup(item.get_content(), "lxml")
        text = soup.get_text(separator="\n", strip=True)
        if len(text) > 100:
            text_parts.append(text)
            chapter_count += 1

    full_text = "\n\n".join(text_parts)
    # Collapse excessive whitespace
    full_text = re.sub(r"\n{3,}", "\n\n", full_text)

    return full_text, chapter_count, title, author


def extract_text(file_path: str, file_format: str) -> tuple[str, int, str, str]:
    if file_format == "pdf":
        return extract_text_from_pdf(file_path)
    elif file_format == "epub":
        return extract_text_from_epub(file_path)
    raise ValueError(f"Unsupported format: {file_format}")
