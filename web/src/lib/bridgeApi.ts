import { VestDevice, VestEffect, VestStatus } from "../types";

// Type definition for the Electron bridge API
declare global {
  interface Window {
    vestBridge?: {
      ping: () => Promise<{
        success: boolean;
        message?: string;
        error?: string;
      }>;
      getStatus: () => Promise<VestStatus>;
      getEffects: () => Promise<VestEffect[]>;
      triggerEffect: (
        effect: VestEffect
      ) => Promise<{ success: boolean; error?: string } | void>;
      stopAll: () => Promise<{ success: boolean; error?: string } | void>;
      listDevices: () => Promise<VestDevice[]>;
      connectToDevice: (deviceInfo: Partial<VestDevice>) => Promise<VestStatus>;
      getDevicePreference: () => Promise<Partial<VestDevice> | null>;
      saveDevicePreference: (
        deviceInfo: Partial<VestDevice>
      ) => Promise<{ success: boolean; error?: string }>;
      clearDevicePreference: () => Promise<{
        success: boolean;
        error?: string;
      }>;
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
  const result = await ensureBridge().triggerEffect(effect);
  // Check if the result indicates an error
  if (
    result &&
    typeof result === "object" &&
    "success" in result &&
    !result.success
  ) {
    throw new Error(result.error || "Failed to trigger effect");
  }
}

export async function stopAll(): Promise<void> {
  const result = await ensureBridge().stopAll();
  // Check if the result indicates an error
  if (
    result &&
    typeof result === "object" &&
    "success" in result &&
    !result.success
  ) {
    throw new Error(result.error || "Failed to stop all");
  }
}

export async function ping(): Promise<{ success: boolean; message?: string }> {
  return await ensureBridge().ping();
}

export async function listDevices(): Promise<VestDevice[]> {
  return await ensureBridge().listDevices();
}

export async function connectToDevice(
  deviceInfo: Partial<VestDevice>
): Promise<VestStatus> {
  return await ensureBridge().connectToDevice(deviceInfo);
}

export async function getDevicePreference(): Promise<Partial<VestDevice> | null> {
  return await ensureBridge().getDevicePreference();
}

export async function saveDevicePreference(
  deviceInfo: Partial<VestDevice>
): Promise<void> {
  const result = await ensureBridge().saveDevicePreference(deviceInfo);
  if (!result.success) {
    throw new Error(result.error || "Failed to save device preference");
  }
}

export async function clearDevicePreference(): Promise<void> {
  const result = await ensureBridge().clearDevicePreference();
  if (!result.success) {
    throw new Error(result.error || "Failed to clear device preference");
  }
}
