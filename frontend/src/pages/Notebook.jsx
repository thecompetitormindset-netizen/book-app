import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageFlip from "../components/PageFlip";
import InkLayer, { StaticInk } from "../components/notebook/InkLayer";
import NoteToolbar from "../components/notebook/NoteToolbar";
import AskPanel from "../components/notebook/AskPanel";
import { PENS, HIGHLIGHTERS } from "../components/notebook/templates";
import { actions, lastSaveFailed, usePersonal } from "../store/personal";
import { useAuth } from "../auth";
import { toLocalInput, tomorrowAt } from "../utils/dates";
import { htmlToText, markdownToHtml, sanitizeHtml } from "../utils/richtext";

// Every page is laid out on the same "paper" width and scaled to fit the
// screen, so text wraps identically on a phone and a laptop and hand-drawn
// ink stays next to the words it was drawn beside.
const PAGE_W = 480;
const MAX_ZOOM = 1.4;

function useBoxSize(ref) {
  const [size, setSize] = useState({ w: PAGE_W, h: 600 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

const fmtDate = (iso) => new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

/** The editable, ruled page. Uncontrolled so the caret never jumps while typing. */
function NoteEditor({ note, font, editorRef, onSave }) {
  useEffect(() => {
    const el = editorRef.current;
    if (el && document.activeElement !== el && el.innerHTML !== note.html) el.innerHTML = sanitizeHtml(note.html);
  }, [note.html, note.id, editorRef]);

  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      aria-label="Notes"
      data-placeholder="Write your lecture notes here… type, or switch to ✍️ Write and use your finger or pen."
      className={`ruled-text note-editor note-font-${font} min-h-full pb-24`}
      onInput={onSave}
      onPaste={(e) => {
        // Paste as plain text so pages stay small and tidy.
        e.preventDefault();
        document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
      }}
    />
  );
}

function NotePage({ note, live, pageNo, font, editorRef, onSave, tool }) {
  const outer = useRef(null);
  const { w, h } = useBoxSize(outer);
  const zoom = Math.min(w / PAGE_W, MAX_ZOOM) || 1;
  return (
    <div ref={outer} className="h-full w-full overflow-hidden">
    {/* scale (not CSS zoom) so line breaks are computed at one fixed size everywhere */}
    <div className="paper-page flex flex-col origin-top-left"
      style={{ width: PAGE_W, height: h / zoom, transform: `scale(${zoom})` }}>
      <div className="flex items-baseline justify-between gap-2 pl-[66px] pr-4 pt-2 h-[64px] shrink-0">
        {live ? (
          <input
            value={note.title}
            onChange={(e) => actions.updateNote(note.id, { title: e.target.value })}
            placeholder="Today's topic…"
            className="font-hand text-3xl bg-transparent outline-none flex-1 min-w-0 placeholder:text-slate-600"
            aria-label="Page title"
          />
        ) : (
          <span className="font-hand text-3xl flex-1 truncate">{note.title || "Untitled"}</span>
        )}
        <span className="text-xs text-slate-500 shrink-0 text-right leading-tight whitespace-nowrap">
          {fmtDate(note.createdAt)}<br />p. {pageNo}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
        <div className="relative min-h-full">
          {live ? (
            <>
              <NoteEditor note={note} font={font} editorRef={editorRef} onSave={onSave} />
              <InkLayer ink={note.ink} tool={tool} onChange={(ink) => actions.updateNote(note.id, { ink })} />
            </>
          ) : (
            <>
              <div className={`ruled-text note-editor note-font-${font} min-h-full pb-24`}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(note.html) }} />
              <StaticInk ink={note.ink} />
            </>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}

function RemindForm({ note, subject, onDone }) {
  const [text, setText] = useState(`Review ${subject?.name || ""}: ${note.title || "notes"}`.trim());
  const [at, setAt] = useState(toLocalInput(tomorrowAt(8)));
  return (
    <form
      className="bg-card border border-white/10 rounded-xl p-3 flex flex-wrap gap-2 items-center"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim() || !at) return;
        actions.addReminder({ text, at: new Date(at).toISOString(), subjectId: subject?.id });
        onDone(true);
      }}
    >
      <input value={text} onChange={(e) => setText(e.target.value)} className="flex-1 min-w-[12rem] bg-white/6 rounded-lg px-3 py-1.5 outline-none" />
      <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} className="bg-white/6 rounded-lg px-3 py-1.5 outline-none" />
      <button className="bg-indigo-600 hover:bg-indigo-500 rounded-lg px-4 py-1.5">Set reminder</button>
      <button type="button" onClick={() => onDone(false)} className="text-slate-500 px-2">Cancel</button>
    </form>
  );
}

