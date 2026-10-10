import { useState } from "react";
import { actions, goalProgress, usePersonal } from "../store/personal";
import { askNotificationPermission, notificationsSupported } from "../hooks/useReminderAlerts";
import { friendlyWhen, inMinutes, todayAt, toLocalInput, todayISODate, tomorrowAt } from "../utils/dates";

const QUICK_TIMES = [
  { label: "In 1 hour", get: () => inMinutes(60) },
  { label: "Tonight 7 PM", get: () => todayAt(19) },
  { label: "Tomorrow 8 AM", get: () => tomorrowAt(8) },
  { label: "Next week", get: () => { const d = tomorrowAt(8); d.setDate(d.getDate() + 6); return d; } },
];

function Section({ title, hint, children }) {
  return (
    <section className="bg-card border border-white/10 rounded-2xl p-5">
      <h2 className="text-4xl text-white leading-none">{title}</h2>
      {hint && <p className="text-slate-400 text-sm mb-3">{hint}</p>}
      {children}
    </section>
  );
}

const inputCls = "bg-white/6 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/60";

function AlertsBanner() {
  const [perm, setPerm] = useState(notificationsSupported() ? Notification.permission : "unsupported");
  if (perm === "granted") return null;
  return (
    <div className="sticky-note rounded-sm p-3 mb-6 flex flex-wrap items-center gap-3 !rotate-0">
      <span className="text-lg">🔔</span>
      <p className="flex-1 min-w-[14rem]">
        {perm === "denied"
          ? "Alerts are blocked in your browser settings — reminders will still pop up while this page is open."
          : perm === "unsupported"
            ? "This browser can't show alerts — reminders will pop up while the app is open."
            : "Turn on alerts so reminders pop up even when you're in another tab."}
      </p>
      {perm === "default" && (
        <button onClick={async () => setPerm(await askNotificationPermission())}
          className="bg-indigo-600 hover:bg-indigo-500 rounded-lg px-4 py-1.5">Turn on alerts</button>
      )}
    </div>
  );
}

