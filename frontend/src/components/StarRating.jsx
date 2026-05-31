import { useState } from "react";

export default function StarRating({ value = 0, onChange, size = "md", readonly = false }) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;

  const sz = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-7 h-7" : "w-5 h-5";

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange && onChange(star === value ? 0 : star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={`${sz} transition-colors ${readonly ? "cursor-default" : "cursor-pointer"}`}
          title={readonly ? `${value} stars` : `Rate ${star} star${star !== 1 ? "s" : ""}`}
        >
          <svg
            viewBox="0 0 20 20"
            fill={star <= active ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={1.5}
            className={
              star <= active
                ? "text-amber-400"
                : "text-slate-600 hover:text-slate-500"
            }
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
            />
          </svg>
        </button>
      ))}
    </div>
  );
}
