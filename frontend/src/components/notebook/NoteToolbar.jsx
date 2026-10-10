import { useEffect, useRef, useState } from "react";
import { HIGHLIGHTERS, PENS, QUESTION_COLOR, SYMBOLS, shorthandFor, templatesFor } from "./templates";

// Keep the text selection in the page while tapping toolbar buttons.
const keepSelection = (e) => e.preventDefault();

const btn = "h-8 px-2 rounded-lg hover:bg-white/8 shrink-0";

function Swatch({ color, label, active, onClick, round }) {
  return (
    <button onMouseDown={keepSelection} onClick={onClick} title={label} aria-label={label} aria-pressed={active}
      className={`w-6 h-6 shrink-0 ${round ? "rounded-full" : "rounded-md"} ${active ? "ring-2 ring-offset-1 ring-white/60 ring-offset-paper" : ""}`}
      style={{ backgroundColor: color }}>
      {color === QUESTION_COLOR && <span className="text-[10px]">?</span>}
    </button>
  );
}

/** A small popover that closes when you tap outside it. */
function Popover({ label, title, open, onToggle, children, align = "left" }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!ref.current?.contains(e.target)) onToggle(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open, onToggle]);
  return (
    <div ref={ref} className="relative shrink-0">
      <button onMouseDown={keepSelection} onClick={() => onToggle(!open)} title={title} aria-expanded={open}
        className={`${btn} ${open ? "bg-white/8" : ""}`}>{label}</button>
      {open && (
        <div onMouseDown={keepSelection}
          className={`absolute ${align === "right" ? "right-0" : "left-0"} top-full mt-1 z-30 bg-card border border-white/10 rounded-xl shadow-lg p-3 w-[min(88vw,320px)]`}>
          {children}
        </div>
      )}
    </div>
  );
}

const TOOLS = [
  { id: "type", icon: "Aa", label: "Type" },
  { id: "pen", icon: "✎", label: "Write by hand" },
  { id: "marker", icon: "▮", label: "Highlighter pen" },
  { id: "eraser", icon: "⌫", label: "Erase drawing" },
];

/** One quiet row: tools · colours for the current tool · insert · more · ask. */
export default function NoteToolbar({
  mode, setMode, pen, setPen, marker, setMarker, onExec, onInsert, onTemplate,
  onUndoInk, canUndoInk, onAsk, moreMenu, track,
}) {
  const [menu, setMenu] = useState(null);
  const toggle = (name) => (open) => setMenu(open ? name : null);

  return (
    <div className="flex flex-wrap items-center gap-1 py-1 text-slate-300">
      <div className="flex rounded-lg bg-white/6 p-0.5 shrink-0" role="radiogroup" aria-label="Tool">
        {TOOLS.map((t) => (
          <button key={t.id} onMouseDown={keepSelection} onClick={() => setMode(t.id)} role="radio"
            aria-checked={mode === t.id} title={t.label} aria-label={t.label}
            className={`w-9 h-7 rounded-md ${mode === t.id ? "bg-card shadow-sm text-white" : "hover:text-white"}`}>
            {t.icon}
          </button>
        ))}
      </div>

      <span className="w-2 shrink-0" />

      {mode === "type" && (
        <>
          <button onMouseDown={keepSelection} onClick={() => onExec("bold")} className={`${btn} font-bold`} title="Bold">B</button>
          <button onMouseDown={keepSelection} onClick={() => onExec("underline")} className={`${btn} underline`} title="Underline">U</button>
          <button onMouseDown={keepSelection} onClick={() => onExec("insertUnorderedList")} className={btn} title="Bullet list">•<span className="hidden sm:inline"> List</span></button>
          <Popover label={<span className="flex items-center gap-1"><span className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: marker }} /><span className="hidden sm:inline">Highlight</span></span>}
            title="Highlight selected text" open={menu === "hl"} onToggle={toggle("hl")}>
            <div className="flex flex-wrap gap-2 items-center">
              {HIGHLIGHTERS.map((h) => (
                <Swatch key={h.color} color={h.color} label={`${h.name} highlighter`} active={marker === h.color}
                  onClick={() => { setMarker(h.color); onExec("hiliteColor", h.color); setMenu(null); }} />
              ))}
              <button onClick={() => { onExec("hiliteColor", "transparent"); setMenu(null); }} className="text-sm text-slate-500 hover:text-white ml-1">Remove</button>
            </div>
            <p className="text-xs text-slate-500 mt-2">Purple (?) marks parts you didn’t understand — the study buddy can explain them.</p>
          </Popover>
          <Popover label={<span className="w-3.5 h-3.5 rounded-full inline-block align-middle" style={{ backgroundColor: pen }} />}
            title="Pen colour" open={menu === "pen"} onToggle={toggle("pen")}>
            <div className="flex gap-2">
              {PENS.map((p) => (
                <Swatch key={p.color} round color={p.color} label={p.name} active={pen === p.color}
                  onClick={() => { setPen(p.color); onExec("foreColor", p.color); setMenu(null); }} />
              ))}
            </div>
          </Popover>
        </>
      )}
      {mode === "pen" && PENS.map((p) => (
        <Swatch key={p.color} round color={p.color} label={p.name} active={pen === p.color} onClick={() => setPen(p.color)} />
      ))}
      {mode === "marker" && HIGHLIGHTERS.map((h) => (
        <Swatch key={h.color} color={h.color} label={`${h.name} highlighter`} active={marker === h.color} onClick={() => setMarker(h.color)} />
      ))}
      {mode !== "type" && (
        <button onClick={onUndoInk} disabled={!canUndoInk} className={`${btn} disabled:opacity-30 ml-1`}>Undo</button>
      )}

      <span className="flex-1" />

      <Popover label="Insert" title="Symbols and templates" open={menu === "insert"} onToggle={toggle("insert")} align="right">
        <p className="text-xs text-slate-500 mb-1">Symbols — or draw them with ✎</p>
        <div className="flex flex-wrap gap-1 mb-2">
          {SYMBOLS.map((s) => (
            <button key={s} onClick={() => onInsert(s)} className="min-w-8 h-8 px-1 rounded-md hover:bg-white/8 text-lg">{s}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 mb-3">
          {shorthandFor(track).map((s) => (
            <button key={s} onClick={() => onInsert(s + " ")} className="px-1.5 h-7 rounded-md hover:bg-white/8 text-sm">{s}</button>
          ))}
        </div>
        <p className="text-xs text-slate-500 mb-1">Page templates</p>
        {templatesFor(track).map((t) => (
          <button key={t.id} onClick={() => { setMenu(null); onTemplate(t); }}
            className="block w-full text-left px-2 py-1 rounded-md hover:bg-white/8">{t.name}</button>
        ))}
      </Popover>

      {moreMenu && (
        <Popover label="⋯" title="More" open={menu === "more"} onToggle={toggle("more")} align="right">
          {moreMenu(() => setMenu(null))}
        </Popover>
      )}

      <button onClick={onAsk} className="shrink-0 ml-1 h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white">Ask</button>
    </div>
  );
}
