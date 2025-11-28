import { useVestDebugger } from "../hooks/useVestDebugger";
import { StatusPanel } from "../components/StatusPanel";
import { EffectControls } from "../components/EffectControls";
import { CustomEffectPanel } from "../components/CustomEffectPanel";
import { EffectsLibraryPanel } from "../components/EffectsLibraryPanel";

export function DebugPage() {
  const {
    status,
    actuators,
    combined,
    activeCells,
    loading,
    refreshStatus,
    sendEffect,
    sendCustomCommand,
    haltAll,
  } = useVestDebugger();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-white">Debug Console</h1>
        <p className="mt-2 text-slate-400">
          Manual testing tools for the Third Space Vest.
        </p>
      </header>

      {/* Status Section */}
      <StatusPanel
        status={status}
        onRefresh={refreshStatus}
        disabled={loading}
      />

      {/* Effect Controls */}
      <div className="grid gap-6 md:grid-cols-2">
        <EffectControls
          actuators={actuators}
          combined={combined}
          activeCells={activeCells}
          onSend={sendEffect}
          onStopAll={haltAll}
          disabled={loading}
        />
        <CustomEffectPanel
          onSend={sendCustomCommand}
          disabled={loading}
        />
      </div>

      {/* Effects Library */}
      <EffectsLibraryPanel />
    </div>
  );
}

