import { useSyncExternalStore } from "react";

// Personal data (notes, reminders, to-dos, goals) lives in localStorage so the
// app works for anyone with no account. Each signed-in user gets their own
// key, and auth.js mirrors changes to the backend so it follows them across
// devices.

export const SUBJECT_COLORS = ["#ef8f7a", "#f6c945", "#7cc59a", "#7fb0e8", "#c4a1f0", "#f3a5c8", "#f0a35e", "#9ad0d3"];

const emptyState = () => ({
  subjects: [{ id: "general", name: "General", color: SUBJECT_COLORS[1] }],
  notes: [],
  reminders: [],
  todos: [],
  goals: [],
  courses: [],
  applications: [],
  // track: "prenursing" | "nursing" | null (not chosen yet)
  settings: { noteFont: "neat", track: null, targetGpa: 3.5 },
  updatedAt: 0,
});

const TRASH_DAYS = 30;
const escapeHtml = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Bring older saved data up to date and empty the trash after 30 days. */
function migrate(data) {
  const cutoff = new Date(Date.now() - TRASH_DAYS * 86400000).toISOString();
  return {
    ...data,
    settings: { noteFont: "neat", track: null, targetGpa: 3.5, ...data.settings },
    courses: data.courses || [],
    applications: data.applications || [],
    notes: data.notes
      .filter((n) => !n.deletedAt || n.deletedAt > cutoff)
      .map((n) => (n.html !== undefined ? n : { ...n, html: escapeHtml(n.body || "").replace(/\n/g, "<br>"), ink: [] })),
  };
}

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

const keyFor = (userId) => `paper_notebook_${userId || "guest"}`;

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? migrate({ ...emptyState(), ...JSON.parse(raw) }) : null;
  } catch {
    return null;
  }
}

let currentKey = keyFor(null);
let state = read(currentKey) || emptyState();
const listeners = new Set();
const changeHandlers = new Set();

function emit() {
  listeners.forEach((fn) => fn());
}

let saveError = false;
function persistNow() {
  clearTimeout(persistTimer);
  persistTimer = null;
  try {
    localStorage.setItem(currentKey, JSON.stringify(state));
    saveError = false;
  } catch {
    saveError = true; // storage full or blocked — the UI warns the person
  }
}
let persistTimer = null;
// Writing the whole notebook on every keystroke is wasteful, so batch saves
// for a moment — and always flush before the tab is hidden or closed.
function persist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(persistNow, 250);
}
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => persistTimer && persistNow());
  document.addEventListener("visibilitychange", () => document.hidden && persistTimer && persistNow());
}
export const lastSaveFailed = () => saveError;

/** Ask the browser not to clear our storage when the device is low on space. */
export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return (await navigator.storage?.persist?.()) || false;
  } catch {
    return false;
  }
}

export const storageBytes = () => new Blob([JSON.stringify(state)]).size;

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const getState = () => state;

/** Called after every local edit (used by auth.js to sync to the server). */
export function onLocalChange(fn) {
  changeHandlers.add(fn);
  return () => changeHandlers.delete(fn);
}

/** Apply an edit: `fn` receives the current state and returns the next one. */
export function update(fn) {
  state = { ...fn(state), updatedAt: Date.now() };
  persist();
  emit();
  changeHandlers.forEach((h) => h(state));
}

/** Switch to another person's notebook (or back to the guest one). */
export function switchUser(userId) {
  if (persistTimer) persistNow();
  currentKey = keyFor(userId);
  state = read(currentKey) || emptyState();
  emit();
}

export function forgetUser(userId) {
  if (persistTimer) persistNow();
  try { localStorage.removeItem(keyFor(userId)); } catch { /* blocked */ }
}

/** Replace everything with data from the server (no change callbacks fire). */
export function replaceAll(data) {
  state = migrate({ ...emptyState(), ...data });
  persistNow();
  emit();
}

/** Restore from a backup file (replaces what's here; caller confirms first). */
export function importBackup(data) {
  if (!data || !Array.isArray(data.notes)) throw new Error("Not a notebook backup");
  replaceAll({ ...data, updatedAt: Date.now() });
  changeHandlers.forEach((h) => h(state));
}

export const hasGuestData = () => {
  const g = read(keyFor(null));
  return !!g && (g.notes.length || g.reminders.length || g.todos.length || g.goals.length);
};
export const guestData = () => read(keyFor(null));

