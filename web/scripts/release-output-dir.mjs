import { randomBytes } from "crypto";
import { resolve } from "path";
import { fileURLToPath } from "url";

/**
 * Subfolder under `web/release/` for each packaging run, e.g.
 * `release/2026-03-25_15-36_a1b2c3d4` — avoids reusing the same `win-unpacked`
 * tree so app.asar is not left locked by a previous unpack.
 */
export function getReleaseOutputSubpath() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
  const suffix = randomBytes(4).toString("hex");
  return `release/${stamp}_${suffix}`;
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  console.log(getReleaseOutputSubpath());
}
