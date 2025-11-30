import { CS2IntegrationPanel } from "../components/CS2IntegrationPanel";
import { AlyxIntegrationPanel } from "../components/AlyxIntegrationPanel";
import { SuperHotIntegrationPanel } from "../components/SuperHotIntegrationPanel";
import { PistolWhipIntegrationPanel } from "../components/PistolWhipIntegrationPanel";
import { BF2SettingsPanel } from "../components/BF2SettingsPanel";

export function GamesPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Integrated Games</h1>
        <p className="mt-2 text-sm md:text-base text-slate-400">
          Manage haptic feedback integrations for supported games.
        </p>
      </header>

      {/* Game Integrations */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <CS2IntegrationPanel />
        <AlyxIntegrationPanel />
        <SuperHotIntegrationPanel />
        <PistolWhipIntegrationPanel />
      </div>

      {/* EA Battlefront 2 (2017) Settings */}
      <BF2SettingsPanel />
    </div>
  );
}

