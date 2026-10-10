import axios from "axios";

// In dev: proxied to localhost:8000 via vite.config.js
// In prod (Vercel): VITE_API_URL points to Railway backend
const BASE = typeof __API_URL__ !== "undefined" ? __API_URL__ : "";
export const api = axios.create({ baseURL: BASE });

// Signed-in users send their session token so the backend knows whose
// notebook / planner data to read and write.
export const AUTH_KEY = "paper_auth";
api.interceptors.request.use((config) => {
  try {
    const auth = JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
    if (auth?.token) config.headers.Authorization = `Bearer ${auth.token}`;
  } catch { /* no auth */ }
  return config;
});

export const getBooks = () => api.get("/api/books").then((r) => r.data);
export const getBook = (id) => api.get(`/api/books/${id}`).then((r) => r.data);
export const uploadBook = (file, onProgress) => {
  const form = new FormData();
  form.append("file", file);
  return api.post("/api/books/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => onProgress && onProgress(Math.round((e.loaded * 100) / e.total)),
  }).then((r) => r.data);
};
export const deleteBook = (id) => api.delete(`/api/books/${id}`).then((r) => r.data);
export const regenerateSummary = (id) => api.post(`/api/books/${id}/regenerate`).then((r) => r.data);
export const scanFolder = () => api.get("/api/books/folder/scan").then((r) => r.data);
export const importFolder = () => api.post("/api/books/folder/import").then((r) => r.data);
export const getStats = () => api.get("/api/stats").then((r) => r.data);
export const updateMeta = (id, body) => api.patch(`/api/books/${id}/meta`, body).then((r) => r.data);

// ── Accounts + personal data ────────────────────────────────────────────────
export const getAuthConfig = () => api.get("/api/auth/config").then((r) => r.data);
export const googleSignIn = (credential) => api.post("/api/auth/google", { credential }).then((r) => r.data);
export const signOutApi = () => api.post("/api/auth/logout").then((r) => r.data);
export const getMyData = () => api.get("/api/me/data").then((r) => r.data);
export const putMyData = (data) => api.put("/api/me/data", { data }).then((r) => r.data);

export const API_BASE = BASE;
