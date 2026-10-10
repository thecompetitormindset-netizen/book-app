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

  const synced = !!auth;
  const pages = notes.filter((n) => !n.deletedAt).length;
  return (
    <section className="md:col-span-2 text-sm text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1 pt-2">
      <span>
        ✓ {synced ? "Saved to your Google account" : "Saved on this device"} · {pages} page{pages === 1 ? "" : "s"} · {kb(storageBytes())}
        {!synced && persisted === false && " · sign in or keep a backup so nothing is lost"}
      </span>
      <button onClick={download} className="hover:text-white underline-offset-2 hover:underline">Download backup</button>
      <button onClick={() => fileRef.current.click()} className="hover:text-white underline-offset-2 hover:underline">Restore</button>
      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden"
        onChange={(e) => { if (e.target.files[0]) restore(e.target.files[0]); e.target.value = ""; }} />
      {msg && <span className="text-emerald-400">{msg}</span>}
    </section>
  );
}
