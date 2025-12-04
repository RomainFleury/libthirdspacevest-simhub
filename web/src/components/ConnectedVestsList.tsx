/**
 * ConnectedVestsList - Compact list of connected vests in sidebar.
 */

import React, { useState } from "react";
import { useMultiVest, ConnectedDevice } from "../hooks/useMultiVest";
import { getDeviceDotColor, getDeviceBorderFromColor } from "../utils/deviceColors";

export function ConnectedVestsList() {
  const { devices, mainDeviceId, loading, setMainDevice, disconnectDevice, fetchDevices } = useMultiVest();
  const [expandedDevice, setExpandedDevice] = useState<string | null>(null);

  if (devices.length === 0) {
    return (
      <div className="p-3 border-b border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-300">Connected Vests</h3>
          <button
            onClick={fetchDevices}
            disabled={loading}
            className="text-xs text-slate-400 hover:text-slate-200 disabled:opacity-50"
            title="Refresh"
          >
            ↻
          </button>
        </div>
        <p className="text-xs text-slate-500">No devices connected</p>
      </div>
    );
  }

  const toggleExpand = (deviceId: string) => {
    setExpandedDevice(expandedDevice === deviceId ? null : deviceId);
  };

  return (
    <div className="p-3 border-b border-slate-800">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-300">Connected Vests</h3>
        <button
          onClick={fetchDevices}
          disabled={loading}
          className="text-xs text-slate-400 hover:text-slate-200 disabled:opacity-50"
          title="Refresh"
        >
          ↻
        </button>
      </div>
      <div className="space-y-1">
        {devices.map(device => {
          const isMain = device.device_id === mainDeviceId;
          const isExpanded = expandedDevice === device.device_id;
          const deviceName = device.serial_number || `Device ${device.device_id.slice(-6)}`;

          return (
            <div
              key={device.device_id}
              className={`rounded-md border-2 ${getDeviceBorderFromColor(device.device_id)} bg-slate-800/50 hover:bg-slate-800 transition-colors`}
            >
              <button
                onClick={() => toggleExpand(device.device_id)}
                className="w-full px-2 py-1.5 flex items-center gap-2 text-left"
              >
                <div className={`w-2 h-2 rounded-full ${isMain ? 'bg-green-500' : getDeviceDotColor(device.device_id)}`} />
                <span className="flex-1 text-xs text-slate-300 truncate">
                  {isMain && <span className="text-yellow-400 mr-1">⭐</span>}
                  {deviceName}
                </span>
                <svg
                  className={`w-3 h-3 text-slate-500 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div className="px-2 pb-2 pt-1 border-t border-slate-700 space-y-1">
                  <div className="text-xs text-slate-400">
                    {device.bus !== undefined && device.address !== undefined && (
                      <div>Bus {device.bus}, Addr {device.address}</div>
                    )}
                    <div className="font-mono text-slate-500">ID: {device.device_id.slice(-8)}</div>
                  </div>
                  <div className="flex gap-1 pt-1">
                    {!isMain && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMainDevice(device.device_id);
                        }}
                        disabled={loading}
                        className="flex-1 px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded transition-colors"
                        title="Set as main device"
                      >
                        Set Main
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        disconnectDevice(device.device_id);
                      }}
                      disabled={loading}
                      className="flex-1 px-2 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded transition-colors"
                      title="Disconnect device"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

