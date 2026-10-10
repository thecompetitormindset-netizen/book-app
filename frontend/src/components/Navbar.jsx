import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { markWelcomeSeen } from "../utils/welcome";
import { usePersonal } from "../store/personal";
import AccountButton from "./AccountButton";

const LINKS = [
  { to: "/today", label: "Today" },
  { to: "/notebook", label: "Notebook" },
  { to: "/planner", label: "Planner" },
  { to: "/library", label: "Library" },
  { to: "/discover", label: "Free Books" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  // On the landing page, keep the bar minimal: logo + one way in.
  const landing = pathname === "/" || pathname === "/welcome";
  const { settings } = usePersonal();
  const links = settings?.track === "prenursing"
    ? [...LINKS.slice(0, 3), { to: "/prenursing", label: "Pre-nursing" }, ...LINKS.slice(3)]
    : LINKS;

  const linkClass = ({ isActive }) =>
    `py-1 px-2 border-b-2 transition-colors ${
      isActive ? "text-white border-indigo-600" : "text-slate-400 border-transparent hover:text-slate-200"
    }`;

  if (landing) {
    return (
      <nav className="border-b border-white/10 bg-paper/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <span className="font-hand text-3xl leading-none text-white">My Notebook</span>
          <div className="flex items-center gap-4">
            <Link to="/today" onClick={markWelcomeSeen} className="text-slate-400 hover:text-white">Today</Link>
            <Link to="/notebook" onClick={markWelcomeSeen} className="text-slate-400 hover:text-white">Open notebook →</Link>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="border-b border-white/10 bg-paper/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link to="/" className="text-white shrink-0">
          <span className="font-hand text-3xl leading-none">My Notebook</span>
        </Link>

        <div className="hidden md:flex items-center gap-2 ml-4">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <AccountButton />
          <button
            onClick={() => setOpen((o) => !o)}
            className="md:hidden text-slate-400 hover:text-white p-1.5"
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
        <div className="md:hidden border-t border-white/10 bg-paper px-4 pb-3 pt-2 flex flex-col items-start gap-1">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkClass} onClick={() => setOpen(false)}>
              {l.label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  );
}
