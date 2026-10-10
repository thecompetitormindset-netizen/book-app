import { actions } from "../store/personal";
import useReminderAlerts from "../hooks/useReminderAlerts";
import { friendlyWhen } from "../utils/dates";

export default function ReminderToasts() {
  const due = useReminderAlerts();
  if (!due.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-3 w-[min(92vw,320px)]" role="status" aria-live="polite">
      {due.slice(0, 3).map((r) => (
        <div key={r.id} className="sticky-note rounded-sm p-4">
          <p className="font-hand text-2xl leading-tight mb-1">⏰ {r.text}</p>
          <p className="text-sm text-slate-400 mb-3">
            {friendlyWhen(r.at)}
          </p>
          <div className="flex gap-2">
            <button onClick={() => actions.updateReminder(r.id, { done: true })}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 rounded-lg py-1.5">Done ✓</button>
            <button onClick={() => actions.snoozeReminder(r.id, 10)}
              className="flex-1 bg-white/8 hover:bg-white/14 rounded-lg py-1.5">Snooze 10 min</button>
          </div>
        </div>
      ))}
      {due.length > 3 && <p className="text-right text-sm text-slate-400">+{due.length - 3} more in Planner</p>}
    </div>
  );
}
