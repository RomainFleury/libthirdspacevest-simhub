import { LogEntry } from "../types";

type Props = {
  logs: LogEntry[];
};

export function LogPanel({ logs }: Props) {
  return (
    <section className="rounded-2xl bg-slate-800/80 p-4 shadow-lg ring-1 ring-white/5">
      <header className="mb-3">
        <p className="text-sm uppercase tracking-wide text-slate-400">Logs</p>
        <h2 className="text-xl font-semibold text-white">Command History</h2>
      </header>

      <div className="max-h-80 overflow-y-auto pr-2">
        {logs.length === 0 && (
          <p className="text-sm text-slate-400">No events yet. Trigger an effect to begin logging.</p>
        )}
        <ul className="space-y-2">
          {logs.map((log) => (
            <li
              key={log.id}
              className={`rounded-lg px-3 py-2 text-sm ${
                log.level === "error" ? "bg-rose-500/10 text-rose-100" : "bg-white/5 text-slate-100"
              }`}
            >
              <p className="font-medium">{log.message}</p>
              <p className="text-xs text-slate-400">
                {new Date(log.ts).toLocaleTimeString()}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

