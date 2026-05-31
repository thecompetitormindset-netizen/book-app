import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { API_BASE } from "../api";

// ── API helpers ───────────────────────────────────────────────────────────────
const startStudy  = (id) => fetch(`${API_BASE}/api/books/${id}/study`, { method: "POST" });
const fetchStudy  = (id) => fetch(`${API_BASE}/api/books/${id}/study`).then((r) => r.json());

// ── Flashcard ─────────────────────────────────────────────────────────────────
function Flashcard({ card, index, total }) {
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(false);

  const CATEGORY_COLOR = {
    Definition:  "bg-blue-500/20 text-blue-300",
    Theorem:     "bg-purple-500/20 text-purple-300",
    Formula:     "bg-amber-500/20 text-amber-300",
    Method:      "bg-teal-500/20 text-teal-300",
    Application: "bg-green-500/20 text-green-300",
    Concept:     "bg-indigo-500/20 text-indigo-300",
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-slate-500 text-xs">{index + 1} / {total}</div>

      {/* Card with CSS flip */}
      <div
        className="w-full cursor-pointer"
        style={{ perspective: "1000px" }}
        onClick={() => setFlipped((f) => !f)}
      >
        <div
          className="relative w-full transition-transform duration-500"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            minHeight: "200px",
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 rounded-2xl bg-[#22223a] border border-white/10 p-6 flex flex-col justify-between"
            style={{ backfaceVisibility: "hidden" }}
          >
            {card.category && (
              <span className={`self-start text-xs px-2.5 py-1 rounded-full font-medium ${CATEGORY_COLOR[card.category] || "bg-white/10 text-slate-400"}`}>
                {card.category}
              </span>
            )}
            <p className="text-white text-lg font-medium text-center leading-snug mt-4">{card.question}</p>
            <p className="text-slate-500 text-xs text-center">Tap to reveal answer</p>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 rounded-2xl bg-indigo-900/40 border border-indigo-500/30 p-6 flex flex-col justify-between"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <p className="text-slate-200 text-sm leading-relaxed flex-1">{card.answer}</p>
            <p className="text-indigo-400 text-xs text-center mt-4">Tap to flip back</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => { setKnown(true); setFlipped(false); }}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            known ? "bg-emerald-600 text-white" : "bg-white/6 hover:bg-emerald-600/30 text-slate-300"
          }`}
        >
          Got it
        </button>
        <button
          onClick={() => { setKnown(false); setFlipped(false); }}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-white/6 hover:bg-red-500/20 text-slate-300 transition-colors"
        >
          Review again
        </button>
      </div>
    </div>
  );
}

// ── Concept Card ──────────────────────────────────────────────────────────────
function ConceptCard({ concept }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-[#1e1e2e] border border-white/8 rounded-2xl overflow-hidden hover:border-white/16 transition-colors">
      <div className="flex gap-4 p-5">
        {concept.wiki_image && (
          <img
            src={concept.wiki_image}
            alt={concept.term}
            className="w-20 h-20 object-cover rounded-xl shrink-0 bg-white/5"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-white font-semibold text-base leading-snug">{concept.term}</h3>
            {concept.wiki_url && (
              <a
                href={concept.wiki_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 shrink-0"
                title="View on Wikipedia"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
          <p className="text-slate-400 text-sm leading-relaxed mb-2">{concept.definition}</p>
          {concept.why_important && (
            <p className="text-slate-500 text-xs italic">{concept.why_important}</p>
          )}
        </div>
      </div>

      {concept.wiki_description && (
        <>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="w-full px-5 py-2.5 border-t border-white/6 text-left text-xs text-slate-500 hover:text-slate-300 hover:bg-white/4 transition-colors flex items-center gap-1.5"
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-90" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {expanded ? "Hide" : "Show"} Wikipedia explanation
          </button>
          {expanded && (
            <div className="px-5 pb-5 border-t border-white/6 pt-4">
              <p className="text-slate-300 text-sm leading-relaxed">{concept.wiki_description}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Chapter Accordion ─────────────────────────────────────────────────────────
function ChapterItem({ chapter, index }) {
  const [open, setOpen] = useState(index === 0);

  return (
    <div className="border border-white/8 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/4 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-300 text-xs font-bold flex items-center justify-center shrink-0">
            {index + 1}
          </span>
          <span className="text-white font-medium text-sm">{chapter.title}</span>
        </div>
        <svg
          className={`w-4 h-4 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-white/6 space-y-4 pt-4">
          {chapter.summary && (
            <p className="text-slate-300 text-sm leading-relaxed">{chapter.summary}</p>
          )}
          {chapter.key_points?.length > 0 && (
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-2">Key Points</p>
              <ul className="space-y-1.5">
                {chapter.key_points.map((p, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-300">
                    <span className="text-indigo-400 mt-0.5 shrink-0">›</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {chapter.important_terms?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {chapter.important_terms.map((t) => (
                <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-white/6 text-slate-400">{t}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Glossary ──────────────────────────────────────────────────────────────────
function Glossary({ items }) {
  const [search, setSearch] = useState("");
  const filtered = items.filter(
    (g) =>
      !search ||
      g.term.toLowerCase().includes(search.toLowerCase()) ||
      g.definition.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search terms…"
        className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
      />
      <div className="space-y-2">
        {filtered.map((g, i) => (
          <div key={i} className="flex gap-4 bg-[#1a1a24] border border-white/8 rounded-xl px-4 py-3">
            <span className="text-indigo-300 font-semibold text-sm min-w-[180px] shrink-0">{g.term}</span>
            <span className="text-slate-400 text-sm leading-relaxed">{g.definition}</span>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-6">No terms match "{search}"</p>
        )}
      </div>
    </div>
  );
}

// ── Flashcard Browser ─────────────────────────────────────────────────────────
function FlashcardBrowser({ cards }) {
  const [index, setIndex] = useState(0);
  const [filter, setFilter] = useState("All");
  const categories = ["All", ...Array.from(new Set(cards.map((c) => c.category).filter(Boolean)))];
  const filtered = filter === "All" ? cards : cards.filter((c) => c.category === filter);

  const go = (dir) => setIndex((i) => Math.max(0, Math.min(filtered.length - 1, i + dir)));

  useEffect(() => setIndex(0), [filter]);

  return (
    <div className="space-y-5">
      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === cat ? "bg-indigo-600 text-white" : "bg-white/6 text-slate-400 hover:bg-white/12"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <>
          <Flashcard card={filtered[index]} index={index} total={filtered.length} />
          <div className="flex justify-center gap-4">
            <button
              onClick={() => go(-1)}
              disabled={index === 0}
              className="px-5 py-2 rounded-xl bg-white/6 hover:bg-white/12 disabled:opacity-30 text-slate-300 text-sm transition-colors"
            >
              ← Previous
            </button>
            <button
              onClick={() => setIndex(Math.floor(Math.random() * filtered.length))}
              className="px-5 py-2 rounded-xl bg-white/6 hover:bg-white/12 text-slate-300 text-sm transition-colors"
            >
              Shuffle
            </button>
            <button
              onClick={() => go(1)}
              disabled={index === filtered.length - 1}
              className="px-5 py-2 rounded-xl bg-white/6 hover:bg-white/12 disabled:opacity-30 text-slate-300 text-sm transition-colors"
            >
              Next →
            </button>
          </div>
        </>
      ) : (
        <p className="text-slate-500 text-center py-8">No flashcards in this category.</p>
      )}
    </div>
  );
}

// ── Main StudyGuide component ─────────────────────────────────────────────────
const TABS = ["Chapters", "Concepts", "Flashcards", "Glossary"];

export default function StudyGuide({ bookId, bookTitle, studyStatus: initialStatus }) {
  const [status, setStatus] = useState(initialStatus || "none");
  const [guide, setGuide] = useState(null);
  const [activeTab, setActiveTab] = useState("Chapters");
  const pollRef = useRef(null);

  const load = async () => {
    const data = await fetchStudy(bookId);
    setStatus(data.study_status);
    if (data.guide) setGuide(data.guide);
    return data.study_status;
  };

  useEffect(() => {
    if (status === "done" && !guide) load();
  }, []);

  useEffect(() => {
    if (status === "processing") {
      pollRef.current = setInterval(async () => {
        const s = await load();
        if (s !== "processing") clearInterval(pollRef.current);
      }, 4000);
    }
    return () => clearInterval(pollRef.current);
  }, [status]);

  const handleGenerate = async () => {
    setStatus("processing");
    setGuide(null);
    await startStudy(bookId);
  };

  // ── Not yet generated ─────────────────────────────────────────────────────
  if (status === "none" || status === "error") {
    return (
      <div className="bg-[#1a1a24] border border-white/10 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <h3 className="text-white font-semibold text-lg mb-2">Deep Study Guide</h3>
        <p className="text-slate-400 text-sm mb-1 max-w-md mx-auto">
          Goes through every concept in <span className="text-slate-200">{bookTitle}</span> line by line.
        </p>
        <p className="text-slate-500 text-xs mb-6 max-w-md mx-auto">
          Generates: chapter breakdown · concept cards with Wikipedia explanations &amp; figures · 40+ flashcards · full glossary
        </p>
        {status === "error" && (
          <p className="text-red-400 text-sm mb-4">Generation failed. Try again.</p>
        )}
        <button
          onClick={handleGenerate}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-medium transition-colors text-sm"
        >
          Generate Study Guide
        </button>
        <p className="text-slate-600 text-xs mt-3">Takes 3–8 minutes for a full technical book</p>
      </div>
    );
  }

  // ── Processing ────────────────────────────────────────────────────────────
  if (status === "processing") {
    return (
      <div className="bg-[#1a1a24] border border-white/10 rounded-2xl p-10 text-center">
        <svg className="w-10 h-10 animate-spin text-indigo-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <p className="text-white font-semibold mb-1">Building your Study Guide…</p>
        <p className="text-slate-400 text-sm">Extracting concepts · generating flashcards · looking up Wikipedia…</p>
        <p className="text-slate-500 text-xs mt-3">This takes 3–8 minutes. You can navigate away — it runs in the background.</p>
      </div>
    );
  }

  // ── Done ─────────────────────────────────────────────────────────────────
  if (!guide) return null;

  const tabContent = {
    Chapters:   <div className="space-y-3">{guide.chapters?.map((ch, i) => <ChapterItem key={i} chapter={ch} index={i} />)}</div>,
    Concepts:   <div className="grid gap-4 sm:grid-cols-2">{guide.concepts?.map((c, i) => <ConceptCard key={i} concept={c} />)}</div>,
    Flashcards: <FlashcardBrowser cards={guide.flashcards || []} />,
    Glossary:   <Glossary items={guide.glossary || []} />,
  };

  const tabCounts = {
    Chapters:   guide.chapters?.length || 0,
    Concepts:   guide.concepts?.length || 0,
    Flashcards: guide.flashcards?.length || 0,
    Glossary:   guide.glossary?.length || 0,
  };

  return (
    <div className="bg-[#1a1a24] border border-white/10 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-400" />
          <h2 className="text-white font-semibold">Study Guide</h2>
        </div>
        <button
          onClick={handleGenerate}
          className="text-xs text-slate-500 hover:text-indigo-400 transition-colors flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Regenerate
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/8 px-4">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-indigo-500 text-white"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            {tab}
            {tabCounts[tab] > 0 && (
              <span className={`ml-1.5 text-xs ${activeTab === tab ? "text-indigo-300" : "text-slate-600"}`}>
                {tabCounts[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-6">{tabContent[activeTab]}</div>
    </div>
  );
}
