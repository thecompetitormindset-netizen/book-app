import { Link } from "react-router-dom";
import StarRating from "./StarRating";

const API = typeof __API_URL__ !== "undefined" ? __API_URL__ : "";

function thumbSrc(thumbnail) {
  if (!thumbnail) return null;
  if (thumbnail.startsWith("http")) return thumbnail;          // Supabase URL
  return `${API}/thumbnails/${encodeURIComponent(thumbnail)}`; // local
}

const STATUS_MAP = {
  unread:   { label: "Want to Read", cls: "bg-slate-500/20 text-slate-400" },
  reading:  { label: "Reading",      cls: "bg-blue-500/20 text-blue-300" },
  finished: { label: "Finished",     cls: "bg-emerald-500/20 text-emerald-300" },
};

function SummaryBadge({ status }) {
  const map = {
    pending:    { label: "Queued",       cls: "bg-yellow-500/20 text-yellow-300" },
    processing: { label: "Summarizing…", cls: "bg-indigo-500/20 text-indigo-300 animate-pulse" },
    done:       { label: "Ready",        cls: "bg-emerald-500/20 text-emerald-300" },
    error:      { label: "Error",        cls: "bg-red-500/20 text-red-300" },
  };
  const { label, cls } = map[status] || map.pending;
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>;
}

function BookCover({ book }) {
  if (book.thumbnail) {
    return (
      <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden mb-3 shadow-lg bg-[#111]">
        <img
          src={thumbSrc(book.thumbnail)}
          alt={book.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        {book.reading_status === "finished" && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        {book.reading_status === "reading" && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        )}
      </div>
    );
  }
  return (
    <div
      className="w-full aspect-[2/3] rounded-xl flex items-center justify-center mb-3 text-5xl font-bold shadow-lg"
      style={{ backgroundColor: book.cover_color + "22", color: book.cover_color }}
    >
      {book.title.charAt(0).toUpperCase()}
    </div>
  );
}

export default function BookCard({ book, onDelete }) {
  const snippet = book.book_description
    ? book.book_description.slice(0, 100) + (book.book_description.length > 100 ? "…" : "")
    : null;

  return (
    <div className="group bg-[#1a1a24] border border-white/8 rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-200 hover:shadow-xl hover:shadow-black/40 hover:-translate-y-0.5 flex flex-col">
      <div className="p-4 flex flex-col flex-1">
        <BookCover book={book} />

        <h3 className="text-white font-semibold text-sm leading-snug mb-0.5 line-clamp-2">{book.title}</h3>
        <p className="text-slate-500 text-xs mb-2">{book.author !== "Unknown" ? book.author : ""}</p>

        {snippet && (
          <p className="text-slate-400 text-xs leading-relaxed mb-2 line-clamp-2">{snippet}</p>
        )}

        {book.rating > 0 && (
          <div className="mb-2">
            <StarRating value={book.rating} readonly size="sm" />
          </div>
        )}

        <div className="flex items-center gap-1.5 flex-wrap mb-3 mt-auto">
          <SummaryBadge status={book.summary_status} />
          {book.genre && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/8 text-slate-400 truncate max-w-[110px]">
              {book.genre}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <Link
            to={`/books/${book.id}`}
            className="flex-1 text-center text-xs bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg transition-colors font-medium"
          >
            Open
          </Link>
          <button
            onClick={() => onDelete(book.id)}
            className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-slate-500 transition-colors"
            title="Delete book"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
