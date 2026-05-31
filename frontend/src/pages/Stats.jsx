import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getStats } from "../api";

const API = "";

// ── Simple SVG bar chart ───────────────────────────────────────────────────────
function BarChart({ data, color = "#4f46e5", labelKey = "label", valueKey = "count" }) {
  if (!data || data.length === 0) return <p className="text-slate-500 text-sm text-center py-8">No data yet.</p>;
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div className="space-y-2">
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-slate-400 text-xs w-36 shrink-0 truncate text-right">{item[labelKey]}</span>
          <div className="flex-1 h-6 bg-white/5 rounded-lg overflow-hidden">
            <div
              className="h-full rounded-lg transition-all duration-700"
              style={{ width: `${(item[valueKey] / max) * 100}%`, background: color }}
            />
          </div>
          <span className="text-slate-300 text-xs w-6 text-right font-medium">{item[valueKey]}</span>
        </div>
      ))}
    </div>
  );
}

// ── Donut chart ────────────────────────────────────────────────────────────────
function DonutChart({ segments }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return <p className="text-slate-500 text-sm text-center py-6">No data yet.</p>;

  let offset = 0;
  const r = 60, cx = 80, cy = 80, circumference = 2 * Math.PI * r;

  return (
    <div className="flex items-center gap-6">
      <svg width="160" height="160" viewBox="0 0 160 160" className="shrink-0">
        <circle cx={cx} cy={cy} r={r} fill="transparent" stroke="rgba(255,255,255,.06)" strokeWidth="20" />
        {segments.map((seg, i) => {
          const pct = seg.value / total;
          const dash = pct * circumference;
          const gap  = circumference - dash;
          const el = (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="transparent"
              stroke={seg.color}
              strokeWidth="20"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset * circumference}
              strokeLinecap="round"
              style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }}
            />
          );
          offset += pct;
          return el;
        })}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="#f1f5f9" fontSize="20" fontWeight="700">{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#64748b" fontSize="10">books</text>
      </svg>
      <div className="space-y-2 flex-1">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: seg.color }} />
            <span className="text-slate-300 text-sm flex-1">{seg.label}</span>
            <span className="text-slate-400 text-sm font-medium">{seg.value}</span>
            <span className="text-slate-600 text-xs">({Math.round(seg.value / total * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = "indigo" }) {
  const colors = {
    indigo: "bg-indigo-500/10 text-indigo-400",
    emerald:"bg-emerald-500/10 text-emerald-400",
    amber:  "bg-amber-500/10 text-amber-400",
    blue:   "bg-blue-500/10 text-blue-400",
    violet: "bg-violet-500/10 text-violet-400",
  };
  return (
    <div className="bg-[#1a1a24] border border-white/8 rounded-2xl p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-lg ${colors[color]}`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-white mb-0.5">{value}</div>
      <div className="text-sm text-slate-400">{label}</div>
      {sub && <div className="text-xs text-slate-600 mt-1">{sub}</div>}
    </div>
  );
}

// ── Top rated book card ────────────────────────────────────────────────────────
function RatedBook({ book }) {
  const stars = "★".repeat(book.rating) + "☆".repeat(5 - book.rating);
  return (
    <Link to={`/books/${book.id}`} className="flex items-center gap-3 p-3 bg-[#1a1a24] border border-white/8 rounded-xl hover:border-white/20 transition-colors">
      {book.thumbnail ? (
        <img
          src={`${API}/thumbnails/${encodeURIComponent(book.thumbnail)}`}
          alt={book.title}
          className="w-10 h-14 object-cover rounded-lg shrink-0"
        />
      ) : (
        <div className="w-10 h-14 rounded-lg flex items-center justify-center text-lg font-bold shrink-0"
          style={{ background: book.cover_color + "33", color: book.cover_color }}>
          {book.title.charAt(0)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-white text-sm font-medium truncate">{book.title}</p>
        <p className="text-slate-500 text-xs truncate">{book.author !== "Unknown" ? book.author : ""}</p>
        <p className="text-amber-400 text-xs mt-0.5 tracking-widest">{stars}</p>
      </div>
    </Link>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Stats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <svg className="w-6 h-6 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        Loading stats…
      </div>
    );
  }

  if (!stats) return <p className="text-center text-slate-500 py-24">Could not load stats.</p>;

  const rs = stats.reading_status || {};
  const donutSegments = [
    { label: "Finished",      value: rs.finished || 0, color: "#10b981" },
    { label: "Reading",       value: rs.reading  || 0, color: "#3b82f6" },
    { label: "Want to Read",  value: rs.unread   || 0, color: "#4f46e5" },
  ];

  const genreData = (stats.top_genres || []).map(g => ({ label: g.genre, count: g.count }));
  const monthlyData = Object.entries(stats.monthly_finished || {}).slice(-6).map(([k, v]) => ({
    label: new Date(k + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
    count: v,
  }));

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/" className="text-slate-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
        </Link>
        <h1 className="text-3xl font-bold text-white">Reading Stats</h1>
      </div>

      {/* ── Top stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <StatCard icon="📚" label="Total Books"     value={stats.total}          color="indigo" />
        <StatCard icon="✅" label="Finished"         value={rs.finished || 0}     color="emerald" sub={`${Math.round((rs.finished||0)/Math.max(stats.total,1)*100)}% of library`} />
        <StatCard icon="📖" label="Reading Now"      value={rs.reading  || 0}     color="blue" />
        <StatCard icon="⏱️" label="Hours Read"       value={`${stats.reading_hours}h`} color="violet" sub={`${stats.total_pages_read} pages`} />
        <StatCard icon="⭐" label="Avg Rating"       value={stats.avg_rating > 0 ? stats.avg_rating : "—"} color="amber" sub={stats.rated_count > 0 ? `${stats.rated_count} rated` : "No ratings yet"} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Reading status donut */}
        <div className="bg-[#1a1a24] border border-white/8 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-5">Reading Status</h2>
          <DonutChart segments={donutSegments} />
        </div>

        {/* Top genres */}
        <div className="bg-[#1a1a24] border border-white/8 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-5">Top Genres</h2>
          <BarChart data={genreData} color="#4f46e5" labelKey="label" valueKey="count" />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly finished */}
        <div className="bg-[#1a1a24] border border-white/8 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-5">Books Finished (last 6 months)</h2>
          {monthlyData.length > 0
            ? <BarChart data={monthlyData} color="#10b981" labelKey="label" valueKey="count" />
            : <p className="text-slate-500 text-sm text-center py-8">Mark books as finished to see your progress here.</p>
          }
        </div>

        {/* Processing progress */}
        <div className="bg-[#1a1a24] border border-white/8 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-5">AI Processing</h2>
          <div className="space-y-4">
            {[
              { label: "Summaries done",  value: stats.done,    total: stats.total, color: "#4f46e5" },
              { label: "With thumbnails", value: stats.with_thumbnail || stats.total, total: stats.total, color: "#7c3aed" },
            ].map((row, i) => {
              const pct = row.total ? Math.round(row.value / row.total * 100) : 0;
              return (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-slate-400">{row.label}</span>
                    <span className="text-slate-300 font-medium">{row.value} / {row.total} <span className="text-slate-600">({pct}%)</span></span>
                  </div>
                  <div className="h-2 bg-white/6 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: row.color }} />
                  </div>
                </div>
              );
            })}
            {stats.error > 0 && (
              <p className="text-red-400 text-sm flex items-center gap-1.5 mt-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                </svg>
                {stats.error} book{stats.error !== 1 ? "s" : ""} failed — open them to retry.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Top rated */}
      {(stats.top_rated || []).length > 0 && (
        <div className="bg-[#1a1a24] border border-white/8 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-4">Top Rated Books</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.top_rated.map(book => <RatedBook key={book.id} book={book} />)}
          </div>
        </div>
      )}

      {stats.total_flashcards > 0 && (
        <div className="mt-4 bg-indigo-500/8 border border-indigo-500/20 rounded-2xl px-6 py-4 text-center">
          <span className="text-indigo-300 text-sm font-medium">
            📇 {stats.total_flashcards.toLocaleString()} flashcards generated across your library
          </span>
        </div>
      )}
    </main>
  );
}
