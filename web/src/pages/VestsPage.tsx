/**
 * VestsPage - Multi-vest management page.
 */

import React, { useState } from "react";
import { useMultiVest } from "../hooks/useMultiVest";
import { VestCard } from "../components/VestCard";
import { PlayerCard } from "../components/PlayerCard";

export const VestsPage: React.FC = () => {
  const {
    devices,
    players,
    mainDeviceId,
    loading,
    error,
    fetchDevices,
    fetchPlayers,
    setMainDevice,
    disconnectDevice,
    createPlayer,
    assignPlayer,
    unassignPlayer,
  } = useMultiVest();

  const [newPlayerId, setNewPlayerId] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");

  const handleCreatePlayer = async () => {
    if (!newPlayerId.trim()) {
      return;
    }
    await createPlayer(newPlayerId.trim(), newPlayerName.trim() || undefined);
    setNewPlayerId("");
    setNewPlayerName("");
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Multi-Vest Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage multiple vests and assign players to devices
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Connected Devices Section */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Connected Devices
          </h2>
          <button
            onClick={fetchDevices}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded transition-colors"
          >
            Refresh
          </button>
        </div>

        {devices.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 border border-gray-200 dark:border-gray-700 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              No devices connected. Use the device selector in the sidebar to connect a device.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map(device => (
              <VestCard
                key={device.device_id}
                device={device}
                isMain={device.device_id === mainDeviceId}
                onSetMain={setMainDevice}
                onDisconnect={disconnectDevice}
                loading={loading}
              />
            ))}
          </div>
        )}
      </section>

      {/* Global Players Section */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Global Players
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Player ID"
              value={newPlayerId}
              onChange={(e) => setNewPlayerId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreatePlayer()}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Name (optional)"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreatePlayer()}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleCreatePlayer}
              disabled={loading || !newPlayerId.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded transition-colors"
            >
              Create Player
            </button>
            <button
              onClick={fetchPlayers}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {players.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 border border-gray-200 dark:border-gray-700 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              No players created. Create a player above to assign them to a vest.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {players.map(player => (
              <PlayerCard
                key={player.player_id}
                player={player}
                devices={devices}
                onAssign={assignPlayer}
                onUnassign={unassignPlayer}
                loading={loading}
              />
            ))}
          </div>
        )}
      </section>

    </div>
  );
};

