import { useEffect, useState } from "react";
import {
  clearDevicePreference,
  connectToDevice,
  getDevicePreference,
  listDevices,
  saveDevicePreference,
} from "../lib/bridgeApi";
import { VestDevice } from "../types";

type Props = {
  onDeviceChange?: (device: VestDevice | null) => void;
  disabled?: boolean;
};

export function DeviceSelector({ onDeviceChange, disabled }: Props) {
  const [devices, setDevices] = useState<VestDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<VestDevice | null>(null);
  const [preferredDevice, setPreferredDevice] = useState<Partial<VestDevice> | null>(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Format device label for display
  const formatDeviceLabel = (device: VestDevice): string => {
    if (device.serial_number && device.serial_number !== "sorry-bro") {
      return `Serial: ${device.serial_number}`;
    }
    return `Bus ${device.bus}, Address ${device.address}`;
  };

  // Check if device matches preference
  const deviceMatches = (device: VestDevice, pref: Partial<VestDevice> | null): boolean => {
    if (!pref) return false;
    
    // Match by serial number (preferred)
    if (pref.serial_number && device.serial_number === pref.serial_number) {
      return true;
    }
    
    // Match by bus + address
    if (pref.bus !== undefined && pref.address !== undefined) {
      return device.bus === pref.bus && device.address === pref.address;
    }
    
    return false;
  };

  // Load devices and preference
  const loadDevices = async () => {
    setLoading(true);
    setError(null);
    try {
      const [deviceList, preference] = await Promise.all([
        listDevices(),
        getDevicePreference(),
      ]);
      
      setDevices(deviceList);
      setPreferredDevice(preference);
      
      // Auto-select device: try preferred first, then fallback to first device
      let deviceToSelect: VestDevice | null = null;
      
      if (preference) {
        const matchingDevice = deviceList.find((d) => deviceMatches(d, preference));
        if (matchingDevice) {
          deviceToSelect = matchingDevice;
        }
      }
      
      // Fallback to first device if no preference match
      if (!deviceToSelect && deviceList.length > 0) {
        deviceToSelect = deviceList[0];
      }
      
      if (deviceToSelect) {
        setSelectedDevice(deviceToSelect);
        onDeviceChange?.(deviceToSelect);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load devices");
    } finally {
      setLoading(false);
    }
  };

  // Connect to selected device
  const handleConnect = async () => {
    if (!selectedDevice) return;
    
    setConnecting(true);
    setError(null);
    try {
      const deviceInfo: Partial<VestDevice> = {
        bus: selectedDevice.bus,
        address: selectedDevice.address,
        serial_number: selectedDevice.serial_number || undefined,
      };
      
      const status = await connectToDevice(deviceInfo);
      
      if (status.connected) {
        await saveDevicePreference(deviceInfo);
        setPreferredDevice(deviceInfo);
        onDeviceChange?.(selectedDevice);
      } else {
        setError(status.last_error || "Failed to connect to device");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setConnecting(false);
    }
  };

  // Clear preference
  const handleClearPreference = async () => {
    try {
      await clearDevicePreference();
      setPreferredDevice(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear preference");
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const isPreferred = selectedDevice && preferredDevice && deviceMatches(selectedDevice, preferredDevice);

  return (
    <div className="rounded-2xl bg-slate-800/80 p-4 shadow-lg ring-1 ring-white/5">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-400">
            Device Selection
          </p>
          <h2 className="text-xl font-semibold text-white">USB Vest</h2>
        </div>
        <button
          type="button"
          onClick={loadDevices}
          disabled={loading || disabled}
          className="rounded-lg border border-white/20 px-3 py-1 text-sm text-white hover:bg-white/10 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </header>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Setup warning for fake device */}
      {devices.some((d) => d.serial_number === "sorry-bro") && (
        <div className="mb-4 rounded-lg border-2 border-amber-500/50 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-amber-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-300">
                Setup Issue Detected
              </h3>
              <p className="mt-1 text-sm text-amber-200/90">
                PyUSB is not installed or not available. The device list shows a
                fake device indicator. Please install PyUSB to detect and
                connect to real USB vest devices.
              </p>
              <p className="mt-2 text-xs text-amber-200/70">
                See <code className="rounded bg-amber-500/20 px-1 py-0.5">modern-third-space/README.md</code> for
                installation instructions.
              </p>
            </div>
          </div>
        </div>
      )}

      {devices.length === 0 ? (
        <div className="text-center py-4 text-slate-400">
          {loading ? "Scanning for devices..." : "No devices found"}
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Select Device
            </label>
            <select
              value={
                selectedDevice
                  ? selectedDevice.serial_number && selectedDevice.serial_number !== "sorry-bro"
                    ? selectedDevice.serial_number
                    : `${selectedDevice.bus}-${selectedDevice.address}`
                  : ""
              }
              onChange={(e) => {
                const value = e.target.value;
                // Try to find by serial number first, then by bus-address
                const device = devices.find(
                  (d) => 
                    (d.serial_number && d.serial_number !== "sorry-bro" && d.serial_number === value) ||
                    (`${d.bus}-${d.address}` === value)
                );
                if (device) {
                  setSelectedDevice(device);
                  onDeviceChange?.(device);
                }
              }}
              disabled={disabled || loading}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-vest-accent/40 focus:outline-none focus:ring-2 focus:ring-vest-accent/20 disabled:opacity-50"
            >
              {devices.map((device, index) => {
                // Use serial_number as key/value if available, otherwise use bus-address, fallback to index
                const key = device.serial_number && device.serial_number !== "sorry-bro"
                  ? device.serial_number
                  : (device.bus !== null && device.bus !== undefined && device.address !== null && device.address !== undefined)
                    ? `${device.bus}-${device.address}`
                    : `device-${index}`;
                const value = device.serial_number && device.serial_number !== "sorry-bro"
                  ? device.serial_number
                  : (device.bus !== null && device.bus !== undefined && device.address !== null && device.address !== undefined)
                    ? `${device.bus}-${device.address}`
                    : `device-${index}`;
                
                return (
                  <option
                    key={key}
                    value={value}
                  >
                    {formatDeviceLabel(device)}
                    {device.serial_number === "sorry-bro" && " (PyUSB not installed)"}
                  </option>
                );
              })}
            </select>
          </div>

          {selectedDevice && (
            <div className="rounded-lg bg-white/5 p-3 text-sm">
              <div className="space-y-1 text-slate-300">
                <div>
                  <span className="text-slate-400">Vendor ID:</span>{" "}
                  {selectedDevice.vendor_id}
                </div>
                <div>
                  <span className="text-slate-400">Product ID:</span>{" "}
                  {selectedDevice.product_id}
                </div>
                <div>
                  <span className="text-slate-400">Bus:</span>{" "}
                  {selectedDevice.bus}
                </div>
                <div>
                  <span className="text-slate-400">Address:</span>{" "}
                  {selectedDevice.address}
                </div>
                {selectedDevice.serial_number &&
                  selectedDevice.serial_number !== "sorry-bro" && (
                    <div>
                      <span className="text-slate-400">Serial:</span>{" "}
                      {selectedDevice.serial_number}
                    </div>
                  )}
                {selectedDevice.serial_number === "sorry-bro" && (
                  <div className="text-amber-400">
                    <span className="text-slate-400">Serial:</span>{" "}
                    <span className="font-semibold">sorry-bro</span> (Fake device
                    - PyUSB not installed)
                  </div>
                )}
                {isPreferred && (
                  <div className="mt-2 text-vest-accent">
                    ✓ Saved as preferred device
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConnect}
              disabled={!selectedDevice || connecting || disabled || loading}
              className="flex-1 rounded-lg bg-vest-accent px-4 py-2 text-sm font-medium text-white hover:bg-vest-accent/90 disabled:opacity-50"
            >
              {connecting ? "Connecting..." : "Connect"}
            </button>
            {isPreferred && (
              <button
                type="button"
                onClick={handleClearPreference}
                disabled={disabled}
                className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50"
                title="Clear saved preference"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

