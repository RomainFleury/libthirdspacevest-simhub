/**
 * MultiVestDebugPanel - Collapsible panel for quick multi-vest management in Debug page.
 */

import React, { useState } from "react";
import { useMultiVest } from "../hooks/useMultiVest";
import { VestCard } from "./VestCard";

export const MultiVestDebugPanel: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { devices, mainDeviceId, loading, setMainDevice, disconnectDevice } = useMultiVest();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Multi-Vest Management
          </h3>
          {devices.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
              {devices.length} {devices.length === 1 ? 'device' : 'devices'}
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
          {devices.length === 0 ? (
            <p className="py-4 text-sm text-gray-600 dark:text-gray-400 text-center">
              No devices connected. Use the Vests page to connect devices.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
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
        </div>
      )}
    </div>
  );
};

