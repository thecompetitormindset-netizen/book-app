"""Study buddy for class notes: answer questions and fill in what's missing."""
from typing import Literal

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from services.summarizer import stream_messages

router = APIRouter(prefix="/api/notes")

SYSTEM = """You are a friendly, accurate tutor for a nursing student. They took these notes
while listening to a lecture in their "{subject}" class. Notes may be messy, abbreviated
(nursing shorthand like PRN, NPO, s/s, Tx, ↑, ↓) or incomplete.

Rules:
- Explain simply, like a kind clinical instructor. Short paragraphs and bullet points.
- Stay evidence-based. If something in the notes looks wrong, say so gently and correct it.
- Highlight safety points (red flags, nursing priorities, patient teaching) when relevant.
- Never invent things the student must memorise as facts without saying how sure you are.
- Keep answers under ~250 words unless asked for more.

PAGE TITLE: {title}
THEIR NOTES:
\"\"\"
{notes}
\"\"\""""

MODES = {
    "ask": "{question}",
    "missing": (
        "Read my lecture notes. What important points for this topic are probably missing or unclear? "
        "Write ONLY the missing pieces as short bullet points I can paste under my notes "
        "(no intro sentence, no repetition of what I already wrote)."
    ),
    "simplify": "Explain the main idea of these notes in very simple words, like I'm hearing it for the first time.",
    "quiz": "Write 5 NCLEX-style multiple-choice questions from these notes, then the answers with one-line rationales.",
    "confused": (
        "I marked these parts with ❓ because I didn't understand them in the lecture:\n{question}\n\n"
        "Explain each one simply, in the context of my notes."
    ),
}


class AskBody(BaseModel):
    mode: Literal["ask", "missing", "simplify", "quiz", "confused"] = "ask"
    question: str = Field("", max_length=4000)
    subject: str = Field("", max_length=200)
    title: str = Field("", max_length=300)
    notes: str = Field("", max_length=30000)


@router.post("/ask")
def ask_about_notes(body: AskBody):
    if body.mode in ("ask", "confused") and not body.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    messages = [
        {"role": "system", "content": SYSTEM.format(
            subject=body.subject or "nursing", title=body.title or "(untitled)",
            notes=body.notes.strip() or "(no notes yet)",
        )},
        {"role": "user", "content": MODES[body.mode].format(question=body.question.strip())},
    ]

    def generate():
        try:
            yield from stream_messages(messages, max_tokens=1200)
        except Exception as e:
            yield f"\n\n[Couldn't reach the AI right now: {e}]"

    return StreamingResponse(generate(), media_type="text/plain; charset=utf-8")