function SaveStatus() {
  usePersonal(); // re-render after each edit
  const { auth, syncState } = useAuth();
  if (lastSaveFailed()) return <span className="text-red-400">⚠️ Couldn't save on this device — download a backup from Today</span>;
  if (!auth) return <span className="text-slate-500">Saved on this device</span>;
  if (syncState === "offline") return <span className="text-amber-400">✓ Saved here · will sync when online</span>;
  if (syncState === "syncing") return <span className="text-slate-500">Saving…</span>;
  return <span className="text-slate-500">Saved to your account</span>;
}

/** Only speaks up when something is wrong. */
function SaveWarning() {
  usePersonal();
  const { auth, syncState } = useAuth();
  if (lastSaveFailed()) return <p className="text-sm text-red-400 mb-2">Couldn't save on this device — download a backup from Today.</p>;
  if (auth && syncState === "offline") return <p className="text-sm text-slate-500 mb-2">Offline — saved here, will sync when you're back online.</p>;
  return null;
}

function Trash({ notes, subjects, onClose }) {
  return (
    <div className="bg-card border border-white/10 rounded-xl p-4 mb-4">
      <div className="flex justify-between items-baseline mb-2">
        <h2 className="text-2xl">Trash</h2>
        <button onClick={onClose} className="text-slate-500 hover:text-white">Close</button>
      </div>
      <p className="text-sm text-slate-500 mb-2">Pages stay here for 30 days, then they're gone for good.</p>
      {notes.length === 0 && <p className="text-slate-500 italic">Nothing in the trash.</p>}
      <ul className="divide-y divide-white/10">
        {notes.map((n) => (
          <li key={n.id} className="flex items-center gap-2 py-1.5">
            <span className="flex-1 truncate">
              {n.title || "Untitled"} <span className="text-sm text-slate-500">· {subjects.find((s) => s.id === n.subjectId)?.name}</span>
            </span>
            <button onClick={() => actions.restoreNote(n.id)} className="text-sm bg-white/8 hover:bg-white/14 rounded-lg px-3 py-1">Restore</button>
            <button onClick={() => confirm("Delete this page forever?") && actions.deleteNoteForever(n.id)}
              className="text-sm text-slate-500 hover:text-red-400 px-2">Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Notebook() {
  const { subjects, notes, settings } = usePersonal();
  const [params, setParams] = useSearchParams();
  const subjectId = subjects.some((s) => s.id === params.get("class")) ? params.get("class") : subjects[0]?.id;
  const subject = subjects.find((s) => s.id === subjectId);
  const live = useMemo(() => notes.filter((n) => !n.deletedAt), [notes]);
  const trashed = useMemo(() => notes.filter((n) => n.deletedAt), [notes]);

  const pages = useMemo(
    () => live.filter((n) => n.subjectId === subjectId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [live, subjectId]
  );
  const requested = params.get("page") ? pages.findIndex((p) => p.id === params.get("page")) : -1;
  const [pageBySubject, setPageBySubject] = useState({});
  const rawIndex = requested >= 0 ? requested : pageBySubject[subjectId] ?? pages.length - 1;
  const index = Math.max(0, Math.min(rawIndex, pages.length - 1));
  const note = pages[index];

  const [newClass, setNewClass] = useState(null);
  const [panel, setPanel] = useState(null); // "remind" | "trash"
  const [asking, setAsking] = useState(false);
  const [flash, setFlash] = useState("");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mode, setMode] = useState("type");
  const [pen, setPen] = useState(PENS[0].color);
  const [marker, setMarker] = useState(HIGHLIGHTERS[0].color);
  const font = settings?.noteFont || "neat";

  // ── Editor plumbing ──
  const editorRef = useRef(null);
  const savedRange = useRef(null);
  useEffect(() => {
    const onSel = () => {
      const sel = window.getSelection();
      if (sel.rangeCount && editorRef.current?.contains(sel.anchorNode)) savedRange.current = sel.getRangeAt(0).cloneRange();
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, []);
  useEffect(() => { savedRange.current = null; }, [note?.id]);

  const noteId = note?.id;
  const save = useCallback(() => {
    if (noteId && editorRef.current) actions.updateNote(noteId, { html: editorRef.current.innerHTML });
  }, [noteId]);

  const focusEditor = () => {
    const el = editorRef.current;
    if (!el) return false;
    el.focus();
    const sel = window.getSelection();
    sel.removeAllRanges();
    if (savedRange.current) sel.addRange(savedRange.current);
    else { const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); sel.addRange(r); }
    return true;
  };
  const exec = (cmd, value) => {
    if (!focusEditor()) return;
    document.execCommand("styleWithCSS", false, true);
    document.execCommand(cmd, false, value);
    save();
  };
  const setHtml = (html) => {
    if (editorRef.current) editorRef.current.innerHTML = html;
    actions.updateNote(note.id, { html });
  };

  const flashMsg = (m) => { setFlash(m); setTimeout(() => setFlash(""), 2500); };

  // ── Navigation ──
  const setIndex = (i) => {
    setPageBySubject((m) => ({ ...m, [subjectId]: i }));
    if (params.get("page")) setParams({ class: subjectId });
  };
  const pickSubject = (id) => { setParams({ class: id }); setPanel(null); };
  const newPage = () => {
    actions.addNote(subjectId);
    setIndex(pages.length); // the new page goes at the end
    setMode("type");
  };
  const tearOut = () => {
    if (!note) return;
    actions.trashNote(note.id);
    setIndex(Math.max(0, index - 1));
    flashMsg("Moved to trash");
  };

  const q = search.trim().toLowerCase();
  const results = q
    ? live.filter((n) => n.title.toLowerCase().includes(q) || htmlToText(n.html).toLowerCase().includes(q))
    : [];
  const tool = mode === "pen" ? { kind: "pen", color: pen } : mode === "marker" ? { kind: "marker", color: marker } : mode === "eraser" ? { kind: "eraser" } : null;

  return (
    <main className={`max-w-5xl px-4 sm:px-6 py-5 ${asking ? "mx-auto sm:ml-0 sm:mr-[400px] 2xl:ml-auto" : "mx-auto"}`}>
      {/* Classes · new page · search */}
      <div className="flex items-center gap-2 mb-3 border-b border-white/10">
        <div className="flex gap-1 overflow-x-auto flex-1 min-w-0" role="tablist" aria-label="Classes">
          {subjects.map((s) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={s.id === subjectId}
              onClick={() => pickSubject(s.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 whitespace-nowrap border-b-2 -mb-px ${
                s.id === subjectId ? "text-white" : "text-slate-500 border-transparent hover:text-slate-300"
              }`}
              style={s.id === subjectId ? { borderColor: s.color } : undefined}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.name}
            </button>
          ))}
          {newClass === null ? (
            <button onClick={() => setNewClass("")} title="Add a class" aria-label="Add a class"
              className="px-2 py-1.5 text-slate-500 hover:text-white">+</button>
          ) : (
            <form
              className="flex gap-1 py-1"
              onSubmit={(e) => {
                e.preventDefault();
                if (!newClass.trim()) return setNewClass(null);
                const s = actions.addSubject(newClass);
                setNewClass(null);
                pickSubject(s.id);
              }}
            >
              <input autoFocus value={newClass} onChange={(e) => setNewClass(e.target.value)} placeholder="Class name"
                onBlur={() => !newClass.trim() && setNewClass(null)}
                className="bg-white/6 rounded-md px-2 py-0.5 outline-none w-36" />
            </form>
          )}
        </div>
        {searchOpen || search ? (
          <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} onBlur={() => !search && setSearchOpen(false)}
            placeholder="Search notes…" className="bg-white/6 rounded-md px-2 py-1 outline-none w-36 sm:w-48 text-sm" />
        ) : (
          <button onClick={() => setSearchOpen(true)} title="Search notes" aria-label="Search notes" className="px-2 py-1 text-slate-500 hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" strokeLinecap="round" /></svg>
          </button>
        )}
        <button onClick={newPage} className="shrink-0 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white">+ Page</button>
      </div>

      {q ? (
        <div className="bg-card border border-white/10 rounded-xl p-4">
          <p className="text-slate-400 mb-2">{results.length} page{results.length === 1 ? "" : "s"} found</p>
          <ul className="divide-y divide-white/10">
            {results.map((n) => {
              const s = subjects.find((x) => x.id === n.subjectId);
              return (
                <li key={n.id}>
                  <button className="w-full text-left py-2 hover:bg-white/6 px-2 rounded"
                    onClick={() => { setSearch(""); setParams({ class: n.subjectId, page: n.id }); }}>
                    <span className="font-hand text-2xl">{n.title || "Untitled"}</span>
                    <span className="text-sm text-slate-500 ml-2">{s?.name} · {fmtDate(n.createdAt)}</span>
                    <p className="text-sm text-slate-400 truncate">{htmlToText(n.html).slice(0, 140)}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <>
          <SaveWarning />
          {panel === "remind" && note && (
            <div className="mb-3">
              <RemindForm note={note} subject={subject} onDone={(ok) => { setPanel(null); if (ok) flashMsg("Reminder set"); }} />
            </div>
          )}
          {panel === "trash" && <Trash notes={trashed} subjects={subjects} onClose={() => setPanel(null)} />}

          {note && (
            <div className="sticky top-14 z-20 bg-paper/95 backdrop-blur-sm mb-2 relative">
              <NoteToolbar
                mode={mode} setMode={setMode} pen={pen} setPen={setPen} marker={marker} setMarker={setMarker}
                onExec={exec}
                onInsert={(text) => exec("insertText", text)}
                onTemplate={(t) => {
                  const empty = !htmlToText(note.html);
                  if (!note.title) actions.updateNote(note.id, { title: t.title });
                  setHtml(empty ? t.html : note.html + "<div><br></div>" + t.html);
                  setMode("type");
                }}
                onUndoInk={() => actions.updateNote(note.id, { ink: (note.ink || []).slice(0, -1) })}
                canUndoInk={!!note.ink?.length}
                onAsk={() => setAsking(true)}
                moreMenu={(close) => (
                  <div className="flex flex-col items-start gap-0.5">
                    <button onClick={() => { close(); setPanel("remind"); }} className="w-full text-left px-2 py-1 rounded-md hover:bg-white/8">Remind me about this page</button>
                    <button onClick={() => { close(); tearOut(); }} className="w-full text-left px-2 py-1 rounded-md hover:bg-white/8">Tear out this page</button>
                    {trashed.length > 0 && (
                      <button onClick={() => { close(); setPanel("trash"); }} className="w-full text-left px-2 py-1 rounded-md hover:bg-white/8">Trash ({trashed.length})</button>
                    )}
                    <p className="text-xs text-slate-500 mt-2 mb-0.5 px-2">Handwriting</p>
                    <div className="flex gap-1 px-1">
                      {[["neat", "Neat"], ["casual", "Script"], ["print", "Print"]].map(([id, name]) => (
                        <button key={id} onClick={() => actions.setSetting("noteFont", id)}
                          className={`px-2 py-0.5 rounded-md note-font-${id} !text-base ${font === id ? "bg-white/12" : "hover:bg-white/8"}`}>{name}</button>
                      ))}
                    </div>
                    <p className="text-xs mt-3 px-2"><SaveStatus /></p>
                  </div>
                )}
              />
              {flash && <p className="absolute right-0 -bottom-6 text-sm text-emerald-400">{flash}</p>}
            </div>
          )}

          {pages.length === 0 ? (
            <div className="book mx-auto" style={{ height: "min(60vh, 520px)", maxWidth: PAGE_W * MAX_ZOOM }}>
              <div className="book-sheet paper-page flex flex-col items-center justify-center text-center p-8">
                <p className="font-hand text-4xl mb-2">{subject?.name}</p>
                <p className="text-slate-500 mb-6">No pages yet.</p>
                <button onClick={newPage} className="bg-indigo-600 hover:bg-indigo-500 rounded-lg px-5 py-1.5">Start writing</button>
              </div>
            </div>
          ) : (
            <div className="mx-auto" style={{ maxWidth: PAGE_W * MAX_ZOOM }}>
            <PageFlip
              count={pages.length}
              index={index}
              onChange={setIndex}
              swipe={mode === "type"}
              height="max(480px, calc(100vh - 290px))"
              renderPage={(i, { live: isLive }) => (
                <NotePage note={pages[i]} live={isLive} pageNo={i + 1} font={font}
                  editorRef={editorRef} onSave={save} tool={tool} />
              )}
            />
            </div>
          )}
        </>
      )}

      {asking && note && (
        <AskPanel
          key={note.id}
          note={note}
          subject={subject}
          onClose={() => setAsking(false)}
          onAddToPage={(answer) => {
            const block = `<div><br></div><div><b style="color: #2e7d32">📎 Filled in by study buddy</b></div>${markdownToHtml(answer, "#2e7d32")}`;
            setHtml((editorRef.current?.innerHTML ?? note.html) + block);
            flashMsg("Added to page");
          }}
        />
      )}
    </main>
  );
}
