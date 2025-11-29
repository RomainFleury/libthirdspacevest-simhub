/**
 * PlayerCard - Display player assignment and allow reassignment.
 */

import React from "react";
import { Player, ConnectedDevice } from "../hooks/useMultiVest";

interface PlayerCardProps {
  player: Player;
  devices: ConnectedDevice[];
  onAssign: (playerId: string, deviceId: string) => void;
  onUnassign: (playerId: string) => void;
  loading?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  devices,
  onAssign,
  onUnassign,
  loading = false,
}) => {
  const assignedDevice = devices.find(d => d.device_id === player.device_id);
  const playerName = player.name || player.player_id;

  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deviceId = e.target.value;
    if (deviceId === "none") {
      onUnassign(player.player_id);
    } else {
      onAssign(player.player_id, deviceId);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {playerName}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            ID: {player.player_id}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Assigned Device
        </label>
        <select
          value={player.device_id || "none"}
          onChange={handleDeviceChange}
          disabled={loading}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="none">None (uses main device)</option>
          {devices.map(device => (
            <option key={device.device_id} value={device.device_id}>
              {device.serial_number || `Device ${device.device_id.slice(-6)}`}
              {device.is_main ? " (Main)" : ""}
            </option>
          ))}
        </select>
        {assignedDevice && (
          <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            Currently assigned to: {assignedDevice.serial_number || `Device ${assignedDevice.device_id.slice(-6)}`}
          </p>
        )}
      </div>
    </div>
  );
};

