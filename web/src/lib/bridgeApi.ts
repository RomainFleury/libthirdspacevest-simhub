import { VestEffect, VestStatus } from "../types";

// Type definition for the Electron bridge API
declare global {
  interface Window {
    vestBridge?: {
      ping: () => Promise<{ success: boolean; message?: string }>;
      getStatus: () => Promise<VestStatus>;
      getEffects: () => Promise<VestEffect[]>;
      triggerEffect: (effect: VestEffect) => Promise<void>;
      stopAll: () => Promise<void>;
    };
  }
}

function ensureBridge(): NonNullable<Window["vestBridge"]> {
  if (typeof window === "undefined" || !window.vestBridge) {
    throw new Error(
      "Vest bridge is not available. This app must run in Electron."
    );
  }
  return window.vestBridge;
}

export async function fetchStatus(): Promise<VestStatus> {
  return await ensureBridge().getStatus();
}

export async function fetchEffects(): Promise<VestEffect[]> {
  return await ensureBridge().getEffects();
}

export async function triggerEffect(effect: VestEffect): Promise<void> {
  await ensureBridge().triggerEffect(effect);
}

export async function stopAll(): Promise<void> {
  await ensureBridge().stopAll();
}

export async function ping(): Promise<{ success: boolean; message?: string }> {
  return await ensureBridge().ping();
}

