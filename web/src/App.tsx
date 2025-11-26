import { DeviceSelector } from "./components/DeviceSelector";
import { EffectControls } from "./components/EffectControls";
import { LogPanel } from "./components/LogPanel";
import { StatusPanel } from "./components/StatusPanel";
import { CS2IntegrationPanel } from "./components/CS2IntegrationPanel";
import { AlyxIntegrationPanel } from "./components/AlyxIntegrationPanel";
import { SuperHotIntegrationPanel } from "./components/SuperHotIntegrationPanel";
import { useVestDebugger } from "./hooks/useVestDebugger";
// @ts-ignore-next-line
import vestLogo from "./assets/vest-logo-color.png";

function App() {
  const {
    status,
    actuators,
    combined,
    logs,
    loading,
    activeCells,
    refreshStatus,
    sendEffect,
    haltAll,
  } = useVestDebugger();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <div className="flex items-center gap-4">
            <img
              src={vestLogo}
              alt="Third Space Vest"
              className="h-16 w-16 text-blue-400"
            />
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-blue-400">
                Third Space Vest
              </p>
              <h1 className="text-4xl font-bold text-white">
                Debugger Console
              </h1>
            </div>
          </div>
          <p className="mt-2 text-slate-400">
            Monitor USB connectivity, fire individual actuators, and inspect
            command logs.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-5">
          <div className="md:col-span-2 space-y-6">
            <DeviceSelector disabled={loading} />
            <StatusPanel
              status={status}
              onRefresh={refreshStatus}
              disabled={loading}
            />
          </div>
          <div className="md:col-span-3">
            <EffectControls
              actuators={actuators}
              combined={combined}
              activeCells={activeCells}
              onSend={sendEffect}
              onStopAll={haltAll}
              disabled={loading}
            />
          </div>
        </div>

        {/* Game Integrations */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <CS2IntegrationPanel />
          <AlyxIntegrationPanel />
          <SuperHotIntegrationPanel />
        </div>

        <LogPanel logs={logs} />
      </div>
    </div>
  );
}

export default App;
