import { NavLink } from "react-router-dom";

export function Navigation() {
  return (
    <nav className="bg-slate-800/80 border-b border-slate-700 px-6">
      <div className="flex gap-1">
        <NavLink
          to="/games"
          className={({ isActive }) =>
            `px-4 py-3 text-sm font-medium transition-colors ${
              isActive
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-slate-400 hover:text-slate-200"
            }`
          }
        >
          Games
        </NavLink>
        <NavLink
          to="/debug"
          className={({ isActive }) =>
            `px-4 py-3 text-sm font-medium transition-colors ${
              isActive
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-slate-400 hover:text-slate-200"
            }`
          }
        >
          Debug
        </NavLink>
        <NavLink
          to="/mini-games"
          className={({ isActive }) =>
            `px-4 py-3 text-sm font-medium transition-colors ${
              isActive
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-slate-400 hover:text-slate-200"
            }`
          }
        >
          Mini-Games
        </NavLink>
      </div>
    </nav>
  );
}

