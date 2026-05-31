import { useState, useEffect, useCallback } from "react";
import BookCard from "../components/BookCard";
import UploadModal from "../components/UploadModal";
import FolderImportModal from "../components/FolderImportModal";
import { getBooks, deleteBook, getStats } from "../api";

const CACHE_KEY = "booksummary_books";

function loadCache() {
  try { const r = localStorage.getItem(CACHE_KEY); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
function saveCache(books) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(books)); } catch {}
}

// ── Progress banner ────────────────────────────────────────────────────────────
function ProcessingBanner({ stats }) {
  if (!stats || stats.pending === 0) return null;
  const pct = stats.total ? Math.round(stats.done / stats.total * 100) : 0;
  return (
    <div className="mx-6 mb-0 mt-2 bg-[#1a1a2e] border border-indigo-500/20 rounded-2xl px-5 py-3 flex items-center gap-4">
      <svg className="w-4 h-4 text-indigo-400 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-slate-300">
            Summarizing books — <span className="text-white font-medium">{stats.done}</span> of{" "}
            <span className="text-white font-medium">{stats.total}</span> done
          </span>
          <span className="text-xs text-indigo-400 font-medium">{pct}%</span>
        </div>
        <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-600 to-violet-500 rounded-full transition-all duration-1000"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className="text-xs text-slate-500 shrink-0">{stats.pending} left</span>
    </div>
  );
}

// ── Sort + filter bar ──────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: "date_desc", label: "Newest first" },
  { value: "date_asc",  label: "Oldest first" },
  { value: "title_asc", label: "A → Z" },
  { value: "title_desc",label: "Z → A" },
  { value: "status",    label: "Ready first" },
];

function sortBooks(books, sort) {
  const b = [...books];
  switch (sort) {
    case "date_asc":   return b.sort((a, z) => new Date(a.uploaded_at) - new Date(z.uploaded_at));
    case "title_asc":  return b.sort((a, z) => a.title.localeCompare(z.title));
    case "title_desc": return b.sort((a, z) => z.title.localeCompare(a.title));
    case "status":     return b.sort((a, z) => (z.summary_status === "done" ? 1 : 0) - (a.summary_status === "done" ? 1 : 0));
    default:           return b.sort((a, z) => new Date(z.uploaded_at) - new Date(a.uploaded_at));
  }
}

