/** Value for <input type="datetime-local"> in local time. */
export function toLocalInput(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function tomorrowAt(hour) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  return d;
}

export function todayAt(hour) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  if (d <= new Date()) d.setDate(d.getDate() + 1);
  return d;
}

export const inMinutes = (m) => new Date(Date.now() + m * 60000);

/** "in 2 hours", "tomorrow 8:00 AM", "3 hours ago" … */
export function friendlyWhen(iso) {
  const d = new Date(iso);
  const diff = d.getTime() - Date.now();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const mins = Math.round(Math.abs(diff) / 60000);
  if (diff < 0) {
    if (mins < 60) return `${mins} min ago`;
    if (mins < 60 * 24) return `${Math.round(mins / 60)} h ago`;
    return d.toLocaleDateString([], { month: "short", day: "numeric" }) + ` ${time}`;
  }
  if (mins < 60) return `in ${mins} min`;
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const days = Math.floor((d - start) / 86400000);
  if (days === 0) return `today ${time}`;
  if (days === 1) return `tomorrow ${time}`;
  if (days < 7) return d.toLocaleDateString([], { weekday: "long" }) + ` ${time}`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) + ` ${time}`;
}

export const todayISODate = () => toLocalInput(new Date()).slice(0, 10);
