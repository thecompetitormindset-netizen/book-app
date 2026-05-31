import { useState, useEffect } from "react";
import { scanFolder, importFolder } from "../api";

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FolderImportModal({ onClose, onImported }) {
  const [files, setFiles] = useState([]);
  const [folder, setFolder] = useState("");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    scanFolder()
      .then((data) => {
        setFolder(data.folder);
        setFiles(data.files);
      })
      .catch(() => setError("Could not read the books folder. Make sure the backend is running."))
      .finally(() => setLoading(false));
  }, []);

  const newFiles = files.filter((f) => !f.already_imported);

  const handleImport = async () => {
    setImporting(true);
    try {
      const result = await importFolder();
      onImported(result.books);
      onClose();
    } catch {
      setError("Import failed. Please try again.");
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a24] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
          <div>
            <h2 className="text-white font-semibold text-lg">Import from Folder</h2>
            {folder && <p className="text-slate-500 text-xs mt-0.5 truncate">{folder}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {loading && (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Scanning folder...
            </div>
          )}

          {error && <p className="text-red-400 text-sm text-center py-8">{error}</p>}

          {!loading && !error && (
            <>
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-400 text-sm">
                  {newFiles.length} new book{newFiles.length !== 1 ? "s" : ""} to import
                  {files.length - newFiles.length > 0 && (
                    <span className="text-slate-600 ml-2">
                      ({files.length - newFiles.length} already imported)
                    </span>
                  )}
                </span>
              </div>

              {files.length === 0 && (
                <p className="text-slate-500 text-center py-8">No PDF or EPUB files found in the folder.</p>
              )}

              <ul className="space-y-1.5">
                {files.map((f) => (
                  <li
                    key={f.name}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                      f.already_imported ? "opacity-40" : "bg-white/5"
                    }`}
                  >
                    <svg
                      className={`w-4 h-4 shrink-0 ${f.already_imported ? "text-slate-500" : "text-indigo-400"}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      {f.already_imported ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      )}
                    </svg>
                    <span className="flex-1 truncate text-slate-300">{f.name}</span>
                    <span className="text-slate-500 text-xs shrink-0">{formatSize(f.size)}</span>
                    <span className="text-slate-600 text-xs uppercase shrink-0">{f.format}</span>
                    {f.already_imported && (
                      <span className="text-xs text-slate-600 shrink-0">imported</span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t border-white/10 shrink-0">
          <button
            onClick={onClose}
            disabled={importing}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!newFiles.length || importing || loading}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            {importing
              ? "Importing..."
              : newFiles.length
              ? `Import ${newFiles.length} Book${newFiles.length !== 1 ? "s" : ""}`
              : "Nothing new to import"}
          </button>
        </div>
      </div>
    </div>
  );
}
