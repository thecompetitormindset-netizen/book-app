import { actions } from "../store/personal";

const OPTIONS = [
  { id: "prenursing", title: "Pre-nursing", body: "Taking prerequisites (A&P, Micro, Chem…) and getting ready to apply." },
  { id: "nursing", title: "Nursing school", body: "In a nursing program — clinicals, meds, NCLEX prep." },
];

/** "Where are you?" — sets the track that tailors templates, quizzes and the study buddy. */
export default function TrackPicker({ current, compact = false }) {
  if (compact) {
    return (
      <div className="inline-flex rounded-lg bg-white/6 p-0.5 text-sm" role="radiogroup" aria-label="Where are you?">
        {OPTIONS.map((o) => (
          <button key={o.id} role="radio" aria-checked={current === o.id} onClick={() => actions.setTrack(o.id)}
            className={`px-2.5 py-0.5 rounded-md ${current === o.id ? "bg-card shadow-sm text-white" : "text-slate-500 hover:text-white"}`}>
            {o.title}
          </button>
        ))}
      </div>
    );
  }
  return (
    <section className="bg-card border border-white/10 rounded-2xl p-5 mb-6">
      <h2 className="text-3xl text-white">Where are you right now?</h2>
      <p className="text-slate-400 mb-3">This tailors templates, quizzes and the study buddy. You can switch any time.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {OPTIONS.map((o) => (
          <button key={o.id} onClick={() => actions.setTrack(o.id)}
            className="text-left rounded-xl border border-white/10 hover:border-indigo-500 hover:bg-white/4 p-4">
            <span className="font-hand text-3xl text-white">{o.title}</span>
            <p className="text-slate-400 text-sm">{o.body}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
