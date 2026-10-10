import { useState } from "react";
import { APPLICATION_STATUSES, GRADE_POINTS, actions, gpa, usePersonal } from "../store/personal";
import { todayISODate } from "../utils/dates";

const inputCls = "bg-white/6 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500/60";
const STATUS = [["planned", "Planned"], ["taking", "Taking now"], ["done", "Done"]];

function Section({ title, right, children }) {
  return (
    <section className="bg-card border border-white/10 rounded-2xl p-5">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="text-3xl text-white leading-none">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function Prerequisites() {
  const { courses, settings } = usePersonal();
  const [name, setName] = useState("");
  const [credits, setCredits] = useState(3);
  const g = gpa(courses);
  const target = Number(settings?.targetGpa) || 3.5;
  const done = courses.filter((c) => c.status === "done").length;

  return (
    <Section
      title="Prerequisites"
      right={<span className="text-sm text-slate-500">{done} of {courses.length} done</span>}
    >
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2 mb-4">
        <div>
          <p className="text-sm text-slate-500">Prerequisite GPA</p>
          <p className="font-hand text-5xl leading-none text-white">{g == null ? "—" : g.toFixed(2)}</p>
        </div>
        <label className="text-sm text-slate-500">
          Goal{" "}
          <input type="number" min="2" max="4" step="0.1" value={target}
            onChange={(e) => actions.setSetting("targetGpa", e.target.value)}
            className={`${inputCls} w-20 ml-1`} aria-label="Target GPA" />
        </label>
        {g != null && (
          <p className={`text-sm ${g >= target ? "text-emerald-400" : "text-amber-400"}`}>
            {g >= target ? "On track for your goal ✓" : `${(target - g).toFixed(2)} below your goal — keep going`}
          </p>
        )}
      </div>

      {courses.length === 0 && (
        <div className="mb-3">
          <p className="text-slate-500 mb-2">Add your courses, or start with the ones most nursing programs require.</p>
          <button onClick={actions.addCommonPrereqs} className="bg-white/8 hover:bg-white/14 rounded-lg px-3 py-1.5">
            + Add common prerequisites
          </button>
        </div>
      )}

      <ul className="divide-y divide-white/8">
        {courses.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-2 py-2 group">
            <span className={`flex-1 min-w-[10rem] ${c.status === "done" ? "" : "text-slate-300"}`}>{c.name}</span>
            <select value={c.status} onChange={(e) => actions.updateCourse(c.id, { status: e.target.value })}
              className={`${inputCls} text-sm`} aria-label={`${c.name} status`}>
              {STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={c.grade} onChange={(e) => actions.updateCourse(c.id, { grade: e.target.value, status: e.target.value ? "done" : c.status })}
              className={`${inputCls} text-sm w-20`} aria-label={`${c.name} grade`}>
              <option value="">Grade</option>
              {Object.keys(GRADE_POINTS).map((gr) => <option key={gr} value={gr}>{gr}</option>)}
            </select>
            <input type="number" min="0" max="6" value={c.credits}
              onChange={(e) => actions.updateCourse(c.id, { credits: Number(e.target.value) })}
              className={`${inputCls} text-sm w-16`} aria-label={`${c.name} credits`} title="Credits" />
            <button onClick={() => actions.deleteCourse(c.id)} className="opacity-40 group-hover:opacity-100 hover:text-red-400 px-1" aria-label={`Remove ${c.name}`}>✕</button>
          </li>
        ))}
      </ul>

      <form className="flex flex-wrap gap-2 mt-3"
        onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; actions.addCourse(name, Number(credits) || 3); setName(""); }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Add a course…" className={`${inputCls} flex-1 min-w-[10rem]`} />
        <input type="number" min="0" max="6" value={credits} onChange={(e) => setCredits(e.target.value)} className={`${inputCls} w-16`} aria-label="Credits" title="Credits" />
        <button className="bg-indigo-600 hover:bg-indigo-500 rounded-lg px-4">Add</button>
      </form>
      {courses.length > 0 && <p className="text-xs text-slate-500 mt-2">GPA counts finished courses with a grade, weighted by credits. Check how each school calculates it.</p>}
    </Section>
  );
}

