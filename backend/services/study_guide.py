"""
Generates a deep study guide for technical books:
  1. Extracts chapter structure, key concepts, and glossary terms (Ollama)
  2. Generates flashcards (Ollama)
  3. Enriches every concept with Wikipedia description + diagram image
"""

import json
import re
import time
import urllib.parse
from datetime import datetime

import httpx
import ollama

GROQ_MODEL   = "llama-3.3-70b-versatile"
OLLAMA_MODEL = "llama3.2"
WIKI_HEADERS = {"User-Agent": "BookStudyApp/1.0 (personal research tool)"}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _safe_json(raw: str) -> dict | list | None:
    """Extract valid JSON from a string that may have surrounding text."""
    raw = raw.strip()
    try:
        return json.loads(raw)
    except Exception:
        pass
    # Try to find JSON object/array inside the text
    for pattern in [r"\{.*\}", r"\[.*\]"]:
        m = re.search(pattern, raw, re.DOTALL)
        if m:
            try:
                return json.loads(m.group())
            except Exception:
                pass
    return None


def _ai(prompt: str, system: str = "") -> str:
    import os
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    groq_key = os.environ.get("GROQ_API_KEY", "")
    if groq_key:
        from groq import Groq
        client = Groq(api_key=groq_key)
        resp = client.chat.completions.create(
            model=GROQ_MODEL, messages=messages, max_tokens=3000,
            response_format={"type": "json_object"},
        )
        return resp.choices[0].message.content
    else:
        resp = ollama.chat(model=OLLAMA_MODEL, messages=messages, format="json")
        return resp["message"]["content"]


def _wiki(term: str) -> dict:
    """Fetch Wikipedia summary + thumbnail for a concept."""
    try:
        url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(term)}"
        with httpx.Client(timeout=8, headers=WIKI_HEADERS) as client:
            r = client.get(url)
            if r.status_code != 200:
                # Try a search fallback
                search_url = (
                    "https://en.wikipedia.org/w/api.php"
                    f"?action=query&list=search&srsearch={urllib.parse.quote(term)}"
                    "&format=json&srlimit=1"
                )
                sr = client.get(search_url)
                hits = sr.json().get("query", {}).get("search", [])
                if not hits:
                    return {}
                title = hits[0]["title"]
                r = client.get(
                    f"https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(title)}"
                )
                if r.status_code != 200:
                    return {}

            data = r.json()
            result = {
                "wiki_description": data.get("extract", ""),
                "wiki_url": data.get("content_urls", {}).get("desktop", {}).get("page", ""),
            }
            thumb = data.get("thumbnail", {}).get("source", "")
            if thumb:
                result["wiki_image"] = thumb
            return result
    except Exception:
        return {}


# ── Extraction passes ─────────────────────────────────────────────────────────

STRUCTURE_PROMPT = """You are analyzing the technical book "{title}" by {author}.

Carefully read the content and extract the book's structure in JSON.

Return ONLY valid JSON matching this exact schema (no extra keys, no markdown):
{{
  "chapters": [
    {{
      "title": "chapter or section name",
      "summary": "3-5 sentence explanation of what this section covers",
      "key_points": ["specific point 1", "specific point 2", "specific point 3"],
      "important_terms": ["term1", "term2", "term3"]
    }}
  ],
  "concepts": [
    {{
      "term": "exact technical term",
      "definition": "precise definition as used in this book",
      "why_important": "why this concept matters in this field"
    }}
  ]
}}

Rules:
- Extract EVERY chapter or major section you can identify
- Extract at least 25 concepts — include ALL significant technical terms, theorems, formulas, algorithms, methods
- Definitions must be precise and field-specific

Book: {title} by {author}
Content:
{text}
"""

FLASHCARD_PROMPT = """You are creating study flashcards for the technical book "{title}" by {author}.

Generate 40 flashcards covering: definitions, theorems, formulas, methods, key ideas, and practical applications.

Return ONLY valid JSON — an array of objects with NO extra text:
[
  {{
    "question": "clear, specific question",
    "answer": "complete, accurate answer (2-4 sentences)",
    "category": "one of: Definition / Theorem / Formula / Method / Application / Concept"
  }}
]

Make questions specific enough to test real understanding, not just recall.
Include formula-based questions where relevant.

Book content:
{text}
"""


# ── Main entry point ──────────────────────────────────────────────────────────

def generate_study_guide(
    title: str,
    author: str,
    full_text: str,
    on_progress=None,
) -> dict:
    """
    Full pipeline. on_progress(step: str, pct: int) called at each stage.
    Returns the study guide dict ready to JSON-serialize.
    """

    def progress(step, pct):
        if on_progress:
            on_progress(step, pct)

    # Use a generous text window — up to 40k chars for deep coverage
    text = full_text[:40_000]
    if len(full_text) > 40_000:
        text += "\n\n[Content continues — additional chapters not shown in this excerpt.]"

    progress("Extracting book structure and concepts…", 10)

    # ── Pass 1: Structure + concepts ─────────────────────────────────────────
    raw1 = _ai(STRUCTURE_PROMPT.format(title=title, author=author, text=text))
    structure = _safe_json(raw1) or {}
    chapters = structure.get("chapters", [])
    raw_concepts = structure.get("concepts", [])

    progress("Generating flashcards…", 35)

    # ── Pass 2: Flashcards ───────────────────────────────────────────────────
    raw2 = _ai(FLASHCARD_PROMPT.format(title=title, author=author, text=text))
    flashcards = _safe_json(raw2)
    if not isinstance(flashcards, list):
        flashcards = []

    progress("Looking up concepts on Wikipedia…", 55)

    # ── Pass 3: Wikipedia enrichment ─────────────────────────────────────────
    enriched = []
    total = len(raw_concepts)
    for i, c in enumerate(raw_concepts[:30]):
        term = c.get("term", "")
        if not term:
            continue
        wiki = _wiki(term)
        enriched.append({**c, **wiki})
        time.sleep(0.15)  # be polite to Wikipedia
        pct = 55 + int((i / max(total, 1)) * 35)
        progress(f'Looking up "{term}"…', pct)

    progress("Finalising study guide…", 95)

    # ── Glossary: all terms alphabetical ─────────────────────────────────────
    glossary = sorted(
        [{"term": c.get("term", ""), "definition": c.get("definition", "")} for c in raw_concepts],
        key=lambda x: x["term"].lower(),
    )

    return {
        "generated_at": datetime.utcnow().isoformat(),
        "chapters": chapters,
        "concepts": enriched,
        "flashcards": flashcards,
        "glossary": glossary,
    }
