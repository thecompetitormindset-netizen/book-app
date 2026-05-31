"""
AI backend: uses Groq (cloud) if GROQ_API_KEY is set, otherwise Ollama (local).
Groq is ~10x faster and required for Railway/Vercel deployment.
"""
import os

GROQ_MODEL  = "llama-3.3-70b-versatile"
OLLAMA_MODEL = "llama3.2"

GENRES = [
    "Fiction", "Science Fiction & Fantasy", "Mystery & Thriller",
    "Biography & Memoir", "History", "Science & Nature",
    "Mathematics", "Engineering & Technology", "Computer Science",
    "Business & Finance", "Economics", "Self-Help & Psychology",
    "Philosophy", "Arts & Film", "Health & Medicine",
    "Law & Politics", "Religion & Spirituality", "Travel & Geography",
    "Education", "Other Non-Fiction",
]


def _groq_client():
    key = os.environ.get("GROQ_API_KEY", "")
    if not key:
        return None
    from groq import Groq
    return Groq(api_key=key)


def _chat(messages: list[dict], max_tokens: int = 2000) -> str:
    client = _groq_client()
    if client:
        resp = client.chat.completions.create(
            model=GROQ_MODEL, messages=messages, max_tokens=max_tokens,
            temperature=0.3,
        )
        return resp.choices[0].message.content.strip()
    else:
        import ollama
        resp = ollama.chat(model=OLLAMA_MODEL, messages=messages)
        return resp["message"]["content"].strip()


SUMMARIZE_PROMPT = """You are an expert literary analyst. Read the following book content carefully and produce a rich, detailed summary.

First line must be exactly:
GENRE: <one genre from this list: {genres}>

Then write a comprehensive summary with these sections:

## Overview
A thorough 4-6 sentence overview of what the book is about, its purpose, and its significance.

## Key Themes
3-5 major themes explored in depth, with specific examples from the book.

## Main Characters / Key Figures
(If applicable) Detailed descriptions of central people — their roles, motivations, and development.

## Chapter-by-Chapter Highlights
The most important ideas or events from major sections of the book.

## Key Takeaways
5-7 specific, actionable lessons or insights the reader will gain.

## Quotes & Notable Passages
2-3 memorable or important quotes or ideas from the book (paraphrase if exact text is unavailable).

## Who Should Read It
Who benefits most from this book and exactly why.

## Verdict
A brief honest assessment of the book's strengths and weaknesses.

Be specific, thorough, and insightful. Aim for 700-1000 words.

Book Title: {title}
Author: {author}

Book Content:
{text}
"""

CHAT_SYSTEM = """You are a knowledgeable literary assistant helping the user understand the book "{title}" by {author}.

You have access to the book's content below. Answer questions accurately and in detail, citing specific parts of the book when relevant. If asked for more detail, go deeper. If something isn't covered in the provided text, say so honestly.

Book Summary:
{summary}

Book Content (excerpt):
{text}
"""


def summarize_book(title: str, author: str, text: str) -> tuple[str, str]:
    """Returns (summary, genre). Uses up to 20k chars for richer detail."""
    truncated = text[:20_000]
    if len(text) > 20_000:
        truncated += "\n\n[Content continues beyond this excerpt.]"

    prompt = SUMMARIZE_PROMPT.format(
        genres=", ".join(GENRES), title=title, author=author, text=truncated,
    )
    raw = _chat([{"role": "user", "content": prompt}], max_tokens=2000)

    genre = "Other Non-Fiction"
    summary = raw
    lines = raw.splitlines()
    if lines and lines[0].upper().startswith("GENRE:"):
        detected = lines[0].split(":", 1)[1].strip()
        if detected in GENRES:
            genre = detected
        summary = "\n".join(lines[1:]).strip()

    return summary, genre


def stream_chat(title: str, author: str, summary: str, book_text: str, question: str):
    """Yield answer tokens as they arrive (streams from Groq or Ollama)."""
    system_msg = CHAT_SYSTEM.format(
        title=title, author=author,
        summary=summary or "(summary not yet available)",
        text=book_text[:25_000],
    )
    messages = [
        {"role": "system", "content": system_msg},
        {"role": "user", "content": question},
    ]

    client = _groq_client()
    if client:
        stream = client.chat.completions.create(
            model=GROQ_MODEL, messages=messages, max_tokens=1500, stream=True,
        )
        for chunk in stream:
            token = chunk.choices[0].delta.content or ""
            if token:
                yield token
    else:
        import ollama
        for chunk in ollama.chat(model=OLLAMA_MODEL, messages=messages, stream=True):
            token = chunk.get("message", {}).get("content", "")
            if token:
                yield token
