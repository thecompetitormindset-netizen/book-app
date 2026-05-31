import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getBook, regenerateSummary, updateMeta } from "../api";
import BookChat from "../components/BookChat";
import StudyGuide from "../components/StudyGuide";
import StarRating from "../components/StarRating";

const API = typeof __API_URL__ !== "undefined" ? __API_URL__ : "";

function thumbSrc(thumbnail) {
  if (!thumbnail) return null;
  if (thumbnail.startsWith("http")) return thumbnail;
  return `${API}/thumbnails/${encodeURIComponent(thumbnail)}`;
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readingTime(pages) {
  if (!pages || pages <= 0) return null;
  const mins = Math.round(pages * 1.5);
  if (mins < 60) return `~${mins} min read`;
  const hrs = (mins / 60).toFixed(1);
  return `~${hrs} hr read`;
}

function BookCover({ book }) {
  if (book.thumbnail) {
    return (
      <img
        src={thumbSrc(book.thumbnail)}
        alt={book.title}
        className="w-32 h-44 object-cover rounded-2xl shadow-2xl shrink-0 ring-1 ring-white/10"
      />
    );
  }
  return (
    <div
      className="w-28 h-40 rounded-2xl flex items-center justify-center text-4xl font-bold shrink-0 shadow-2xl ring-1 ring-white/10"
      style={{ backgroundColor: book.cover_color + "22", color: book.cover_color }}
    >
      {book.title.charAt(0).toUpperCase()}
    </div>
  );
}

const STATUS_OPTIONS = [
  { value: "unread",   label: "Want to Read", icon: "📚" },
  { value: "reading",  label: "Reading",       icon: "📖" },
  { value: "finished", label: "Finished",      icon: "✅" },
];

export default function BookDetail() {
  const { id } = useParams();
  const [book, setBook]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [regenerating, setRegen]  = useState(false);
  const [notes, setNotes]         = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesDirty, setNotesDirty]   = useState(false);

  const fetchBook = async () => {
    try {
      const data = await getBook(id);
      setBook(data);
      setNotes(data.notes || "");
    } catch {
      setBook(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBook(); }, [id]);

  useEffect(() => {
    if (!book) return;
    if (!["pending", "processing"].includes(book.summary_status)) return;
    const interval = setInterval(async () => {
      const updated = await getBook(id);
      setBook(updated);
      if (!["pending", "processing"].includes(updated.summary_status)) clearInterval(interval);
    }, 3000);
    return () => clearInterval(interval);
  }, [book?.summary_status]);

  const handleRegenerate = async () => {
    setRegen(true);
    const updated = await regenerateSummary(id);
    setBook(updated);
    setRegen(false);
  };

  const handleStatus = async (status) => {
    const updated = await updateMeta(id, { reading_status: status });
    setBook(updated);
  };

  const handleRating = async (rating) => {
    const updated = await updateMeta(id, { rating });
    setBook(updated);
  };

  const handleNotesSave = async () => {
    setNotesSaving(true);
    const updated = await updateMeta(id, { notes });
    setBook(updated);
    setNotesDirty(false);
    setNotesSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <svg className="w-6 h-6 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Loading...
      </div>
    );
  }

  if (!book) {
    return (
      <div className="text-center py-24">
        <p className="text-slate-400 mb-4">Book not found.</p>
        <Link to="/" className="text-indigo-400 hover:underline">Go back to library</Link>
      </div>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <Link to="/" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-8 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Library
      </Link>

      {/* Book header */}
      <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 mb-6 sm:mb-8 sm:items-start">
        <BookCover book={book} />
        <div className="min-w-0 flex-1 pt-1">
          <h1 className="text-2xl font-bold text-white leading-snug mb-1">{book.title}</h1>
          <p className="text-slate-400 mb-4">{book.author !== "Unknown" ? book.author : ""}</p>
          <div className="flex flex-wrap gap-2">
            {book.genre && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300 font-medium border border-indigo-500/20">
                {book.genre}
              </span>
            )}
            <span className="text-xs px-2.5 py-1 rounded-full bg-white/8 text-slate-400 uppercase tracking-wide">{book.file_format}</span>
            {book.page_count > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-white/8 text-slate-400">{book.page_count} pages</span>
            )}
            {readingTime(book.page_count) && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-white/8 text-slate-400">{readingTime(book.page_count)}</span>
            )}
            <span className="text-xs px-2.5 py-1 rounded-full bg-white/8 text-slate-400">{formatSize(book.file_size)}</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-white/8 text-slate-400">
              {new Date(book.uploaded_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
        </div>
      </div>

      {/* ── Reading status + Rating + Notes ── */}
      <div className="bg-[#1a1a24] border border-white/10 rounded-2xl p-5 mb-4 flex flex-col gap-4">
        {/* Status */}
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-2">Reading Status</p>
          <div className="flex gap-2 flex-wrap">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleStatus(opt.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                  book.reading_status === opt.value
                    ? "bg-indigo-600 text-white"
                    : "bg-white/6 text-slate-400 hover:bg-white/12 hover:text-slate-200"
                }`}
              >
                <span>{opt.icon}</span>{opt.label}
              </button>
            ))}
          </div>
          {book.finished_at && (
            <p className="text-xs text-emerald-400 mt-2">
              Finished {new Date(book.finished_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          )}
        </div>

        {/* Rating */}
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-2">Your Rating</p>
          <div className="flex items-center gap-3">
            <StarRating value={book.rating} onChange={handleRating} size="lg" />
            {book.rating > 0 && (
              <span className="text-sm text-amber-400 font-medium">{book.rating} / 5</span>
            )}
            {book.rating === 0 && <span className="text-sm text-slate-600">Not rated yet</span>}
          </div>
        </div>

        {/* Notes */}
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-2">Your Notes</p>
          <textarea
            value={notes}
            onChange={e => { setNotes(e.target.value); setNotesDirty(true); }}
            placeholder="Write your thoughts, highlights, or anything you want to remember…"
            rows={3}
            className="w-full bg-[#0f0f13] border border-white/10 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 text-sm leading-relaxed resize-none focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {notesDirty && (
            <button
              onClick={handleNotesSave}
              disabled={notesSaving}
              className="mt-2 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg transition-colors font-medium"
            >
              {notesSaving ? "Saving…" : "Save Notes"}
            </button>
          )}
        </div>
      </div>

      {/* Publisher description */}
      {book.book_description && (
        <div className="bg-[#1a1a24] border border-white/10 rounded-2xl p-6 mb-4">
          <h2 className="text-white font-semibold text-lg mb-3">About this book</h2>
          <p className="text-slate-300 leading-relaxed text-sm">{book.book_description}</p>
        </div>
      )}

      {/* AI Summary section */}
      <div className="bg-[#1a1a24] border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold text-lg">Summary</h2>
          {(book.summary_status === "done" || book.summary_status === "error") && (
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className={`text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 ${
                book.summary_status === "error"
                  ? "text-red-400 hover:text-red-300"
                  : "text-slate-400 hover:text-indigo-400"
              }`}
            >
              <svg className={`w-3.5 h-3.5 ${regenerating ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {regenerating ? "Retrying…" : book.summary_status === "error" ? "Retry" : "Regenerate"}
            </button>
          )}
        </div>

        {(book.summary_status === "pending" || book.summary_status === "processing") && (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <svg className="w-8 h-8 animate-spin text-indigo-400 mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <p className="text-slate-300 font-medium">
              {book.summary_status === "pending" ? "Queued for summarization" : "Generating summary with AI..."}
            </p>
            <p className="text-slate-500 text-sm mt-1">This may take a minute for large books.</p>
          </div>
        )}

        {book.summary_status === "done" && book.summary && (
          <div className="prose prose-invert prose-sm max-w-none
            prose-headings:text-slate-100 prose-headings:font-semibold
            prose-p:text-slate-300 prose-p:leading-relaxed
            prose-li:text-slate-300
            prose-strong:text-slate-100
            prose-a:text-indigo-400">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{book.summary}</ReactMarkdown>
          </div>
        )}

        {book.summary_status === "error" && (
          <div className="text-center py-10">
            <p className="text-red-400 mb-1 font-medium">Summary generation failed</p>
            <p className="text-slate-500 text-sm mb-4">{book.summary}</p>
            <button
              onClick={handleRegenerate}
              className="text-sm text-indigo-400 hover:underline"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {/* Study Guide */}
      <StudyGuide
        bookId={book.id}
        bookTitle={book.title}
        studyStatus={book.study_status}
      />

      {/* Chat panel */}
      <BookChat
        bookId={book.id}
        bookTitle={book.title}
        summaryReady={book.summary_status === "done"}
      />
    </main>
  );
}
