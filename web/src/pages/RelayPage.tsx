import { useCallback, useEffect, useState } from "react";
import {
  relayConnect,
  relayDisconnect,
  relayListPorts,
  relayPulse,
  relaySet,
  relayStatus,
  type RelayPortInfo,
  type RelayStatusInfo,
} from "../lib/bridgeApi";

const DEFAULT_PULSE_MS = 40;
const DEFAULT_ADDRESS = 1;
const DEFAULT_BAUD = 9600;

export function RelayPage() {
  const [ports, setPorts] = useState<RelayPortInfo[]>([]);
  const [selectedPort, setSelectedPort] = useState("");
  const [baud, setBaud] = useState(DEFAULT_BAUD);
  const [address, setAddress] = useState(DEFAULT_ADDRESS);
  const [pulseMs, setPulseMs] = useState(DEFAULT_PULSE_MS);
  const [relay, setRelay] = useState<RelayStatusInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connected = Boolean(relay?.connected);

  const refreshStatus = useCallback(async () => {
    const result = await relayStatus();
    if (result.success) {
      setRelay(result.relay ?? null);
      if (result.relay?.port) {
        setSelectedPort(result.relay.port);
      }
    }
  }, []);

  const refreshPorts = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await relayListPorts();
      if (!result.success) {
        setError(result.error || "Failed to list serial ports");
        setPorts([]);
        return;
      }
      setPorts(result.ports);
      setSelectedPort((current) => current || (result.ports[0]?.device ?? ""));
      setMessage(`Found ${result.ports.length} serial port(s)`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void refreshPorts();
    void refreshStatus();
  }, [refreshPorts, refreshStatus]);

  const handleConnect = async () => {
    if (!selectedPort) {
      setError("Select a serial port first");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await relayConnect(selectedPort, baud, address);
      if (!result.success) {
        setError(result.error || "Connect failed");
        return;
      }
      setRelay(result.relay ?? null);
      setMessage(`Connected to ${selectedPort}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await relayDisconnect();
      if (!result.success) {
        setError(result.error || "Disconnect failed");
        return;
      }
      setRelay({ connected: false, is_on: false });
      setMessage("Disconnected");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSet = async (on: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const result = await relaySet(on);
      if (!result.success) {
        setError(result.error || `Failed to turn relay ${on ? "ON" : "OFF"}`);
        return;
      }
      setRelay(result.relay ?? null);
      setMessage(`Relay ${on ? "ON" : "OFF"}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handlePulse = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await relayPulse(pulseMs);
      if (!result.success) {
        setError(result.error || "Pulse failed");
        return;
      }
      setRelay(result.relay ?? null);
      setMessage(`Pulsed ${result.duration_ms ?? pulseMs} ms`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Relay / Recoil</h1>
        <p className="mt-2 text-sm md:text-base text-slate-400">
          Test the USB LC relay module that drives a solenoid for mechanical recoil feedback.
          Prefer short pulses — solenoids overheat if left energized.
        </p>
      </header>

      <section className="rounded-2xl bg-slate-800/80 p-4 md:p-5 shadow-lg ring-1 ring-white/5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-400">Connection</p>
            <h2 className="text-xl font-semibold text-white">Serial Port</h2>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              connected
                ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40"
                : "bg-slate-700 text-slate-300 ring-1 ring-slate-600"
            }`}
          >
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="block space-y-1.5">
            <span className="text-sm text-slate-400">Port</span>
            <select
              className="w-full rounded-lg bg-slate-900 border border-slate-600 px-3 py-2 text-white"
              value={selectedPort}
              onChange={(e) => setSelectedPort(e.target.value)}
              disabled={busy || connected}
            >
              {ports.length === 0 ? (
                <option value="">No ports found</option>
              ) : (
                ports.map((p) => (
                  <option key={p.device} value={p.device}>
                    {p.device}
                    {p.description ? ` — ${p.description}` : ""}
                  </option>
                ))
              )}
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void refreshPorts()}
              disabled={busy}
              className="w-full sm:w-auto rounded-lg border border-slate-500 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-sm text-slate-400">Baud</span>
            <input
              type="number"
              className="w-full rounded-lg bg-slate-900 border border-slate-600 px-3 py-2 text-white"
              value={baud}
              onChange={(e) => setBaud(Number(e.target.value) || DEFAULT_BAUD)}
              disabled={busy || connected}
              min={1200}
              step={100}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm text-slate-400">Switch address</span>
            <input
              type="number"
              className="w-full rounded-lg bg-slate-900 border border-slate-600 px-3 py-2 text-white"
              value={address}
              onChange={(e) => setAddress(Number(e.target.value) || DEFAULT_ADDRESS)}
              disabled={busy || connected}
              min={0}
              max={255}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          {!connected ? (
            <button
              type="button"
              onClick={() => void handleConnect()}
              disabled={busy || !selectedPort}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              Connect
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleDisconnect()}
              disabled={busy}
              className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"
            >
              Disconnect
            </button>
          )}
        </div>
      </section>

      <section className="rounded-2xl bg-slate-800/80 p-4 md:p-5 shadow-lg ring-1 ring-white/5 space-y-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-400">Control</p>
          <h2 className="text-xl font-semibold text-white">Solenoid / Recoil</h2>
        </div>

        <label className="block space-y-1.5 max-w-xs">
          <span className="text-sm text-slate-400">Pulse duration (ms)</span>
          <input
            type="number"
            className="w-full rounded-lg bg-slate-900 border border-slate-600 px-3 py-2 text-white"
            value={pulseMs}
            onChange={(e) => setPulseMs(Math.max(1, Number(e.target.value) || DEFAULT_PULSE_MS))}
            disabled={busy || !connected}
            min={1}
            max={5000}
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handlePulse()}
            disabled={busy || !connected}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-400 disabled:opacity-50"
          >
            Pulse Recoil
          </button>
          <button
            type="button"
            onClick={() => void handleSet(true)}
            disabled={busy || !connected}
            className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
          >
            ON
          </button>
          <button
            type="button"
            onClick={() => void handleSet(false)}
            disabled={busy || !connected}
            className="rounded-lg border border-slate-500 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50"
          >
            OFF
          </button>
        </div>

        {relay && (
          <dl className="grid grid-cols-2 gap-2 text-sm text-slate-300 pt-2 border-t border-slate-700">
            <div>
              <dt className="text-slate-500">Port</dt>
              <dd>{relay.port || "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">State</dt>
              <dd>{relay.is_on ? "ON" : "OFF"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Baud</dt>
              <dd>{relay.baud ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Address</dt>
              <dd>{relay.address != null ? `0x${Number(relay.address).toString(16).padStart(2, "0").toUpperCase()}` : "—"}</dd>
            </div>
          </dl>
        )}
      </section>

      {(message || error) && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            error
              ? "bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/30"
              : "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30"
          }`}
        >
          {error || message}
        </div>
      )}

      <section className="rounded-2xl bg-slate-900/60 p-4 text-sm text-slate-400 ring-1 ring-white/5 space-y-2">
        <p className="font-medium text-slate-300">Protocol (9600 baud)</p>
        <p>
          ON: <code className="text-slate-200">A0 01 01 A2</code> · OFF:{" "}
          <code className="text-slate-200">A0 01 00 A1</code>
        </p>
        <p>
          CLI:{" "}
          <code className="text-slate-200">
            python -m modern_third_space.cli relay pulse --port COM3 --ms 40
          </code>
        </p>
      </section>
    </div>
  );
}
