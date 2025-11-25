import { EffectControls } from "./components/EffectControls";
import { LogPanel } from "./components/LogPanel";
import { StatusPanel } from "./components/StatusPanel";
import { useVestDebugger } from "./hooks/useVestDebugger";

function App() {
  const { status, effects, logs, loading, refreshStatus, sendEffect, haltAll } =
    useVestDebugger();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <p className="text-sm uppercase tracking-[0.3em] text-vest.accent">Third Space Vest</p>
          <h1 className="text-4xl font-bold text-white">Debugger Console</h1>
          <p className="mt-2 text-slate-400">
            Monitor USB connectivity, fire individual actuators, and inspect command logs.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-5">
          <div className="md:col-span-2">
            <StatusPanel status={status} onRefresh={refreshStatus} disabled={loading} />
          </div>
          <div className="md:col-span-3">
            <EffectControls
              effects={effects}
              onSend={sendEffect}
              onStopAll={haltAll}
              disabled={loading}
            />
          </div>
        </div>

        <LogPanel logs={logs} />
      </div>
    </div>
  );
}

export default App;

