/**
 * VestsPage - Multi-vest management page.
 */

import React from "react";
import { useMultiVest } from "../hooks/useMultiVest";
import { VestCard } from "../components/VestCard";

export const VestsPage: React.FC = () => {
  const {
    devices,
    mainDeviceId,
    loading,
    error,
    fetchDevices,
    setMainDevice,
    disconnectDevice,
    createMockDevice,
    removeMockDevice,
  } = useMultiVest();

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Multi-Vest Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage multiple vests and mock devices for testing
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
          <div className="flex gap-2">
            <button
              onClick={createMockDevice}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded transition-colors"
              title="Add a mock device for testing (max 20)"
            >
              + Add Mock Vest
            </button>
            <button
              onClick={fetchDevices}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {devices.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 border border-gray-200 dark:border-gray-700 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              No devices connected. Use the device selector in the sidebar to connect a device.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map(device => {
              const isMock = device.is_mock || device.device_id?.startsWith("mock_");
              return (
                <VestCard
                  key={device.device_id}
                  device={device}
                  isMain={device.device_id === mainDeviceId}
                  onSetMain={setMainDevice}
                  onDisconnect={isMock ? () => removeMockDevice(device.device_id) : disconnectDevice}
                  loading={loading}
                />
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
};

