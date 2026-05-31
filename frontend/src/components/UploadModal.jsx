import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { uploadBook } from "../api";

export default function UploadModal({ onClose, onUploaded }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({});
  const [errors, setErrors] = useState({});

  const onDrop = useCallback((accepted) => {
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      return [...prev, ...accepted.filter((f) => !existing.has(f.name))];
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "application/epub+zip": [".epub"] },
    multiple: true,
  });

  const removeFile = (name) => setFiles((prev) => prev.filter((f) => f.name !== name));

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    const uploaded = [];

    for (const file of files) {
      try {
        const book = await uploadBook(file, (pct) =>
          setProgress((p) => ({ ...p, [file.name]: pct }))
        );
        uploaded.push(book);
        setProgress((p) => ({ ...p, [file.name]: 100 }));
      } catch (err) {
        setErrors((e) => ({
          ...e,
          [file.name]: err.response?.data?.detail || "Upload failed",
        }));
      }
    }

    setUploading(false);
    if (uploaded.length) onUploaded(uploaded);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a24] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-white font-semibold text-lg">Upload Books</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-indigo-400 bg-indigo-500/10"
                : "border-white/20 hover:border-white/40 hover:bg-white/5"
            }`}
          >
            <input {...getInputProps()} />
            <svg className="w-10 h-10 mx-auto mb-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-slate-300 font-medium">
              {isDragActive ? "Drop files here" : "Drag & drop your books here"}
            </p>
            <p className="text-slate-500 text-sm mt-1">or click to browse &mdash; PDF and EPUB supported</p>
          </div>

          {files.length > 0 && (
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {files.map((f) => (
                <li key={f.name} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2">
                  <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-slate-300 text-sm flex-1 truncate">{f.name}</span>
                  {progress[f.name] !== undefined && (
                    <span className="text-xs text-indigo-400">{progress[f.name]}%</span>
                  )}
                  {errors[f.name] && (
                    <span className="text-xs text-red-400">{errors[f.name]}</span>
                  )}
                  {!uploading && (
                    <button onClick={() => removeFile(f.name)} className="text-slate-500 hover:text-red-400 transition-colors ml-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={uploading}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!files.length || uploading}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
            >
              {uploading ? "Uploading..." : `Upload ${files.length > 0 ? files.length : ""} Book${files.length !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
