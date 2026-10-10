import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import AccountButton from "./AccountButton";

const LINKS = [
  { to: "/", label: "Today", icon: "☀️", end: true },
  { to: "/notebook", label: "Notebook", icon: "📓" },
  { to: "/planner", label: "Planner", icon: "✅" },
  { to: "/library", label: "Library", icon: "📚" },
  { to: "/discover", label: "Free Books", icon: "🌍" },
  { to: "/stats", label: "Stats", icon: "📈" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const linkClass = ({ isActive }) =>
    `flex items-center gap-1.5 text-lg py-1 px-2 rounded-lg transition-colors ${
      isActive ? "text-white bg-[#fde68a] -rotate-1 shadow-sm" : "text-slate-400 hover:text-slate-200"
    }`;

  return (
    <nav className="border-b-2 border-dashed border-white/20 bg-paper/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 text-white shrink-0 pl-8 sm:pl-6">
          <span className="text-2xl" aria-hidden>📒</span>
          <span className="font-hand font-bold text-3xl leading-none">My Notebook</span>
        </Link>

        <div className="hidden lg:flex items-center gap-1 ml-2">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
              <span aria-hidden>{l.icon}</span>{l.label}
            </NavLink>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <AccountButton />
          <button
            onClick={() => setOpen((o) => !o)}
            className="lg:hidden text-slate-400 hover:text-white p-1.5"
            aria-label="Menu"
            aria-expanded={open}
          >
            {open
              ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-white/10 bg-paper px-6 pb-4 pt-2 grid grid-cols-2 gap-1">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkClass} onClick={() => setOpen(false)}>
              <span aria-hidden>{l.icon}</span>{l.label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  );
}
