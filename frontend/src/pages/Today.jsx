import { useState } from "react";
import { Link } from "react-router-dom";
import { actions, goalProgress, gpa, usePersonal } from "../store/personal";
import { useAuth } from "../auth";
import BackupCard from "../components/BackupCard";
import TrackPicker from "../components/TrackPicker";
import { friendlyWhen, todayISODate } from "../utils/dates";

function Card({ title, to, linkLabel, children, className = "" }) {
  return (
    <section className={`bg-card border border-white/10 rounded-2xl p-5 ${className}`}>
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-2xl text-white">{title}</h2>
        {to && <Link to={to} className="text-sm text-slate-500 hover:text-white">{linkLabel} →</Link>}
      </div>
      {children}
    </section>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function readingNow() {
  try {
    return (JSON.parse(localStorage.getItem("booksummary_books") || "[]")).filter((b) => b.reading_status === "reading").slice(0, 3);
  } catch {
    return [];
  }
}

export default function Today() {
  const { reminders, todos, goals, notes, subjects, settings, courses, applications } = usePersonal();
  const track = settings?.track;
  const { auth } = useAuth();
  const [todo, setTodo] = useState("");
  const [books] = useState(readingNow);
  const today = todayISODate();

  const upcoming = reminders.filter((r) => !r.done).sort((a, b) => a.at.localeCompare(b.at)).slice(0, 5);
  const now = new Date().toISOString();
  const openTodos = todos.filter((t) => !t.done).sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999")).slice(0, 6);
  const recent = notes.filter((n) => !n.deletedAt).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4);
  const firstName = auth?.user?.name?.split(" ")[0];

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <p className="text-slate-500">
        {new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
      </p>
      <h1 className="text-5xl text-white mb-4">{greeting()}{firstName ? `, ${firstName}` : ""}</h1>

      {!track && <TrackPicker />}

      <div className="flex flex-wrap items-center gap-4 mb-8">
        <Link to="/notebook" className="bg-indigo-600 hover:bg-indigo-500 rounded-xl px-5 py-2 text-lg">Open notebook</Link>
        <Link to="/planner" className="text-slate-400 hover:text-white">Add a reminder →</Link>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {track === "prenursing" && (() => {
          const g = gpa(courses);
          const next = applications.filter((a) => a.deadline && a.deadline >= today).sort((a, b) => a.deadline.localeCompare(b.deadline))[0];
          return (
            <Card title="Pre-nursing" to="/prenursing" linkLabel="Prereqs & applications" className="md:col-span-2">
              <div className="flex flex-wrap gap-x-10 gap-y-2">
                <p><span className="text-slate-500 text-sm block">Prerequisite GPA</span><span className="font-hand text-4xl">{g == null ? "—" : g.toFixed(2)}</span></p>
                <p><span className="text-slate-500 text-sm block">Courses done</span><span className="font-hand text-4xl">{courses.filter((c) => c.status === "done").length}/{courses.length}</span></p>
                <p><span className="text-slate-500 text-sm block">Next deadline</span>
                  <span className="text-lg">{next ? `${next.school} · ${new Date(next.deadline + "T00:00").toLocaleDateString([], { month: "short", day: "numeric" })}` : "None yet"}</span></p>
              </div>
            </Card>
          );
        })()}
        <Card title="Coming up" to="/planner" linkLabel="Planner">
          {upcoming.length === 0 ? <p className="text-slate-500 italic">Nothing coming up.</p> : (
            <ul>
              {upcoming.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-1.5 border-b border-white/8">
                  <input type="checkbox" className="w-5 h-5 accent-[#ef8f7a]" checked={false}
                    onChange={() => actions.updateReminder(r.id, { done: true })} aria-label="Mark done" />
                  <span className="flex-1 text-lg">{r.text}</span>
                  <span className={`text-sm ${r.at < now ? "text-red-400" : "text-slate-500"}`}>{friendlyWhen(r.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="To-do" to="/planner" linkLabel="All tasks">
          <form onSubmit={(e) => { e.preventDefault(); if (!todo.trim()) return; actions.addTodo(todo, today); setTodo(""); }}>
            <input value={todo} onChange={(e) => setTodo(e.target.value)} placeholder="Add a task…"
              className="w-full bg-transparent border-b border-dashed border-white/20 outline-none py-1 mb-2 text-lg" />
          </form>
          {openTodos.length === 0 ? <p className="text-slate-500 italic">All done.</p> : (
            <ul>
              {openTodos.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-1">
                  <input type="checkbox" className="w-5 h-5 accent-[#ef8f7a]" checked={t.done} onChange={() => actions.toggleTodo(t.id)} />
                  <span className="flex-1 text-lg">{t.text}</span>
                  {t.due && t.due < today && <span className="text-sm text-red-400">late</span>}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent notes" to="/notebook" linkLabel="Notebook">
          {recent.length === 0 ? <p className="text-slate-500 italic">No notes yet.</p> : (
            <ul>
              {recent.map((n) => {
                const s = subjects.find((x) => x.id === n.subjectId);
                return (
                  <li key={n.id}>
                    <Link to={`/notebook?class=${n.subjectId}&page=${n.id}`} className="flex items-center gap-2 py-1.5 hover:bg-white/6 rounded px-1">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s?.color }} />
                      <span className="text-lg flex-1 truncate">{n.title || "Untitled"}</span>
                      <span className="text-sm text-slate-500">{s?.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Goals" to="/planner" linkLabel="Goals">
          {goals.length === 0 ? <p className="text-slate-500 italic">No goals yet.</p> : (
            <ul className="flex flex-col gap-3">
              {goals.slice(0, 4).map((g) => {
                const pct = goalProgress(g);
                return (
                  <li key={g.id}>
                    <div className="flex justify-between text-lg"><span>{g.title}</span><span className="text-slate-500">{pct}%</span></div>
                    <div className="h-2.5 bg-white/8 rounded-full overflow-hidden"><div className="h-full bg-indigo-600" style={{ width: `${pct}%` }} /></div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {books.length > 0 && (
          <Card title="Keep reading" to="/library" linkLabel="Library" className="md:col-span-2">
            <div className="flex flex-wrap gap-3">
              {books.map((b) => (
                <Link key={b.id} to={`/books/${b.id}`} className="bg-white/6 hover:bg-white/12 rounded-lg px-4 py-2 text-lg">{b.title}</Link>
              ))}
            </div>
          </Card>
        )}

        {track && (
          <div className="md:col-span-2 flex items-center gap-2 text-sm text-slate-500">
            <span>I’m in:</span> <TrackPicker current={track} compact />
          </div>
        )}
        <BackupCard />
      </div>
    </main>
  );
}
