import { useLayoutEffect, useRef, useState } from "react";

// Strokes are saved as vectors in a 1000-unit-wide space so a page of
// drawings is only a few KB and scales with the page on any screen.
const W = 1000;

function toPath(pts) {
  if (pts.length < 4) return pts.length === 2 ? `M${pts[0]} ${pts[1]}l0.1 0` : "";
  let d = `M${pts[0]} ${pts[1]}`;
  for (let i = 2; i < pts.length - 2; i += 2) {
    const mx = (pts[i] + pts[i + 2]) / 2;
    const my = (pts[i + 1] + pts[i + 3]) / 2;
    d += `Q${pts[i]} ${pts[i + 1]} ${mx} ${my}`;
  }
  return d + `L${pts[pts.length - 2]} ${pts[pts.length - 1]}`;
}

/** Tracks the element's height/width so the 1000-wide viewBox maps 1:1 onto it. */
function useAspect(ref) {
  const [aspect, setAspect] = useState(1.3);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width) setAspect(r.height / r.width);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return aspect;
}

/** Read-only drawing (used on the page while it is being turned). */
export function StaticInk({ ink }) {
  const ref = useRef(null);
  const aspect = useAspect(ref);
  return (
    <svg ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 2 }}
      viewBox={`0 0 ${W} ${W * aspect}`} preserveAspectRatio="xMinYMin meet">
      <InkStrokes ink={ink} />
    </svg>
  );
}

function InkStrokes({ ink }) {
  return (ink || []).map((s, i) => (
    <path key={i} d={toPath(s.p)} stroke={s.c} strokeWidth={s.w} strokeOpacity={s.o || 1}
      fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ));
}

/**
 * tool: null (typing — ink is visible but not touchable), or
 * { kind: "pen" | "marker" | "eraser", color }
 */
export default function InkLayer({ ink, onChange, tool }) {
  const svgRef = useRef(null);
  const aspect = useAspect(svgRef);
  const [live, setLive] = useState(null);
  const drawing = useRef(null);
  const scale = useRef(1);

  const point = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    scale.current = W / r.width;
    return [Math.round((e.clientX - r.left) * scale.current), Math.round((e.clientY - r.top) * scale.current)];
  };

  const eraseAt = ([x, y]) => {
    const hit = (ink || []).findIndex((s) => {
      for (let i = 0; i < s.p.length; i += 2) {
        if (Math.hypot(s.p[i] - x, s.p[i + 1] - y) < 12 + s.w / 2) return true;
      }
      return false;
    });
    if (hit >= 0) onChange(ink.filter((_, i) => i !== hit));
  };

  const down = (e) => {
    if (!tool) return;
    e.preventDefault();
    svgRef.current.setPointerCapture(e.pointerId);
    const p = point(e);
    if (tool.kind === "eraser") { drawing.current = "erase"; eraseAt(p); return; }
    const marker = tool.kind === "marker";
    drawing.current = { c: tool.color, w: marker ? 16 : e.pointerType === "pen" ? 2.5 : 3, ...(marker ? { o: 0.4 } : {}), p };
    setLive({ ...drawing.current });
  };
  const move = (e) => {
    const d = drawing.current;
    if (!d) return;
    const p = point(e);
    if (d === "erase") return eraseAt(p);
    const [lx, ly] = d.p.slice(-2);
    if (Math.hypot(p[0] - lx, p[1] - ly) < 2) return; // skip tiny moves to keep strokes small
    d.p = [...d.p, ...p];
    setLive({ ...d });
  };
  const up = () => {
    const d = drawing.current;
    drawing.current = null;
    if (d && d !== "erase") onChange([...(ink || []), d]);
    setLive(null);
  };

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: tool ? "auto" : "none", touchAction: tool ? "none" : "auto", cursor: tool ? (tool.kind === "eraser" ? "cell" : "crosshair") : "auto", zIndex: 2 }}
      viewBox={`0 0 ${W} ${W * aspect}`}
      preserveAspectRatio="xMinYMin meet"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <InkStrokes ink={ink} />
      {live && <InkStrokes ink={[live]} />}
    </svg>
  );
}