export function usePersonal() {
  return useSyncExternalStore(subscribe, getState);
}

// ── Actions ──────────────────────────────────────────────────────────────────
const now = () => new Date().toISOString();
const patchIn = (list, id, patch) => list.map((x) => (x.id === id ? { ...x, ...patch } : x));

export const actions = {
  addSubject(name) {
    const subject = { id: uid(), name: name.trim(), color: SUBJECT_COLORS[state.subjects.length % SUBJECT_COLORS.length] };
    update((s) => ({ ...s, subjects: [...s.subjects, subject] }));
    return subject;
  },
  renameSubject(id, name) {
    update((s) => ({ ...s, subjects: patchIn(s.subjects, id, { name }) }));
  },
  deleteSubject(id) {
    // The class's pages go to the trash (into "General"), not straight to oblivion.
    update((s) => ({
      ...s,
      subjects: s.subjects.filter((x) => x.id !== id),
      notes: s.notes.map((n) => (n.subjectId === id ? { ...n, subjectId: "general", deletedAt: n.deletedAt || now() } : n)),
      reminders: s.reminders.map((r) => (r.subjectId === id ? { ...r, subjectId: null } : r)),
    }));
  },

  addNote(subjectId, title = "") {
    const note = { id: uid(), subjectId, title, html: "", ink: [], createdAt: now(), updatedAt: now() };
    update((s) => ({ ...s, notes: [...s.notes, note] }));
    return note;
  },
  updateNote(id, patch) {
    update((s) => ({ ...s, notes: patchIn(s.notes, id, { ...patch, updatedAt: now() }) }));
  },
  /** Torn-out pages go to the trash for 30 days so nothing is lost by accident. */
  trashNote(id) {
    update((s) => ({ ...s, notes: patchIn(s.notes, id, { deletedAt: now() }) }));
  },
  restoreNote(id) {
    update((s) => ({ ...s, notes: patchIn(s.notes, id, { deletedAt: null }) }));
  },
  deleteNoteForever(id) {
    update((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) }));
  },
  setSetting(key, value) {
    update((s) => ({ ...s, settings: { ...s.settings, [key]: value } }));
  },

  addReminder({ text, at, subjectId = null }) {
    const r = { id: uid(), text: text.trim(), at, subjectId, done: false, notified: false, createdAt: now() };
    update((s) => ({ ...s, reminders: [...s.reminders, r] }));
    return r;
  },
  updateReminder(id, patch) {
    update((s) => ({ ...s, reminders: patchIn(s.reminders, id, patch) }));
  },
  snoozeReminder(id, minutes = 10) {
    const at = new Date(Date.now() + minutes * 60000).toISOString();
    update((s) => ({ ...s, reminders: patchIn(s.reminders, id, { at, notified: false, done: false }) }));
  },
  deleteReminder(id) {
    update((s) => ({ ...s, reminders: s.reminders.filter((r) => r.id !== id) }));
  },

  addTodo(text, due = null) {
    const t = { id: uid(), text: text.trim(), done: false, due, createdAt: now() };
    update((s) => ({ ...s, todos: [...s.todos, t] }));
  },
  toggleTodo(id) {
    update((s) => ({ ...s, todos: s.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) }));
  },
  deleteTodo(id) {
    update((s) => ({ ...s, todos: s.todos.filter((t) => t.id !== id) }));
  },
  clearDoneTodos() {
    update((s) => ({ ...s, todos: s.todos.filter((t) => !t.done) }));
  },

  addGoal(title) {
    const g = { id: uid(), title: title.trim(), steps: [], createdAt: now() };
    update((s) => ({ ...s, goals: [...s.goals, g] }));
  },
  deleteGoal(id) {
    update((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) }));
  },
  addStep(goalId, text) {
    const step = { id: uid(), text: text.trim(), done: false };
    update((s) => ({ ...s, goals: s.goals.map((g) => (g.id === goalId ? { ...g, steps: [...g.steps, step] } : g)) }));
  },
  toggleStep(goalId, stepId) {
    update((s) => ({
      ...s,
      goals: s.goals.map((g) =>
        g.id === goalId ? { ...g, steps: g.steps.map((st) => (st.id === stepId ? { ...st, done: !st.done } : st)) } : g
      ),
    }));
  },
  deleteStep(goalId, stepId) {
    update((s) => ({
      ...s,
      goals: s.goals.map((g) => (g.id === goalId ? { ...g, steps: g.steps.filter((st) => st.id !== stepId) } : g)),
    }));
  },
};

