import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { API_BASE } from "../../api";
import { htmlToText, textHighlightedWith } from "../../utils/richtext";
import { QUESTION_COLOR } from "./templates";

const QUICK = [
  { mode: "missing", label: "🧩 What did I miss?" },
  { mode: "confused", label: "❓ Explain my ❓ parts" },
  { mode: "simplify", label: "🐣 Explain simply" },
  { mode: "quiz", label: "📝 Quiz me (NCLEX)" },
];

/** Side panel: ask about this page and add the missing pieces to it. */
export default function AskPanel({ note, subject, onAddToPage, onClose }) {
  const [chat, setChat] = useState([]); // { q, a, done }
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  const run = async (mode, question = "") => {
    if (busy) return;
    let label = question;
    if (mode === "confused") {
      const marked = textHighlightedWith(note.html, QUESTION_COLOR);
      if (!marked.length) {
        setChat((c) => [...c, { q: "Explain my ❓ parts", a: "Highlight the parts you didn't understand with the **❓ purple highlighter** first, then tap this again.", done: true }]);
        return;
      }
      question = marked.map((m) => `- ${m}`).join("\n");
      label = `Explain: ${marked.join(" · ")}`;
    }
    if (mode !== "ask" && mode !== "confused") label = QUICK.find((x) => x.mode === mode).label;

    setBusy(true);
    setChat((c) => [...c, { q: label, a: "", done: false }]);
    const append = (t) => setChat((c) => c.map((m, i) => (i === c.length - 1 ? { ...m, a: m.a + t } : m)));
    try {
      const res = await fetch(`${API_BASE}/api/notes/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, question, subject: subject?.name || "", title: note.title, notes: htmlToText(note.html).slice(0, 30000) }),
      });
      if (!res.ok || !res.body || /text\/html/.test(res.headers.get("content-type") || "")) throw new Error();
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        append(dec.decode(value, { stream: true }));
        endRef.current?.scrollIntoView({ block: "end" });
      }
    } catch {
      setChat((c) => c.map((m, i) => (i === c.length - 1 ? { ...m, error: true } : m)));
      append("Couldn't reach the study buddy. Check your internet connection and try again.");
    } finally {
      setChat((c) => c.map((m, i) => (i === c.length - 1 ? { ...m, done: true, error: m.error || m.a.includes("[Couldn't reach the AI") } : m)));
      setBusy(false);
    }
  };

  return (
    <aside className="fixed z-40 bg-card border-l border-white/10 shadow-2xl flex flex-col
      inset-x-0 bottom-0 h-[70vh] rounded-t-2xl sm:rounded-none sm:inset-x-auto sm:right-0 sm:top-14 sm:bottom-0 sm:h-auto sm:w-[400px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div>
          <h2 className="text-3xl leading-none">Study buddy</h2>
          <p className="text-sm text-slate-500">Ask about “{note.title || "this page"}”</p>
        </div>
        <button onClick={onClose} className="text-2xl px-2 text-slate-400 hover:text-white" aria-label="Close">✕</button>
      </div>

      <div className="flex flex-wrap gap-1.5 px-4 py-3 border-b border-white/8">
        {QUICK.map((x) => (
          <button key={x.mode} disabled={busy} onClick={() => run(x.mode)}
            className="text-sm px-2.5 py-1 rounded-full bg-white/6 hover:bg-white/12 disabled:opacity-40">{x.label}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4">
        {chat.length === 0 && (
          <p className="text-slate-500">
            Didn’t catch something in the lecture? Ask here — then tap <b>➕ Add to my page</b> to fill the gap in your notes.
          </p>
        )}
        {chat.map((m, i) => (
          <div key={i}>
            <p className="font-hand text-2xl leading-tight text-slate-300 mb-1">{m.q}</p>
            <div className="prose prose-sm max-w-none text-white prose-p:my-1 prose-li:my-0 prose-strong:text-white prose-headings:text-white">
              {m.a ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.a}</ReactMarkdown> : <p className="animate-pulse">thinking…</p>}
            </div>
            {m.done && m.a && !m.error && (
              <button onClick={() => onAddToPage(m.a)} className="mt-2 text-sm bg-indigo-600 hover:bg-indigo-500 rounded-lg px-3 py-1">
                ➕ Add to my page
              </button>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form className="flex gap-2 p-3 border-t border-white/10"
        onSubmit={(e) => { e.preventDefault(); if (!q.trim()) return; run("ask", q); setQ(""); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="What didn't you understand?"
          className="flex-1 bg-white/6 rounded-lg px-3 py-2 outline-none" />
        <button disabled={busy} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-lg px-4">Ask</button>
      </form>
    </aside>
  );
}