function Application({ app }) {
  const [req, setReq] = useState("");
  const today = todayISODate();
  const left = app.reqs.filter((r) => !r.done).length;
  const days = app.deadline ? Math.round((new Date(app.deadline + "T00:00") - new Date(today + "T00:00")) / 86400000) : null;

  return (
    <div className="rounded-xl border border-white/10 p-4">
      <div className="flex flex-wrap items-baseline gap-2">
        <h3 className="text-2xl text-white flex-1">{app.school}</h3>
        <select value={app.status} onChange={(e) => actions.updateApplication(app.id, { status: e.target.value })}
          className={`${inputCls} text-sm`} aria-label="Application status">
          {APPLICATION_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <button onClick={() => confirm(`Remove ${app.school}?`) && actions.deleteApplication(app.id)}
          className="text-slate-500 hover:text-red-400 px-1" aria-label={`Remove ${app.school}`}>✕</button>
      </div>
      <p className={`text-sm mb-2 ${days != null && days < 0 ? "text-slate-500" : days != null && days <= 14 ? "text-red-400" : "text-slate-500"}`}>
        {app.deadline
          ? `Deadline ${new Date(app.deadline + "T00:00").toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}` +
            (days > 0 ? ` · ${days} day${days === 1 ? "" : "s"} left` : days === 0 ? " · today" : " · passed")
          : "No deadline set"}
        {" · "}{left ? `${left} to do` : "all requirements done ✓"}
      </p>
      <ul className="grid sm:grid-cols-2 gap-x-4">
        {app.reqs.map((r) => (
          <li key={r.id}>
            <label className="flex items-center gap-2 py-0.5 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-[#ef8f7a]" checked={r.done} onChange={() => actions.toggleRequirement(app.id, r.id)} />
              <span className={r.done ? "line-through text-slate-500" : ""}>{r.text}</span>
            </label>
          </li>
        ))}
      </ul>
      <form onSubmit={(e) => { e.preventDefault(); if (!req.trim()) return; actions.addRequirement(app.id, req); setReq(""); }}>
        <input value={req} onChange={(e) => setReq(e.target.value)} placeholder="+ add a requirement"
          className="mt-1 w-full bg-transparent border-b border-dashed border-white/20 outline-none py-1 text-sm" />
      </form>
    </div>
  );
}

function Applications() {
  const { applications } = usePersonal();
  const [school, setSchool] = useState("");
  const [deadline, setDeadline] = useState("");
  const sorted = [...applications].sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"));

  return (
    <Section title="Applications">
      <form className="flex flex-wrap gap-2 mb-4"
        onSubmit={(e) => { e.preventDefault(); if (!school.trim()) return; actions.addApplication(school, deadline); setSchool(""); setDeadline(""); }}>
        <input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="Nursing program / school" className={`${inputCls} flex-1 min-w-[12rem]`} />
        <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputCls} aria-label="Deadline" />
        <button className="bg-indigo-600 hover:bg-indigo-500 rounded-lg px-4">Add</button>
      </form>
      {applications.length === 0 && (
        <p className="text-slate-500">Add each program you’re applying to. You’ll get a checklist and reminders a week before and on the deadline.</p>
      )}
      <div className="flex flex-col gap-3">
        {sorted.map((a) => <Application key={a.id} app={a} />)}
      </div>
    </Section>
  );
}

export default function Prenursing() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <h1 className="text-4xl text-white mb-4">Pre-nursing</h1>
      <div className="grid lg:grid-cols-2 gap-5 items-start">
        <Prerequisites />
        <Applications />
      </div>
    </main>
  );
}
