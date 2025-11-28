/**
 * VestCard - Display individual vest device information and controls.
 */

import React from "react";
import { ConnectedDevice } from "../hooks/useMultiVest";

interface VestCardProps {
  device: ConnectedDevice;
  isMain: boolean;
  onSetMain: (deviceId: string) => void;
  onDisconnect: (deviceId: string) => void;
  loading?: boolean;
}

export const VestCard: React.FC<VestCardProps> = ({
  device,
  isMain,
  onSetMain,
  onDisconnect,
  loading = false,
}) => {
  const isMock = device.is_mock || device.device_id?.startsWith("mock_");
  const deviceName = device.serial_number || `Device ${device.device_id.slice(-6)}`;
  const deviceInfo = device.bus !== undefined && device.address !== undefined
    ? `Bus ${device.bus}, Address ${device.address}`
    : isMock ? "Mock Device" : "Unknown location";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {deviceName}
            </h3>
            {isMock && (
              <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded">
                MOCK
              </span>
            )}
            {isMain && (
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                Main
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {deviceInfo}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            ID: {device.device_id}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isMain ? 'bg-green-500' : 'bg-gray-400'}`} />
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        {!isMain && (
          <button
            onClick={() => onSetMain(device.device_id)}
            disabled={loading}
            className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded transition-colors"
          >
            Set as Main
          </button>
        )}
        <button
          onClick={() => onDisconnect(device.device_id)}
          disabled={loading}
          className="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded transition-colors"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
};