function Reminders() {
  const { reminders, subjects } = usePersonal();
  const [text, setText] = useState("");
  const [at, setAt] = useState(toLocalInput(tomorrowAt(8)));
  const [subjectId, setSubjectId] = useState("");
  const [showDone, setShowDone] = useState(false);

  const add = (e) => {
    e.preventDefault();
    if (!text.trim() || !at) return;
    actions.addReminder({ text, at: new Date(at).toISOString(), subjectId: subjectId || null });
    setText("");
  };

  const open = reminders.filter((r) => !r.done).sort((a, b) => a.at.localeCompare(b.at));
  const done = reminders.filter((r) => r.done).sort((a, b) => b.at.localeCompare(a.at));
  const now = new Date().toISOString();

  return (
    <Section title="⏰ Reminders" hint="Homework, tests, things to bring to class.">
      <form onSubmit={add} className="flex flex-col gap-2 mb-4">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="What should I remind you about?" className={inputCls} />
        <div className="flex flex-wrap gap-2">
          <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} className={inputCls} aria-label="When" />
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={inputCls} aria-label="Class">
            <option value="">No class</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button className="bg-indigo-600 hover:bg-indigo-500 rounded-lg px-4 py-2">Add</button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_TIMES.map((q) => (
            <button type="button" key={q.label} onClick={() => setAt(toLocalInput(q.get()))}
              className="text-sm px-2.5 py-0.5 rounded-full bg-white/6 hover:bg-white/12 text-slate-300">{q.label}</button>
          ))}
        </div>
      </form>

      {open.length === 0 && <p className="text-slate-500 italic">Nothing coming up. 🎉</p>}
      <ul className="flex flex-col gap-1">
        {open.map((r) => {
          const s = subjects.find((x) => x.id === r.subjectId);
          const overdue = r.at < now;
          return (
            <li key={r.id} className="flex items-start gap-3 py-1.5 border-b border-white/8 group">
              <input type="checkbox" className="mt-1.5 w-5 h-5 accent-[#ef8f7a]" checked={false}
                onChange={() => actions.updateReminder(r.id, { done: true })} aria-label="Mark done" />
              <div className="flex-1 min-w-0">
                <p className="text-lg leading-snug">{r.text}</p>
                <p className={`text-sm ${overdue ? "text-red-400" : "text-slate-500"}`}>
                  {overdue ? "Overdue · " : ""}{friendlyWhen(r.at)}
                  {s && <span className="ml-2 px-1.5 rounded" style={{ backgroundColor: s.color + "88" }}>{s.name}</span>}
                </p>
              </div>
              <button onClick={() => actions.deleteReminder(r.id)} className="opacity-40 group-hover:opacity-100 hover:text-red-400" aria-label="Delete">✕</button>
            </li>
          );
        })}
      </ul>
      {done.length > 0 && (
        <button onClick={() => setShowDone((v) => !v)} className="mt-3 text-sm text-slate-500 hover:text-slate-300">
          {showDone ? "Hide" : "Show"} {done.length} done
        </button>
      )}
      {showDone && (
        <ul className="mt-1">
          {done.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-1 text-slate-500 line-through">
              <span className="flex-1">{r.text}</span>
              <button onClick={() => actions.deleteReminder(r.id)} className="no-underline hover:text-red-400" aria-label="Delete">✕</button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function Todos() {
  const { todos } = usePersonal();
  const [text, setText] = useState("");
  const [due, setDue] = useState("");
  const today = todayISODate();
  const sorted = [...todos].sort((a, b) => a.done - b.done || (a.due || "9999").localeCompare(b.due || "9999"));

  return (
    <Section title="✅ To-do" hint="Small things to get done.">
      <form
        onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; actions.addTodo(text, due || null); setText(""); setDue(""); }}
        className="flex flex-wrap gap-2 mb-3"
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a task and press Enter" className={`${inputCls} flex-1 min-w-[10rem]`} />
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={inputCls} aria-label="Due date (optional)" />
      </form>
      {todos.length === 0 && <p className="text-slate-500 italic">Your list is empty.</p>}
      <ul>
        {sorted.map((t) => (
          <li key={t.id} className="flex items-center gap-3 py-1.5 border-b border-white/8 group">
            <input type="checkbox" className="w-5 h-5 accent-[#ef8f7a]" checked={t.done} onChange={() => actions.toggleTodo(t.id)} aria-label="Done" />
            <span className={`flex-1 text-lg ${t.done ? "line-through text-slate-500" : ""}`}>{t.text}</span>
            {t.due && (
              <span className={`text-sm ${!t.done && t.due < today ? "text-red-400" : t.due === today ? "text-amber-400" : "text-slate-500"}`}>
                {t.due === today ? "today" : new Date(t.due + "T00:00").toLocaleDateString([], { month: "short", day: "numeric" })}
              </span>
            )}
            <button onClick={() => actions.deleteTodo(t.id)} className="opacity-40 group-hover:opacity-100 hover:text-red-400" aria-label="Delete">✕</button>
          </li>
        ))}
      </ul>
      {todos.some((t) => t.done) && (
        <button onClick={actions.clearDoneTodos} className="mt-3 text-sm text-slate-500 hover:text-slate-300">Clear finished</button>
      )}
    </Section>
  );
}

function Goal({ goal }) {
  const [step, setStep] = useState("");
  const pct = goalProgress(goal);
  return (
    <div className="bg-white/4 rounded-xl p-4 border border-white/8">
      <div className="flex items-start gap-2">
        <h3 className="text-3xl flex-1 leading-tight">{goal.title}</h3>
        <button onClick={() => confirm(`Delete goal "${goal.title}"?`) && actions.deleteGoal(goal.id)}
          className="text-slate-500 hover:text-red-400" aria-label="Delete goal">✕</button>
      </div>
      <div className="h-3 bg-white/8 rounded-full overflow-hidden my-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-indigo-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-sm text-slate-500 mb-2">{pct === 100 ? "Goal reached! 🏆" : `${pct}% there`}</p>
      <ul>
        {goal.steps.map((s) => (
          <li key={s.id} className="flex items-center gap-2 py-0.5 group">
            <input type="checkbox" className="w-4 h-4 accent-[#ef8f7a]" checked={s.done} onChange={() => actions.toggleStep(goal.id, s.id)} />
            <span className={`flex-1 ${s.done ? "line-through text-slate-500" : ""}`}>{s.text}</span>
            <button onClick={() => actions.deleteStep(goal.id, s.id)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 text-sm" aria-label="Delete step">✕</button>
          </li>
        ))}
      </ul>
      <form onSubmit={(e) => { e.preventDefault(); if (!step.trim()) return; actions.addStep(goal.id, step); setStep(""); }}>
        <input value={step} onChange={(e) => setStep(e.target.value)} placeholder="+ add a small step"
          className="mt-1 w-full bg-transparent border-b border-dashed border-white/20 outline-none py-1" />
      </form>
    </div>
  );
}

function Goals() {
  const { goals } = usePersonal();
  const [title, setTitle] = useState("");
  return (
    <Section title="🎯 Personal goals" hint="Big things, broken into small steps.">
      <form onSubmit={(e) => { e.preventDefault(); if (!title.trim()) return; actions.addGoal(title); setTitle(""); }} className="flex gap-2 mb-4">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Read 12 books this year" className={`${inputCls} flex-1`} />
        <button className="bg-indigo-600 hover:bg-indigo-500 rounded-lg px-4">Add goal</button>
      </form>
      {goals.length === 0 && <p className="text-slate-500 italic">What do you want to achieve this term?</p>}
      <div className="grid gap-3">
        {goals.map((g) => <Goal key={g.id} goal={g} />)}
      </div>
    </Section>
  );
}

export default function Planner() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pl-12 sm:pl-14">
      <h1 className="text-5xl text-white">Planner</h1>
      <p className="text-slate-400 mb-5">Reminders, to-dos and goals — all in one place.</p>
      <AlertsBanner />
      <div className="grid lg:grid-cols-2 gap-5 items-start">
        <div className="flex flex-col gap-5">
          <Reminders />
          <Todos />
        </div>
        <Goals />
      </div>
    </main>
  );
}
