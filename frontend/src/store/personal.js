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
  settings: { noteFont: "neat" },
  updatedAt: 0,
});

const TRASH_DAYS = 30;
const escapeHtml = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Bring older saved data up to date and empty the trash after 30 days. */
function migrate(data) {
  const cutoff = new Date(Date.now() - TRASH_DAYS * 86400000).toISOString();
  return {
    ...data,
    settings: { noteFont: "neat", ...data.settings },
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

export const goalProgress = (g) =>
  g.steps.length ? Math.round((g.steps.filter((s) => s.done).length / g.steps.length) * 100) : 0;
