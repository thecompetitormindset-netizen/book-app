import { Link, useNavigate } from "react-router-dom";
import { markWelcomeSeen } from "../utils/welcome";

/** A small notebook page that shows what the app feels like. */
function SamplePage() {
  return (
    <div className="relative max-w-md w-full mx-auto rotate-[0.6deg]">
      <div className="book-sheet paper-page !relative rounded-[4px_14px_14px_4px] overflow-hidden">
        <div className="pl-[66px] pr-5 pt-3 pb-6 note-font-neat">
          <div className="flex justify-between items-baseline">
            <span className="font-hand text-3xl">Heart failure</span>
            <span className="text-xs text-slate-500">Mon, Oct 12</span>
          </div>
          <p className="mt-2">Left-sided HF → lungs: <span className="rounded px-0.5" style={{ background: "#ffe14d" }}>crackles, SOB</span></p>
          <p>Right-sided HF → body: <span className="rounded px-0.5" style={{ background: "#a7f3a0" }}>edema, JVD</span></p>
          <p>
            <span className="rounded px-0.5" style={{ background: "#e9d5ff" }}>Preload vs afterload?</span>
            {/* hand-drawn arrow, inline so it always sits next to its words */}
            <svg className="inline-block align-middle ml-1" width="44" height="20" viewBox="0 0 44 20" aria-hidden>
              <path d="M2 14 Q18 2 38 9" stroke="#c62828" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M31 4 L39 9 L31 14" stroke="#c62828" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-sm" style={{ color: "#c62828" }}>ask!</span>
          </p>
          <p>Digoxin: <span style={{ color: "#c62828" }}>hold if HR &lt; 60</span></p>
          <p className="mt-2" style={{ color: "#2e7d32" }}>
            <b>📎 Study buddy:</b> preload = stretch before the squeeze; afterload = the pressure it pushes against.
          </p>
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    title: "Writes like paper",
    body: "Type and it appears in handwriting on lined yellow paper. Highlight in five colours, switch pens, or just draw arrows and symbols with your finger.",
  },
  {
    title: "Ask what you missed",
    body: "Didn’t catch something in the lecture? Mark it with the ❓ highlighter and the study buddy explains it simply — then adds it to your page.",
  },
  {
    title: "Never lose a note",
    body: "Everything saves as you write. Sign in with Google to keep it on every device. Torn-out pages wait in the trash for 30 days.",
  },
  {
    title: "Remember everything",
    body: "Reminders that pop up before quizzes, a simple to-do list, and goals broken into small steps.",
  },
];

const NURSING = [
  "Pre-nursing: A&P, Micro & Chem templates", "Prerequisite GPA tracker", "Application deadlines & checklists", "TEAS-style quizzes",
  "Nursing: medication cards", "SBAR clinical notes", "Lab values", "NCLEX-style quizzes",
];

export default function Landing() {
  const navigate = useNavigate();
  const start = () => { markWelcomeSeen(); navigate("/notebook"); };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6">
      {/* Hero */}
      <section className="grid md:grid-cols-2 gap-10 items-center pt-10 sm:pt-16 pb-14">
        <div>
          <h1 className="text-[2.6rem] sm:text-6xl text-white leading-[1.05]">
            Class notes that feel like paper — and never get lost.
          </h1>
          <p className="text-lg text-slate-400 mt-4">
            A calm notebook for pre-nursing and nursing students. Write during lectures, highlight what matters,
            and ask about the parts you didn’t understand.
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-7">
            <button onClick={start} className="bg-indigo-600 hover:bg-indigo-500 rounded-xl px-6 py-2.5 text-lg">
              Start writing — it’s free
            </button>
            <Link to="/today" onClick={markWelcomeSeen} className="text-slate-400 hover:text-white">Go to my day →</Link>
          </div>
          <p className="text-sm text-slate-500 mt-3">No sign-up needed. Your notes stay private to you.</p>
        </div>
        <SamplePage />
      </section>

      {/* Features */}
      <section className="grid sm:grid-cols-2 gap-x-10 gap-y-8 py-12 border-t border-white/10">
        {FEATURES.map((f) => (
          <div key={f.title}>
            <h2 className="text-3xl text-white">{f.title}</h2>
            <p className="text-slate-400 mt-1">{f.body}</p>
          </div>
        ))}
      </section>

      {/* Nursing */}
      <section className="py-12 border-t border-white/10">
        <h2 className="text-3xl text-white">From prerequisites to NCLEX</h2>
        <p className="text-slate-400 mt-1 mb-4">Pick pre-nursing or nursing school — templates, quizzes and the study buddy adjust to where you are.</p>
        <div className="flex flex-wrap gap-2">
          {NURSING.map((n) => (
            <span key={n} className="bg-card border border-white/10 rounded-lg px-3 py-1 text-slate-300">{n}</span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-12 border-t border-white/10">
        <h2 className="text-3xl text-white mb-5">Three steps</h2>
        <ol className="grid sm:grid-cols-3 gap-6">
          {[
            ["Add your classes", "Pharmacology, Med-Surg, Anatomy — one notebook each."],
            ["Write in class", "Type or draw. Highlight. Mark what you didn’t get with ❓."],
            ["Review & ask", "Turn the pages, ask the study buddy, get quizzed before exams."],
          ].map(([t, b], i) => (
            <li key={t}>
              <span className="font-hand text-4xl text-indigo-400">{i + 1}</span>
              <h3 className="text-2xl text-white">{t}</h3>
              <p className="text-slate-400">{b}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Closing CTA */}
      <section className="py-14 border-t border-white/10 text-center">
        <h2 className="text-4xl text-white">Your next lecture starts on a fresh page.</h2>
        <button onClick={start} className="mt-5 bg-indigo-600 hover:bg-indigo-500 rounded-xl px-6 py-2.5 text-lg">
          Open my notebook
        </button>
        <p className="text-sm text-slate-500 mt-4">Works on phone, tablet and laptop. Add it to your home screen like an app.</p>
      </section>
    </main>
  );
}
