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
          <h2 className="text-xl font-semibold text-white">Connection Status</h2>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ${
            status.connected ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-200"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-current" />
          {status.connected ? "Connected" : "Disconnected"}
        </span>
      </header>

      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-slate-400">Vendor ID</dt>
          <dd className="font-mono text-white">
            {status.device_vendor_id ? `0x${status.device_vendor_id.toString(16)}` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Product ID</dt>
          <dd className="font-mono text-white">
            {status.device_product_id ? `0x${status.device_product_id.toString(16)}` : "—"}
          </dd>
        </div>
      </dl>

      {status.last_error && (
        <p className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {status.last_error}
        </p>
      )}

      <button
        type="button"
        className="mt-4 inline-flex items-center justify-center rounded-lg bg-vest.primary/80 px-4 py-2 font-medium text-white transition hover:bg-vest.primary"
        onClick={onRefresh}
        disabled={disabled}
      >
        Refresh Status
      </button>
    </section>
  );
}

