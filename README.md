# My Notebook

A personal study notebook on yellow paper: class notes you can turn like pages, hand-drawn
symbols and highlighters, an AI study buddy that fills gaps in your lecture notes, reminders,
to-dos, personal goals — plus the original book library with AI summaries.

## What's inside

| Page | What it does |
| --- | --- |
| **Today** | Coming-up reminders, today's to-dos, recent notes, goals, backup status |
| **Notebook** | One notebook per class. Type or ✍️ write/draw with finger or stylus, 🖍️ highlighters (incl. ❓ "didn't understand"), pen colours, nursing symbols & shorthand, templates (lecture, medication card, disease, skill, SBAR, lab values), page turning, 30-day trash |
| **Study buddy** | 🤖 button on a page: "What did I miss?", "Explain my ❓ parts", "Explain simply", "Quiz me (NCLEX)", or ask anything — then ➕ add the answer to the page |
| **Planner** | Reminders (with pop-up alerts), to-do list, goals broken into steps |
| **Library / Stats** | Upload PDFs/EPUBs for AI summaries; read summaries as a page-turning book |
| **Free Books** | Hand-picked legal sites for free ebooks, audiobooks and textbooks |

## Your notes are never lost

* Saved on the device as you write (and flushed when the tab closes).
* With **Sign in with Google**, every change is also saved to your account and syncs to any device.
  On sign-out the notes are removed from that device (good for shared classroom computers).
* The app asks the browser for persistent storage, and you can ⬇️ download / ⬆️ restore a backup from **Today**.
* Drawings are stored as small vector strokes, not images — a page with drawings is a few KB.

## Setup

Backend (`backend/.env`, see `.env.example`):

* `GROQ_API_KEY` — powers summaries, book chat and the study buddy (or run Ollama locally).
* `DATABASE_URL` — Postgres in production (SQLite locally).
* `GOOGLE_CLIENT_ID` — optional, turns on "Sign in with Google":
  1. Go to <https://console.cloud.google.com/apis/credentials> → **Create credentials → OAuth client ID → Web application**.
  2. Under **Authorized JavaScript origins** add your site (e.g. `https://your-app.vercel.app`) and `http://localhost:5173`.
  3. Put the client ID in `GOOGLE_CLIENT_ID` on the backend. The frontend reads it from `/api/auth/config`.

  Sign-in only asks Google for name, email and picture — the app never reads anyone's Gmail.

Run locally:

```bash
cd backend && pip install -r requirements.txt && uvicorn main:app --reload   # :8000
cd frontend && npm install && npm run dev                                    # :5173
```
