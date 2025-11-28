import { LogEntry } from "../types";
import { useMultiVest } from "../hooks/useMultiVest";
import { useState, useMemo } from "react";

type Props = {
  logs: LogEntry[];
};

// Color palette for devices/players
const COLORS = [
  "bg-blue-500/20 text-blue-300 border-blue-500/50",
  "bg-green-500/20 text-green-300 border-green-500/50",
  "bg-purple-500/20 text-purple-300 border-purple-500/50",
  "bg-yellow-500/20 text-yellow-300 border-yellow-500/50",
  "bg-pink-500/20 text-pink-300 border-pink-500/50",
  "bg-cyan-500/20 text-cyan-300 border-cyan-500/50",
  "bg-orange-500/20 text-orange-300 border-orange-500/50",
  "bg-indigo-500/20 text-indigo-300 border-indigo-500/50",
];

function getColorForId(id: string | undefined, colors: string[]): string {
  if (!id) return "";
  // Simple hash function to get consistent color for same ID
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function LogPanel({ logs }: Props) {
  const { devices, players, mainDeviceId } = useMultiVest();
  const [filter, setFilter] = useState<string>("all");

  // Build filter options
  const filterOptions = useMemo(() => {
    const options: Array<{ value: string; label: string }> = [
      { value: "all", label: "All Events" },
    ];

    // Add main device option
    if (mainDeviceId) {
      const mainDevice = devices.find(d => d.device_id === mainDeviceId);
      options.push({
        value: `device:${mainDeviceId}`,
        label: `Main Device${mainDevice?.serial_number ? ` (${mainDevice.serial_number})` : ""}`,
      });
    }

    // Add all devices
    devices.forEach(device => {
      if (device.device_id !== mainDeviceId) {
        options.push({
          value: `device:${device.device_id}`,
          label: device.serial_number || `Device ${device.device_id.slice(-6)}`,
        });
      }
    });

    // Add all players
    players.forEach(player => {
      options.push({
        value: `player:${player.player_id}`,
        label: player.name || player.player_id,
      });
    });

    return options;
  }, [devices, players, mainDeviceId]);

  // Filter logs based on selected filter
  const filteredLogs = useMemo(() => {
    if (filter === "all") {
      return logs;
    }

    if (filter.startsWith("device:")) {
      const deviceId = filter.replace("device:", "");
      return logs.filter(log => log.device_id === deviceId);
    }

    if (filter.startsWith("player:")) {
      const playerId = filter.replace("player:", "");
      return logs.filter(log => log.player_id === playerId);
    }

    return logs;
  }, [logs, filter]);

  // Get device/player info for display
  const getDeviceInfo = (deviceId?: string) => {
    if (!deviceId) return null;
    const device = devices.find(d => d.device_id === deviceId);
    if (!device) return { id: deviceId, name: `Device ${deviceId.slice(-6)}`, isMain: false };
    return {
      id: deviceId,
      name: device.serial_number || `Device ${deviceId.slice(-6)}`,
      isMain: device.is_main,
    };
  };

  const getPlayerInfo = (playerId?: string) => {
    if (!playerId) return null;
    const player = players.find(p => p.player_id === playerId);
    if (!player) return { id: playerId, name: playerId };
    return {
      id: playerId,
      name: player.name || playerId,
    };
  };

  return (
    <section className="rounded-2xl bg-slate-800/80 p-4 shadow-lg ring-1 ring-white/5">
      <header className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-400">Logs</p>
            <h2 className="text-xl font-semibold text-white">Command History</h2>
          </div>
          {filterOptions.length > 1 && (
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {filterOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </div>
        {filter !== "all" && (
          <p className="text-xs text-slate-400">
            Showing {filteredLogs.length} of {logs.length} events
          </p>
        )}
      </header>

      <div className="max-h-80 overflow-y-auto pr-2">
        {filteredLogs.length === 0 && (
          <p className="text-sm text-slate-400">
            {filter === "all" 
              ? "No events yet. Trigger an effect to begin logging."
              : "No events match the selected filter."}
          </p>
        )}
        <ul className="space-y-2">
          {filteredLogs.map((log) => {
            const deviceInfo = getDeviceInfo(log.device_id);
            const playerInfo = getPlayerInfo(log.player_id);
            const deviceColor = getColorForId(log.device_id, COLORS);
            const playerColor = getColorForId(log.player_id, COLORS);

            return (
              <li
                key={log.id}
                className={`rounded-lg px-3 py-2 text-sm ${
                  log.level === "error" 
                    ? "bg-rose-500/10 text-rose-100" 
                    : "bg-white/5 text-slate-100"
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <p className="font-medium">{log.message}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <p className="text-xs text-slate-400">
                        {new Date(log.ts).toLocaleTimeString()}
                      </p>
                      {deviceInfo && (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded border ${deviceColor}`}>
                          {deviceInfo.isMain ? "⭐ " : ""}
                          {deviceInfo.name}
                        </span>
                      )}
                      {playerInfo && (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded border ${playerColor}`}>
                          👤 {playerInfo.name}
                        </span>
                      )}
                      {log.game_id && log.player_num !== undefined && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded bg-purple-500/20 text-purple-300 border border-purple-500/50">
                          🎮 {log.game_id} - Player {log.player_num}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
