import { useEffect, useRef, useState } from "react";

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * A stack of paper you can turn like a real book.
 * Turn with the arrows, the folded corners, ← / → keys, or a swipe.
 *
 * renderPage(i, { live }) draws page i. `live` is false for the copy drawn on
 * the turning leaf, so editable pages can render a read-only version there.
 */
export default function PageFlip({ count, index, onChange, renderPage, height = "min(72vh, 680px)", label = "Page", swipe = true }) {
  const [turn, setTurn] = useState(null); // { from, to, dir }
  const touchX = useRef(null);

  const go = (to) => {
    if (turn || to < 0 || to >= count || to === index) return;
    if (reducedMotion()) return onChange(to);
    setTurn({ from: index, to, dir: to > index ? "next" : "prev" });
  };
  const goRef = useRef(go);
  const indexRef = useRef(index);
  useEffect(() => { goRef.current = go; indexRef.current = index; });

  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || document.activeElement?.isContentEditable) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") goRef.current(indexRef.current + 1);
      if (e.key === "ArrowLeft" || e.key === "PageUp") goRef.current(indexRef.current - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const finish = () => {
    onChange(turn.to);
    setTurn(null);
  };

  // While turning forward the next page is already underneath; turning back,
  // the previous page swings in over the current one.
  const under = turn ? (turn.dir === "next" ? turn.to : turn.from) : index;
  const leaf = turn ? (turn.dir === "next" ? turn.from : turn.to) : null;

  return (
    <div>
      <div
        className="book select-none"
        style={{ height }}
        onTouchStart={(e) => {
          // Don't turn the page while writing, drawing or selecting text.
          touchX.current = swipe && !e.target.closest("[contenteditable], input, svg") ? e.touches[0].clientX : null;
        }}
        onTouchEnd={(e) => {
          if (touchX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > 60) go(dx < 0 ? index + 1 : index - 1);
        }}
      >
        <div className="book-sheet paper-page overflow-hidden">
          {count > 0 && renderPage(under, { live: !turn })}
        </div>

        {turn && (
          <div className={`book-leaf ${turn.dir}`} onAnimationEnd={finish}>
            <div className="leaf-face paper-page">{renderPage(leaf, { live: false })}</div>
            <div className="leaf-face leaf-back" />
          </div>
        )}

        {index > 0 && <button className="dog-ear left" onClick={() => go(index - 1)} aria-label="Previous page" />}
        {index < count - 1 && <button className="dog-ear right" onClick={() => go(index + 1)} aria-label="Next page" />}
      </div>

      <div className="flex items-center justify-center gap-4 mt-4 text-slate-300">
        <button
          onClick={() => go(index - 1)}
          disabled={index === 0}
          className="px-3 py-1 rounded-lg bg-white/6 hover:bg-white/12 disabled:opacity-30 text-lg"
          aria-label="Previous page"
        >
          ← Back
        </button>
        <span className="font-hand text-2xl min-w-[7rem] text-center">
          {count ? `${label} ${index + 1} of ${count}` : "No pages yet"}
        </span>
        <button
          onClick={() => go(index + 1)}
          disabled={index >= count - 1}
          className="px-3 py-1 rounded-lg bg-white/6 hover:bg-white/12 disabled:opacity-30 text-lg"
          aria-label="Next page"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
