import { VestStatus } from "../types";

type Props = {
  status: VestStatus;
  onRefresh: () => void;
  disabled?: boolean;
};

export function StatusPanel({ status, onRefresh, disabled }: Props) {
  return (
    <section className="rounded-2xl bg-slate-800/80 p-4 shadow-lg ring-1 ring-white/5">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-400">USB</p>
          <h2 className="text-xl font-semibold text-white">
            Connection Status
          </h2>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ${
            status.connected
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-rose-500/20 text-rose-200"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-current" />
          {status.connected ? "Connected" : "Disconnected"}
        </span>
      </header>

      {/* Setup warning for fake device */}
      {status.connected && status.device_serial_number === "sorry-bro" && (
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
                PyUSB is not installed or not available. This is a fake device
                indicator. Please install PyUSB to connect to real USB vest
                devices.
              </p>
              <p className="mt-2 text-xs text-amber-200/70">
                See{" "}
                <code className="rounded bg-amber-500/20 px-1 py-0.5">
                  modern-third-space/README.md
                </code>{" "}
                for installation instructions.
              </p>
            </div>
          </div>
        </div>
      )}

      {status.connected ? (
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-400">Vendor ID</dt>
            <dd className="font-mono text-white">
              {status.device_vendor_id
                ? `0x${status.device_vendor_id
                    .toString(16)
                    .toUpperCase()
                    .padStart(4, "0")}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">Product ID</dt>
            <dd className="font-mono text-white">
              {status.device_product_id
                ? `0x${status.device_product_id
                    .toString(16)
                    .toUpperCase()
                    .padStart(4, "0")}`
                : "—"}
            </dd>
          </div>
          {status.device_bus !== null && status.device_bus !== undefined && (
            <div>
              <dt className="text-slate-400">USB Bus</dt>
              <dd className="font-mono text-white">{status.device_bus}</dd>
            </div>
          )}
          {status.device_address !== null &&
            status.device_address !== undefined && (
              <div>
                <dt className="text-slate-400">USB Address</dt>
                <dd className="font-mono text-white">
                  {status.device_address}
                </dd>
              </div>
            )}
          {status.device_serial_number &&
            status.device_serial_number !== "sorry-bro" && (
              <div className="col-span-2">
                <dt className="text-slate-400">Serial Number</dt>
                <dd className="font-mono text-white">
                  {status.device_serial_number}
                </dd>
              </div>
            )}
        </dl>
      ) : (
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-400">Vendor ID</dt>
            <dd className="font-mono text-white">—</dd>
          </div>
          <div>
            <dt className="text-slate-400">Product ID</dt>
            <dd className="font-mono text-white">—</dd>
          </div>
        </dl>
      )}

      {status.last_error && (
        <p className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {status.last_error}
        </p>
      )}

      <button
        type="button"
        className="mt-4 inline-flex items-center justify-center rounded-lg bg-vest-primary/80 px-4 py-2 font-medium text-white transition hover:bg-vest-primary"
        onClick={onRefresh}
        disabled={disabled}
      >
        Refresh Status
      </button>
    </section>
  );
}

