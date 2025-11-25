import { VestEffect, VestStatus } from "../types";

const BASE_URL =
  (import.meta.env.VITE_VEST_BRIDGE_URL as string | undefined) ??
  "http://localhost:4789";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) {
    throw new Error(`Bridge error: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

export async function fetchStatus(): Promise<VestStatus> {
  return request<VestStatus>("/status");
}

export async function fetchEffects(): Promise<VestEffect[]> {
  return request<VestEffect[]>("/effects");
}

export async function triggerEffect(effect: VestEffect): Promise<void> {
  await request("/trigger", {
    method: "POST",
    body: JSON.stringify(effect),
  });
}

export async function stopAll(): Promise<void> {
  await request("/stop", { method: "POST" });
}

