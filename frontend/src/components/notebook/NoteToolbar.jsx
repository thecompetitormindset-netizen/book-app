import { useState } from "react";
import { HIGHLIGHTERS, PENS, QUESTION_COLOR, SHORTHAND, SYMBOLS, TEMPLATES } from "./templates";

// Keep the text selection in the page while tapping toolbar buttons.
const keepSelection = (e) => e.preventDefault();

function Swatch({ color, label, active, onClick, round }) {
  return (
    <button onMouseDown={keepSelection} onClick={onClick} title={label} aria-label={label} aria-pressed={active}
      className={`w-7 h-7 shrink-0 border-2 ${round ? "rounded-full" : "rounded-md"} ${active ? "border-white scale-110" : "border-white/10"} transition-transform`}
      style={{ backgroundColor: color }}>
      {color === QUESTION_COLOR && <span className="text-xs">❓</span>}
    </button>
  );
}

function Menu({ label, children, open, setOpen }) {
  return (
    <div className="relative shrink-0">
      <button onMouseDown={keepSelection} onClick={() => setOpen(open ? null : label)}
        className={`px-2.5 h-9 rounded-lg ${open ? "bg-white/12" : "hover:bg-white/8"}`}>{label} ▾</button>
      {open && (
        <div onMouseDown={keepSelection}
          className="absolute left-0 top-full mt-1 z-30 bg-card border border-white/10 rounded-xl shadow-2xl p-3 w-[min(90vw,340px)]">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * mode: "type" | "pen" | "marker" | "eraser"
 */
export default function NoteToolbar({ mode, setMode, pen, setPen, marker, setMarker, onExec, onInsert, onTemplate, onUndoInk, canUndoInk, onAsk, font, setFont }) {
  const [menu, setMenu] = useState(null);
  const tools = [
    { id: "type", icon: "⌨️", label: "Type" },
    { id: "pen", icon: "✍️", label: "Write" },
    { id: "marker", icon: "🖍️", label: "Marker" },
    { id: "eraser", icon: "🧽", label: "Erase" },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto sm:overflow-visible sm:flex-wrap py-1 -mx-1 px-1">
      <div className="flex rounded-xl bg-white/6 p-0.5 shrink-0" role="radiogroup" aria-label="Tool">
        {tools.map((t) => (
          <button key={t.id} onMouseDown={keepSelection} onClick={() => setMode(t.id)} role="radio" aria-checked={mode === t.id}
            className={`px-2.5 h-8 rounded-lg whitespace-nowrap ${mode === t.id ? "bg-indigo-600" : "hover:bg-white/8"}`}>
            <span aria-hidden>{t.icon}</span><span className="hidden md:inline ml-1">{t.label}</span>
          </button>
        ))}
      </div>

      <span className="w-px h-7 bg-white/10 mx-1 shrink-0" />

      {(mode === "type" || mode === "pen") && PENS.map((p) => (
        <Swatch key={p.color} round color={p.color} label={p.name} active={pen === p.color}
          onClick={() => { setPen(p.color); if (mode === "type") onExec("foreColor", p.color); }} />
      ))}
      {mode === "type" && <span className="w-px h-7 bg-white/10 mx-1 shrink-0" />}
      {(mode === "type" || mode === "marker") && HIGHLIGHTERS.map((h) => (
        <Swatch key={h.color} color={h.color} label={`${h.name} highlighter`} active={mode === "marker" && marker === h.color}
          onClick={() => { setMarker(h.color); if (mode === "type") onExec("hiliteColor", h.color); }} />
      ))}
      {mode === "type" && (
        <>
          <button onMouseDown={keepSelection} onClick={() => onExec("hiliteColor", "transparent")} title="Remove highlight"
            className="px-2 h-8 rounded-lg hover:bg-white/8 text-sm shrink-0">⌫ hl</button>
          <span className="w-px h-7 bg-white/10 mx-1 shrink-0" />
          <button onMouseDown={keepSelection} onClick={() => onExec("bold")} className="w-8 h-8 rounded-lg hover:bg-white/8 font-bold shrink-0" title="Bold">B</button>
          <button onMouseDown={keepSelection} onClick={() => onExec("underline")} className="w-8 h-8 rounded-lg hover:bg-white/8 underline shrink-0" title="Underline">U</button>
          <button onMouseDown={keepSelection} onClick={() => onExec("insertUnorderedList")} className="px-2 h-8 rounded-lg hover:bg-white/8 shrink-0 whitespace-nowrap" title="Bullet list">• List</button>
        </>
      )}
      {mode !== "type" && (
        <button onClick={onUndoInk} disabled={!canUndoInk} className="px-2.5 h-8 rounded-lg hover:bg-white/8 disabled:opacity-30 shrink-0">↶ Undo</button>
      )}

      <span className="w-px h-7 bg-white/10 mx-1 shrink-0" />

      <Menu label="Ω Symbols" open={menu === "Ω Symbols"} setOpen={setMenu}>
        <p className="text-sm text-slate-500 mb-1">Tap to add — or switch to ✍️ Write and just draw it.</p>
        <div className="flex flex-wrap gap-1 mb-2">
          {SYMBOLS.map((s) => (
            <button key={s} onClick={() => onInsert(s)} className="min-w-9 h-9 px-1 rounded-lg bg-white/6 hover:bg-white/12 text-lg">{s}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {SHORTHAND.map((s) => (
            <button key={s} onClick={() => onInsert(s + " ")} className="px-2 h-8 rounded-lg bg-white/6 hover:bg-white/12 text-sm">{s}</button>
          ))}
        </div>
      </Menu>

      <Menu label="📋 Templates" open={menu === "📋 Templates"} setOpen={setMenu}>
        <div className="flex flex-col">
          {TEMPLATES.map((t) => (
            <button key={t.id} onClick={() => { setMenu(null); onTemplate(t); }}
              className="text-left px-2 py-1.5 rounded-lg hover:bg-white/8 text-lg">{t.icon} {t.name}</button>
          ))}
        </div>
      </Menu>

      <Menu label="Aa" open={menu === "Aa"} setOpen={setMenu}>
        <p className="text-sm text-slate-500 mb-1">Handwriting style</p>
        {[["neat", "Neat (thin)"], ["casual", "Casual script"], ["print", "Print"]].map(([id, name]) => (
          <button key={id} onClick={() => { setFont(id); setMenu(null); }}
            className={`block w-full text-left px-2 py-1 rounded-lg note-font-${id} ${font === id ? "bg-white/12" : "hover:bg-white/8"}`}>{name}</button>
        ))}
      </Menu>

      <button onClick={onAsk} className="ml-auto shrink-0 bg-indigo-600 hover:bg-indigo-500 rounded-xl px-3 h-9 whitespace-nowrap">🤖 Ask / fill gaps</button>
    </div>
  );
}
