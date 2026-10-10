import { getState } from "../store/personal";
import { AUTH_KEY } from "../api";

const WELCOME_KEY = "paper_welcome_seen";

export function markWelcomeSeen() {
  try { localStorage.setItem(WELCOME_KEY, "1"); } catch { /* storage blocked */ }
}

/** First-time visitors see the landing page; anyone who has started doesn't. */
export function shouldShowWelcome() {
  try {
    if (localStorage.getItem(WELCOME_KEY) || localStorage.getItem(AUTH_KEY)) return false;
  } catch { return false; }
  const s = getState();
  return !(s.notes.length || s.reminders.length || s.todos.length || s.goals.length);
}
