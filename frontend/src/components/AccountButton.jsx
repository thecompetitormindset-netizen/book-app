import { useEffect, useRef, useState } from "react";
import { loadGoogleClientId, loadGsi, signInWithGoogleCredential, signOut, useAuth } from "../auth";

const SYNC_LABEL = { syncing: "Saving…", saved: "Saved to your account", offline: "Offline — saved on this device" };

/** Google sign-in button, or the signed-in person's avatar + menu. */
export default function AccountButton() {
  const { auth, syncState } = useAuth();
  const [clientId, setClientId] = useState(null);
  const [error, setError] = useState("");
  const [menu, setMenu] = useState(false);
  const btnRef = useRef(null);

  useEffect(() => { loadGoogleClientId().then(setClientId); }, []);

  useEffect(() => {
    if (auth || !clientId || !btnRef.current) return;
    let cancelled = false;
    loadGsi().then((google) => {
      if (cancelled || !btnRef.current) return;
      google.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          setError("");
          try { await signInWithGoogleCredential(credential); }
          catch { setError("Sign-in failed. Try again."); }
        },
      });
      google.accounts.id.renderButton(btnRef.current, { theme: "outline", size: "medium", shape: "pill", text: "signin" });
    }).catch(() => setError("Couldn't reach Google."));
    return () => { cancelled = true; };
  }, [auth, clientId]);

  if (!auth) {
    // Without a Google client ID configured the app simply runs in
    // "this device only" mode.
    if (!clientId) return null;
    return (
      <div className="flex items-center gap-2">
        <div ref={btnRef} />
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    );
  }

  const { user } = auth;
  return (
    <div className="relative">
      <button onClick={() => setMenu((m) => !m)} className="flex items-center gap-2 rounded-full p-0.5 hover:bg-white/8" aria-label="Account">
        {user.picture
          ? <img src={user.picture} alt="" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
          : <span className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">{(user.name || user.email)[0]}</span>}
      </button>
      {menu && (
        <div className="absolute right-0 mt-2 w-64 bg-card border border-white/10 rounded-xl p-4 z-50">
          <p className="font-hand text-2xl leading-tight">{user.name}</p>
          <p className="text-sm text-slate-400 truncate">{user.email}</p>
          <p className="text-xs text-slate-500 mt-2">{SYNC_LABEL[syncState] || "Your notebook is private to you"}</p>
          <button onClick={() => { setMenu(false); signOut(); }}
            className="mt-3 w-full bg-white/8 hover:bg-white/14 rounded-lg py-1.5">Sign out</button>
        </div>
      )}
    </div>
  );
}
