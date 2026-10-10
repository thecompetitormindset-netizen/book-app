const WELCOME_KEY = "paper_welcome_seen";

export function markWelcomeSeen() {
  try { localStorage.setItem(WELCOME_KEY, "1"); } catch { /* storage blocked */ }
}
