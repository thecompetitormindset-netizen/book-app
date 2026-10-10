import { useEffect, useRef, useState } from "react";
import { getState, importBackup, requestPersistentStorage, storageBytes, usePersonal } from "../store/personal";
import { useAuth } from "../auth";

const kb = (b) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

/** Shows how notes are protected, with one-tap backup and restore. */
export default function BackupCard() {
  const { notes } = usePersonal();
  const { auth } = useAuth();
  const [persisted, setPersisted] = useState(null);
  const [msg, setMsg] = useState("");
  const fileRef = useRef(null);

  useEffect(() => { requestPersistentStorage().then(setPersisted); }, []);

  const download = () => {
    const blob = new Blob([JSON.stringify(getState())], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `my-notebook-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const restore = async (file) => {
    try {
      const data = JSON.parse(await file.text());
      if (!confirm("Replace everything here with this backup?")) return;
      importBackup(data);
      setMsg("Backup restored ✓");
    } catch {
      setMsg("That file isn't a notebook backup.");
    }
  };

  const row = (ok, text) => <li className="flex gap-2"><span>{ok ? "✅" : "⬜"}</span><span>{text}</span></li>;

  return (
    <section className="bg-card border border-white/10 rounded-2xl p-5 md:col-span-2">
      <h2 className="text-3xl text-white">🛟 Your notes are safe</h2>
      <ul className="my-2 text-slate-300">
        {row(true, `Saved on this device as you write (${notes.filter((n) => !n.deletedAt).length} pages, ${kb(storageBytes())})`)}
        {row(!!auth, auth ? "Backed up to your Google account — open it on any device" : "Sign in with Google (top right) to back up to your account")}
        {row(persisted, persisted ? "Browser won't clear your notes to free up space" : "Browser may clear data if the device runs out of space — keep a backup")}
        {row(true, "Torn-out pages stay in the trash for 30 days")}
      </ul>
      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={download} className="bg-white/8 hover:bg-white/14 rounded-lg px-4 py-1.5">⬇️ Download backup</button>
        <button onClick={() => fileRef.current.click()} className="bg-white/8 hover:bg-white/14 rounded-lg px-4 py-1.5">⬆️ Restore backup</button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden"
          onChange={(e) => { if (e.target.files[0]) restore(e.target.files[0]); e.target.value = ""; }} />
        {msg && <span className="text-emerald-400">{msg}</span>}
      </div>
    </section>
  );
}
