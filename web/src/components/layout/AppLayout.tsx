import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Navigation } from "./Navigation";
import { useVestDebugger } from "../../hooks/useVestDebugger";

export function AppLayout() {
  const { logs } = useVestDebugger();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="flex h-screen">
        {/* Sidebar - Always visible */}
        <Sidebar logs={logs} />

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Navigation */}
          <Navigation />

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

