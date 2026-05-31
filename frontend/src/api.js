import axios from "axios";

// In dev: proxied to localhost:8000 via vite.config.js
// In prod (Vercel): VITE_API_URL points to Railway backend
const BASE = typeof __API_URL__ !== "undefined" ? __API_URL__ : "";
const api = axios.create({ baseURL: BASE });

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

export const API_BASE = BASE;
