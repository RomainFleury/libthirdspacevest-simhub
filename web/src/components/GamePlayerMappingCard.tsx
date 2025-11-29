/**
 * GamePlayerMappingCard - Display and manage game-specific player mappings.
 */

import React from "react";
import { ConnectedDevice } from "../hooks/useMultiVest";
import { useGamePlayerMapping } from "../hooks/useGamePlayerMapping";

interface GamePlayerMappingCardProps {
  gameId: string;
  gameName: string;
  maxPlayers?: number;
  devices: ConnectedDevice[];
}

export const GamePlayerMappingCard: React.FC<GamePlayerMappingCardProps> = ({
  gameId,
  gameName,
  maxPlayers = 4,
  devices,
}) => {
  const { mappings, loading, error, setMapping, clearMapping, getDeviceForPlayer } = useGamePlayerMapping(gameId);

  const handlePlayerMappingChange = async (playerNum: number, deviceId: string) => {
    if (deviceId === "none") {
      await clearMapping(playerNum);
    } else {
      await setMapping(playerNum, deviceId);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          {gameName} - Player Mapping
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configure which vest each player uses for this game
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {Array.from({ length: maxPlayers }, (_, i) => i + 1).map(playerNum => {
          const currentDeviceId = getDeviceForPlayer(playerNum);
          const currentDevice = devices.find(d => d.device_id === currentDeviceId);

          return (
            <div key={playerNum} className="flex items-center gap-3">
              <label className="w-20 text-sm font-medium text-gray-700 dark:text-gray-300">
                Player {playerNum}:
              </label>
              <select
                value={currentDeviceId || "none"}
                onChange={(e) => handlePlayerMappingChange(playerNum, e.target.value)}
                disabled={loading}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="none">Main Device (default)</option>
                {devices.map(device => (
                  <option key={device.device_id} value={device.device_id}>
                    {device.serial_number || `Device ${device.device_id.slice(-6)}`}
                    {device.is_main ? " (Main)" : ""}
                  </option>
                ))}
              </select>
              {currentDevice && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {currentDevice.serial_number || `Device ${currentDevice.device_id.slice(-6)}`}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {mappings.length > 0 && (
        <button
          onClick={() => clearMapping()}
          disabled={loading}
          className="mt-4 w-full px-3 py-2 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded transition-colors"
        >
          Clear All Mappings
        </button>
      )}
    </div>
  );
};

