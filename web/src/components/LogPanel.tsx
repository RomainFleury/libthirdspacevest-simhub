import { LogEntry } from "../types";
import { useMultiVest } from "../hooks/useMultiVest";
import { useState, useMemo, useEffect } from "react";
import { getDeviceColor } from "../utils/deviceColors";
import { getPlaySoundPreference, setPlaySoundPreference } from "../utils/sound";

type Props = {
  logs: LogEntry[];
};

export function LogPanel({ logs }: Props) {
  const { devices, mainDeviceId } = useMultiVest();
  const [filter, setFilter] = useState<string>("all");
  const [playSoundOnEffect, setPlaySoundOnEffect] = useState<boolean>(() => getPlaySoundPreference());

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

    return options;
  }, [devices, mainDeviceId]);

  // Filter logs based on selected filter
  const filteredLogs = useMemo(() => {
    if (filter === "all") {
      return logs;
    }

    if (filter.startsWith("device:")) {
      const deviceId = filter.replace("device:", "");
      return logs.filter(log => log.device_id === deviceId);
    }

    return logs;
  }, [logs, filter]);

  // Get device info for display
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

  // Save preference when it changes
  useEffect(() => {
    setPlaySoundPreference(playSoundOnEffect);
  }, [playSoundOnEffect]);

  return (
    <section className="rounded-2xl bg-slate-800/80 p-4 shadow-lg ring-1 ring-white/5 flex flex-col h-full min-h-0">
      <header className="mb-3 shrink-0">
        <div className="mb-3">
          <p className="text-sm uppercase tracking-wide text-slate-400">Logs</p>
          <h2 className="text-xl font-semibold text-white">Command History</h2>
        </div>
        <div className="space-y-2">
          {filterOptions.length > 1 && (
            <div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {filterOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={playSoundOnEffect}
                onChange={(e) => setPlaySoundOnEffect(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-300">Play sound on effect</span>
            </label>
          </div>
        </div>
        {filter !== "all" && (
          <p className="text-xs text-slate-400 mt-2">
            Showing {filteredLogs.length} of {logs.length} events
          </p>
        )}
      </header>

      <div className="flex-1 overflow-y-auto pr-2 min-h-0">
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
            const deviceColor = getDeviceColor(log.device_id);

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
