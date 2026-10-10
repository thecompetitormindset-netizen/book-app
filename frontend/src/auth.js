import { useSyncExternalStore } from "react";
import { AUTH_KEY, getAuthConfig, getMyData, googleSignIn, putMyData, signOutApi } from "./api";
import { forgetUser, getState, guestData, onLocalChange, replaceAll, switchUser } from "./store/personal";

// "Sign in with Google" (Google Identity Services). We only ask Google who the
// person is (name, email, picture) — never for access to their Gmail. The
// backend verifies the Google token and returns its own session token.

function readAuth() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY) || "null"); } catch { return null; }
}

let auth = readAuth();
let syncState = "idle"; // idle | syncing | saved | offline
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());
const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

let snapshot = { auth, syncState };
const getSnapshot = () => snapshot;
function setAuthState(next) {
  if (next.auth !== undefined) auth = next.auth;
  if (next.syncState !== undefined) syncState = next.syncState;
  snapshot = { auth, syncState };
  emit();
}

export function useAuth() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

// ── Sync ───────────────────────────────────────────────────────────────────
let pushTimer = null;
function schedulePush() {
  if (!auth) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    setAuthState({ syncState: "syncing" });
    try {
      await putMyData(getState());
      setAuthState({ syncState: "saved" });
    } catch {
      setAuthState({ syncState: "offline" });
    }
  }, 1200);
}
onLocalChange(schedulePush);
// Came back online → push anything written while offline.
if (typeof window !== "undefined") window.addEventListener("online", () => auth && pull());

/** Pull the server copy; whichever side was edited most recently wins. */
async function pull({ carryOverGuest = false } = {}) {
  setAuthState({ syncState: "syncing" });
  try {
    const { data } = await getMyData();
    const local = getState();
    if (data && (data.updatedAt || 0) >= (local.updatedAt || 0)) {
      replaceAll(data);
      setAuthState({ syncState: "saved" });
    } else if (!data && carryOverGuest && !local.updatedAt) {
      // First sign-in: bring along what they wrote before signing in.
      const g = guestData();
      if (g) replaceAll({ ...g, updatedAt: Date.now() });
      await putMyData(getState());
      setAuthState({ syncState: "saved" });
    } else {
      await putMyData(local);
      setAuthState({ syncState: "saved" });
    }
  } catch (e) {
    if (e?.response?.status === 401) return signOut({ local: true });
    setAuthState({ syncState: "offline" });
  }
}

// Restore the signed-in notebook on page load.
if (auth?.user) {
  switchUser(auth.user.id);
  pull();
}

export async function signInWithGoogleCredential(credential) {
  const res = await googleSignIn(credential);
  localStorage.setItem(AUTH_KEY, JSON.stringify(res));
  setAuthState({ auth: res });
  switchUser(res.user.id);
  await pull({ carryOverGuest: true });
}

export async function signOut({ local = false } = {}) {
  const userId = auth?.user?.id;
  clearTimeout(pushTimer);
  if (!local) {
    // Save any last edits, then end the session on the server.
    try { await putMyData(getState()); } catch { /* offline */ }
    try { await signOutApi(); } catch { /* already gone */ }
  }
  localStorage.removeItem(AUTH_KEY);
  // Shared classroom computers: don't leave this person's notes on the device.
  if (userId) forgetUser(userId);
  setAuthState({ auth: null, syncState: "idle" });
  switchUser(null);
}

// ── Google Identity Services loader ───────────────────────────────────────
let configPromise = null;
export function loadGoogleClientId() {
  configPromise ||= getAuthConfig().then((c) => c.google_client_id || null).catch(() => null);
  return configPromise;
}

let gsiPromise = null;
export function loadGsi() {
  gsiPromise ||= new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve(window.google);
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => resolve(window.google);
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return gsiPromise;
}