// ── Pre-nursing: prerequisites & applications ───────────────────────────────
export const GRADE_POINTS = { "A": 4, "A-": 3.7, "B+": 3.3, "B": 3, "B-": 2.7, "C+": 2.3, "C": 2, "C-": 1.7, "D+": 1.3, "D": 1, "F": 0 };

export const COMMON_PREREQS = [
  ["Anatomy & Physiology I", 4], ["Anatomy & Physiology II", 4], ["Microbiology", 4],
  ["General Chemistry", 4], ["Statistics", 3], ["Intro to Psychology", 3],
  ["Lifespan Development", 3], ["Nutrition", 3], ["English Composition", 3],
];

export const APPLICATION_STATUSES = ["Planning", "Applied", "Interview", "Accepted", "Waitlisted", "Not accepted"];

const DEFAULT_REQUIREMENTS = [
  "Official transcripts", "TEAS / HESI A2 score", "Personal statement", "Recommendation letters",
  "CPR / BLS certification", "Immunization records", "Background check", "Application fee",
];

/** Credit-weighted GPA of finished courses that have a grade. */
export function gpa(courses) {
  const graded = courses.filter((c) => c.status === "done" && c.grade in GRADE_POINTS && c.credits > 0);
  const credits = graded.reduce((n, c) => n + Number(c.credits), 0);
  if (!credits) return null;
  return graded.reduce((n, c) => n + GRADE_POINTS[c.grade] * c.credits, 0) / credits;
}

Object.assign(actions, {
  setTrack(track) {
    update((s) => ({ ...s, settings: { ...s.settings, track } }));
  },
  addCourse(name, credits = 3) {
    const c = { id: uid(), name: name.trim(), credits, grade: "", status: "planned" };
    update((s) => ({ ...s, courses: [...s.courses, c] }));
  },
  addCommonPrereqs() {
    update((s) => {
      const have = new Set(s.courses.map((c) => c.name.toLowerCase()));
      const add = COMMON_PREREQS.filter(([n]) => !have.has(n.toLowerCase()))
        .map(([name, credits]) => ({ id: uid(), name, credits, grade: "", status: "planned" }));
      return { ...s, courses: [...s.courses, ...add] };
    });
  },
  updateCourse(id, patch) {
    update((s) => ({ ...s, courses: patchIn(s.courses, id, patch) }));
  },
  deleteCourse(id) {
    update((s) => ({ ...s, courses: s.courses.filter((c) => c.id !== id) }));
  },

  addApplication(school, deadline) {
    const app = {
      id: uid(), school: school.trim(), deadline: deadline || null, status: "Planning",
      reqs: DEFAULT_REQUIREMENTS.map((text) => ({ id: uid(), text, done: false })),
    };
    // Reminders a week before and on the deadline day (9 AM), if still ahead.
    const reminders = [];
    if (deadline) {
      for (const [days, label] of [[7, "1 week left"], [0, "due today"]]) {
        const at = new Date(`${deadline}T09:00`);
        at.setDate(at.getDate() - days);
        if (at > new Date()) {
          reminders.push({ id: uid(), text: `${app.school} application — ${label}`, at: at.toISOString(), subjectId: null, done: false, notified: false, createdAt: now() });
        }
      }
    }
    update((s) => ({ ...s, applications: [...s.applications, app], reminders: [...s.reminders, ...reminders] }));
  },
  updateApplication(id, patch) {
    update((s) => ({ ...s, applications: patchIn(s.applications, id, patch) }));
  },
  toggleRequirement(appId, reqId) {
    update((s) => ({
      ...s,
      applications: s.applications.map((a) =>
        a.id === appId ? { ...a, reqs: a.reqs.map((r) => (r.id === reqId ? { ...r, done: !r.done } : r)) } : a
      ),
    }));
  },
  addRequirement(appId, text) {
    update((s) => ({
      ...s,
      applications: s.applications.map((a) => (a.id === appId ? { ...a, reqs: [...a.reqs, { id: uid(), text: text.trim(), done: false }] } : a)),
    }));
  },
  deleteApplication(id) {
    update((s) => ({ ...s, applications: s.applications.filter((a) => a.id !== id) }));
  },
});

export const goalProgress = (g) =>
  g.steps.length ? Math.round((g.steps.filter((s) => s.done).length / g.steps.length) * 100) : 0;
