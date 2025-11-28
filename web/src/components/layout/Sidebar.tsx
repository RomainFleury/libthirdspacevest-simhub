import { DeviceSelector } from "../DeviceSelector";
import { LogPanel } from "../LogPanel";
import { LogEntry } from "../../types";

type Props = {
  logs: LogEntry[];
};

export function Sidebar({ logs }: Props) {
  return (
    <aside className="w-80 bg-slate-900/50 border-r border-slate-800 flex flex-col">
      {/* Device Selector */}
      <div className="p-4 border-b border-slate-800">
        <DeviceSelector />
      </div>

      {/* Logs - Take remaining space */}
      <div className="flex-1 overflow-hidden flex flex-col p-4">
        <div className="flex-1 overflow-y-auto">
          <LogPanel logs={logs} />
        </div>
      </div>
    </aside>
  );
}

