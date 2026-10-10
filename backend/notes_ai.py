"""Study buddy for class notes: answer questions and fill in what's missing."""
from typing import Literal

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from services.summarizer import stream_messages

router = APIRouter(prefix="/api/notes")

SYSTEM = """You are a friendly, accurate tutor for {who}. They took these notes
while listening to a lecture in their "{subject}" class. Notes may be messy, abbreviated
(shorthand like s/s, Tx, ↑, ↓) or incomplete.

Rules:
- {style} Short paragraphs and bullet points.
- Stay evidence-based. If something in the notes looks wrong, say so gently and correct it.
- {focus}
- Never invent things the student must memorise as facts without saying how sure you are.
- Keep answers under ~250 words unless asked for more.

PAGE TITLE: {title}
THEIR NOTES:
\"\"\"
{notes}
\"\"\""""

TRACKS = {
    "nursing": {
        "who": "a nursing student",
        "style": "Explain simply, like a kind clinical instructor.",
        "focus": "Highlight safety points (red flags, nursing priorities, patient teaching) when relevant.",
        "quiz": "Write 5 NCLEX-style multiple-choice questions from these notes, then the answers with one-line rationales.",
    },
    "prenursing": {
        "who": "a pre-nursing student taking prerequisite science courses (A&P, microbiology, chemistry, statistics, psychology)",
        "style": "Explain simply, like a patient science tutor: build from basics and use everyday analogies.",
        "focus": "Point out what is commonly tested on prerequisite exams and the TEAS/HESI A2, and how it will matter later in nursing.",
        "quiz": (
            "Write 5 multiple-choice questions from these notes in the style of a college prerequisite exam / "
            "TEAS science section, then the answers with one-line explanations."
        ),
    },
}

MODES = {
    "ask": "{question}",
    "missing": (
        "Read my lecture notes. What important points for this topic are probably missing or unclear? "
        "Write ONLY the missing pieces as short bullet points I can paste under my notes "
        "(no intro sentence, no repetition of what I already wrote)."
    ),
    "simplify": "Explain the main idea of these notes in very simple words, like I'm hearing it for the first time.",
    "quiz": "{quiz}",
    "confused": (
        "I marked these parts with ❓ because I didn't understand them in the lecture:\n{question}\n\n"
        "Explain each one simply, in the context of my notes."
    ),
}


class AskBody(BaseModel):
    mode: Literal["ask", "missing", "simplify", "quiz", "confused"] = "ask"
    question: str = Field("", max_length=4000)
    subject: str = Field("", max_length=200)
    track: Literal["nursing", "prenursing"] = "nursing"
    title: str = Field("", max_length=300)
    notes: str = Field("", max_length=30000)


@router.post("/ask")
def ask_about_notes(body: AskBody):
    if body.mode in ("ask", "confused") and not body.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    t = TRACKS[body.track]
    messages = [
        {"role": "system", "content": SYSTEM.format(
            who=t["who"], style=t["style"], focus=t["focus"],
            subject=body.subject or ("science" if body.track == "prenursing" else "nursing"),
            title=body.title or "(untitled)",
            notes=body.notes.strip() or "(no notes yet)",
        )},
        {"role": "user", "content": MODES[body.mode].format(question=body.question.strip(), quiz=t["quiz"])},
    ]

    def generate():
        try:
            yield from stream_messages(messages, max_tokens=1200)
        except Exception as e:
            yield f"\n\n[Couldn't reach the AI right now: {e}]"

    return StreamingResponse(generate(), media_type="text/plain; charset=utf-8")
