import { useEffect, useState } from "react";
import { actions, getState, subscribe } from "../store/personal";

const CHECK_EVERY_MS = 20000;

export const notificationsSupported = () => typeof Notification !== "undefined";

export async function askNotificationPermission() {
  if (!notificationsSupported()) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  return Notification.requestPermission();
}

async function showSystemNotification(r) {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  const options = { body: r.text, tag: r.id, icon: "/icon-192.png", requireInteraction: true };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) return reg.showNotification("⏰ Reminder", options);
  } catch { /* fall through */ }
  try { new Notification("⏰ Reminder", options); } catch { /* not allowed on this platform */ }
}

/**
 * Watches reminders while the app is open. When one comes due it shows a
 * system notification (if allowed) and returns it so the app can show a
 * sticky-note pop-up too.
 */
export default function useReminderAlerts() {
  const [due, setDue] = useState([]);

  useEffect(() => {
    const check = () => {
      const now = Date.now();
      const fresh = getState().reminders.filter((r) => !r.done && !r.notified && new Date(r.at).getTime() <= now);
      fresh.forEach((r) => {
        showSystemNotification(r);
        actions.updateReminder(r.id, { notified: true });
      });
      // Show every reminder that is due, notified, and not yet dealt with.
      setDue(getState().reminders.filter((r) => !r.done && r.notified && new Date(r.at).getTime() <= now));
    };
    check();
    const id = setInterval(check, CHECK_EVERY_MS);
    const unsub = subscribe(() => {
      const now2 = Date.now();
      setDue(getState().reminders.filter((r) => !r.done && r.notified && new Date(r.at).getTime() <= now2));
    });
    return () => { clearInterval(id); unsub(); };
  }, []);

  return due;
}