export default function Library() {
  const [books, setBooks]             = useState(() => loadCache());
  const [stats, setStats]             = useState(null);
  const [showUpload, setShowUpload]   = useState(false);
  const [showFolder, setShowFolder]   = useState(false);
  const [search, setSearch]           = useState("");
  const [activeGenre, setActiveGenre] = useState("All");
  const [activeStatus, setActiveStatus] = useState("All");
  const [sort, setSort]               = useState("date_desc");
  const [fetching, setFetching]       = useState(books.length === 0);

  const fetchBooks = useCallback(async () => {
    try {
      const [data, s] = await Promise.all([getBooks(), getStats()]);
      setBooks(data);
      saveCache(data);
      setStats(s);
    } catch { /* keep cached */ }
    finally { setFetching(false); }
  }, []);

  useEffect(() => {
    fetchBooks();
    const id = setInterval(fetchBooks, 5000);
    return () => clearInterval(id);
  }, [fetchBooks]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this book?")) return;
    await deleteBook(id);
    setBooks(prev => { const n = prev.filter(b => b.id !== id); saveCache(n); return n; });
  };

  const handleUploaded = (newBooks) => {
    setBooks(prev => { const n = [...newBooks, ...prev]; saveCache(n); return n; });
  };

  // Build genre list
  const genreSet = new Set();
  books.forEach(b => { if (b.genre) genreSet.add(b.genre); });
  const genres = ["All", ...Array.from(genreSet).sort()];

  // Filter → sort → render
  const STATUS_TABS = [
    { value: "All",      label: "All",          count: books.length },
    { value: "unread",   label: "📚 Want to Read", count: books.filter(b => (b.reading_status||"unread") === "unread").length },
    { value: "reading",  label: "📖 Reading",       count: books.filter(b => b.reading_status === "reading").length },
    { value: "finished", label: "✅ Finished",      count: books.filter(b => b.reading_status === "finished").length },
  ];

  const sl = search.toLowerCase();
  const filtered = sortBooks(
    books.filter(b => {
      const matchSearch  = !search || b.title.toLowerCase().includes(sl) || b.author.toLowerCase().includes(sl);
      const matchGenre   = activeGenre === "All" || b.genre === activeGenre;
      const matchStatus  = activeStatus === "All" || (b.reading_status || "unread") === activeStatus;
      return matchSearch && matchGenre && matchStatus;
    }),
    sort
  );

  return (
    <main className="max-w-7xl mx-auto w-full">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 pt-10 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">My Library</h1>
          <p className="text-slate-400 mt-1 text-sm">
            {books.length} book{books.length !== 1 ? "s" : ""}
            {stats?.error > 0 && (
              <span className="ml-2 text-red-400">&bull; {stats.error} errors</span>
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowFolder(true)}
            className="flex items-center gap-2 bg-white/8 hover:bg-white/14 border border-white/10 text-slate-200 px-4 py-2.5 rounded-xl font-medium transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
            </svg>
            Import Folder
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-indigo-900/30 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            Upload
          </button>
        </div>
      </div>

      {/* ── Processing banner ── */}
      <ProcessingBanner stats={stats} />

      {/* ── Search + sort bar ── */}
      {books.length > 0 && (
        <div className="flex gap-3 px-6 mt-6 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by title or author…"
              className="w-full bg-[#1a1a24] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
            />
          </div>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Reading status tabs ── */}
      {books.length > 0 && (
        <div className="flex gap-2 px-6 mt-4">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveStatus(tab.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeStatus === tab.value
                  ? "bg-indigo-600 text-white"
                  : "bg-white/6 text-slate-400 hover:bg-white/12 hover:text-slate-200"
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 text-xs ${activeStatus === tab.value ? "text-indigo-200" : "text-slate-600"}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Genre tabs ── */}
      {genres.length > 1 && (
        <div className="flex gap-2 px-4 sm:px-6 mt-4 pb-4 border-b border-white/8 overflow-x-auto scrollbar-none"
             style={{ WebkitOverflowScrolling: "touch" }}>
          {genres.map(g => {
            const count = g === "All" ? books.length : books.filter(b => b.genre === g).length;
            return (
              <button
                key={g}
                onClick={() => setActiveGenre(g)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  activeGenre === g
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/40"
                    : "bg-white/6 text-slate-400 hover:bg-white/12 hover:text-slate-200"
                }`}
              >
                {g}
                <span className={`ml-1.5 text-xs ${activeGenre === g ? "text-indigo-200" : "text-slate-600"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Empty state ── */}
      {!fetching && books.length === 0 && (
        <div className="text-center py-24 px-6">
          <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-5">
            <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
            </svg>
          </div>
          <h2 className="text-white text-xl font-semibold mb-2">No books yet</h2>
          <p className="text-slate-400 mb-6 text-sm">Import your Books folder or upload a file to get an AI summary.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setShowFolder(true)} className="bg-white/8 hover:bg-white/14 border border-white/10 text-slate-200 px-5 py-2.5 rounded-xl font-medium transition-colors text-sm">
              Import from Folder
            </button>
            <button onClick={() => setShowUpload(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors text-sm">
              Upload a book
            </button>
          </div>
        </div>
      )}

      {/* ── Book grid ── */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 px-4 sm:px-6 py-6">
          {filtered.map(book => (
            <BookCard key={book.id} book={book} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {books.length > 0 && filtered.length === 0 && (
        <p className="text-center text-slate-500 py-16 text-sm">
          No books match {search ? `"${search}"` : `genre "${activeGenre}"`}
        </p>
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUploaded={handleUploaded} />}
      {showFolder && (
        <FolderImportModal
          onClose={() => setShowFolder(false)}
          onImported={newBooks => {
            setBooks(prev => { const n = [...newBooks, ...prev]; saveCache(n); return n; });
          }}
        />
      )}
    </main>
  );
}
