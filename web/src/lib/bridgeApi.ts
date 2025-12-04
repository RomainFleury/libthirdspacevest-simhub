import { VestDevice, VestEffect, VestStatus } from "../types";

// Daemon event types
export type DaemonEvent = {
  event: string;
  ts: number;
  // Device events
  device?: {
    bus?: number;
    address?: number;
    serial_number?: string;
    vendor_id?: string;
    product_id?: string;
  };
  devices?: Array<{
    bus: number;
    address: number;
    serial_number?: string;
    vendor_id: string;
    product_id: string;
  }>;
  // Command events
  cell?: number;
  speed?: number;
  // Client events
  client_id?: string;
  client_name?: string;
  // Error events
  message?: string;
  // CS2 GSI events
  gsi_port?: number;
  event_type?: string; // For cs2_game_event: "damage", "death", "flash", etc.
  amount?: number; // For damage events
  intensity?: number; // For flash events
  // Half-Life: Alyx events
  log_path?: string;
  params?: Record<string, unknown>; // For alyx_game_event params
};

export type DaemonStatus = {
  connected: boolean;
};

// CS2 GSI types
export type CS2Status = {
  running: boolean;
  gsi_port?: number | null;
  events_received?: number;
  last_event_ts?: number | null;
  error?: string;
};

export type CS2StartResult = {
  success: boolean;
  gsi_port?: number;
  error?: string;
};

export type CS2StopResult = {
  success: boolean;
  error?: string;
};

export type CS2ConfigResult = {
  success: boolean;
  config_content?: string;
  filename?: string;
  error?: string;
};

// CS2 Config Path types
export type CS2ConfigPathResult = {
  path: string | null;
  configExists: boolean;
};

export type CS2AutoDetectResult = {
  success: boolean;
  path: string | null;
};

export type CS2BrowseResult = {
  success: boolean;
  path?: string;
  canceled?: boolean;
  error?: string;
};

export type CS2SaveToCS2Result = {
  success: boolean;
  path?: string;
  error?: string;
};

// Half-Life: Alyx types
export type AlyxStatus = {
  running: boolean;
  log_path?: string | null;
  events_received?: number;
  last_event_ts?: number | null;
  error?: string;
};

export type AlyxStartResult = {
  success: boolean;
  log_path?: string;
  error?: string;
};

export type AlyxStopResult = {
  success: boolean;
  error?: string;
};

export type AlyxModInfo = {
  name: string;
  description: string;
  download_url: string;
  github_url: string;
  install_instructions: string[];
  skill_manifest_addition: string;
};

export type AlyxModInfoResult = {
  success: boolean;
  mod_info?: AlyxModInfo;
  error?: string;
};

// Predefined Effects Library types
export type EffectStep = {
  cells: number[];
  speed: number;
  duration_ms: number;
  delay_ms: number;
};

export type PredefinedEffect = {
  name: string;
  display_name: string;
  category: string;
  description: string;
  duration_ms: number;
  steps: EffectStep[];
};

export type EffectsListResult = {
  success: boolean;
  effects: PredefinedEffect[];
  categories: string[];
  error?: string;
};

export type PlayEffectResult = {
  success: boolean;
  error?: string;
};

// Type definition for the Electron bridge API
declare global {
  interface Window {
    vestBridge?: {
      // Existing API
      ping: () => Promise<{
        success: boolean;
        message?: string;
        error?: string;
        alive?: boolean;
        connected?: boolean;
        has_device_selected?: boolean;
        client_count?: number;
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
      // New daemon API
      getDaemonStatus: () => Promise<DaemonStatus>;
      reconnectDaemon: () => Promise<{ success: boolean; error?: string }>;
      onDaemonEvent: (callback: (event: DaemonEvent) => void) => () => void;
      onDaemonStatus: (callback: (status: DaemonStatus) => void) => () => void;
      // CS2 GSI API
      cs2Start: (gsiPort?: number) => Promise<CS2StartResult>;
      cs2Stop: () => Promise<CS2StopResult>;
      cs2Status: () => Promise<CS2Status>;
      cs2GenerateConfig: (gsiPort?: number) => Promise<CS2ConfigResult>;
      // CS2 Config Path Management
      cs2GetConfigPath: () => Promise<CS2ConfigPathResult>;
      cs2SetConfigPath: (configPath: string) => Promise<{ success: boolean; error?: string }>;
      cs2AutoDetectPath: () => Promise<CS2AutoDetectResult>;
      cs2BrowseConfigPath: () => Promise<CS2BrowseResult>;
      cs2SaveConfigToCS2: (gsiPort?: number) => Promise<CS2SaveToCS2Result>;
      // Half-Life: Alyx API
      alyxStart: (logPath?: string) => Promise<AlyxStartResult>;
      alyxStop: () => Promise<AlyxStopResult>;
      alyxStatus: () => Promise<AlyxStatus>;
      alyxGetModInfo: () => Promise<AlyxModInfoResult>;
      // SUPERHOT VR Integration API
      superhotStart: () => Promise<{ success: boolean; error?: string }>;
      superhotStop: () => Promise<{ success: boolean; error?: string }>;
      superhotStatus: () => Promise<{
        enabled: boolean;
        events_received?: number;
        last_event_ts?: number | null;
        last_event_type?: string | null;
        error?: string;
      }>;
      // Pistol Whip Integration API
      pistolwhipStart: () => Promise<{ success: boolean; error?: string }>;
      pistolwhipStop: () => Promise<{ success: boolean; error?: string }>;
      pistolwhipStatus: () => Promise<{
        enabled: boolean;
        events_received?: number;
        last_event_ts?: number | null;
        last_event_type?: string | null;
        error?: string;
      }>;
      // Star Citizen Integration API
      starcitizenStart: (logPath?: string, playerName?: string) => Promise<{
        success: boolean;
        log_path?: string;
        error?: string;
      }>;
      starcitizenStop: () => Promise<{ success: boolean; error?: string }>;
      starcitizenStatus: () => Promise<{
        enabled: boolean;
        events_received?: number;
        last_event_ts?: number | null;
        last_event_type?: string | null;
        log_path?: string | null;
        error?: string;
      }>;
      starcitizenBrowseLogPath: () => Promise<{
        success: boolean;
        path?: string;
        canceled?: boolean;
        error?: string;
      }>;
      starcitizenGetSettings: () => Promise<{
        success: boolean;
        logPath?: string | null;
        playerName?: string | null;
        error?: string;
      }>;
      starcitizenSetLogPath: (logPath: string | null) => Promise<{
        success: boolean;
        error?: string;
      }>;
      starcitizenSetPlayerName: (playerName: string | null) => Promise<{
        success: boolean;
        error?: string;
      }>;
      // Left 4 Dead 2 Integration API
      l4d2Start: (logPath?: string, playerName?: string) => Promise<{
        success: boolean;
        log_path?: string;
        error?: string;
      }>;
      l4d2Stop: () => Promise<{ success: boolean; error?: string }>;
      l4d2Status: () => Promise<{
        success: boolean;
        running: boolean;
        events_received?: number;
        last_event_ts?: number | null;
        last_event_type?: string | null;
        log_path?: string | null;
        error?: string;
      }>;
      l4d2BrowseLogPath: () => Promise<{
        success: boolean;
        logPath?: string;
        canceled?: boolean;
        error?: string;
      }>;
      l4d2GetSettings: () => Promise<{
        success: boolean;
        logPath?: string | null;
        playerName?: string | null;
        error?: string;
      }>;
      l4d2SetLogPath: (logPath: string | null) => Promise<{ success: boolean; error?: string }>;
      l4d2SetPlayerName: (playerName: string | null) => Promise<{ success: boolean; error?: string }>;
      // EA Battlefront 2 (2017) Settings API
      bf2GetSettings: () => Promise<{
        success: boolean;
        settings?: Record<string, any>;
        error?: string;
      }>;
      bf2SetSettings: (settings: Record<string, any>) => Promise<{
        success: boolean;
        error?: string;
      }>;
      bf2SetSetting: (key: string, value: any) => Promise<{
        success: boolean;
        error?: string;
      }>;
      bf2ResetSettings: () => Promise<{
        success: boolean;
        settings?: Record<string, any>;
        error?: string;
      }>;
      bf2GetConfigFilePath: () => Promise<{
        success: boolean;
        path?: string;
        error?: string;
      }>;
      bf2WriteConfigFile: () => Promise<{
        success: boolean;
        path?: string;
        error?: string;
      }>;
      // Multi-Vest Management API
      listConnectedDevices: () => Promise<{
        success: boolean;
        devices?: Array<{
          device_id: string;
          is_main: boolean;
          bus?: number;
          address?: number;
          serial_number?: string;
          is_mock?: boolean;
        }>;
        error?: string;
      }>;
      setMainDevice: (deviceId: string) => Promise<{
        success: boolean;
        error?: string;
      }>;
      disconnectDevice: (deviceId: string) => Promise<{
        success: boolean;
        error?: string;
      }>;
      createMockDevice: () => Promise<{
        success: boolean;
        device_id?: string;
        device?: any;
        error?: string;
      }>;
      removeMockDevice: (deviceId: string) => Promise<{
        success: boolean;
        error?: string;
      }>;
      // Player Management API (backend still supports, but UI removed)
      createPlayer: (playerId: string, name?: string) => Promise<{
        success: boolean;
        error?: string;
      }>;
      assignPlayer: (playerId: string, deviceId: string) => Promise<{
        success: boolean;
        error?: string;
      }>;
      unassignPlayer: (playerId: string) => Promise<{
        success: boolean;
        error?: string;
      }>;
      listPlayers: () => Promise<{
        success: boolean;
        devices?: Array<{
          player_id: string;
          device_id: string | null;
          name: string | null;
        }>;
        error?: string;
      }>;
      getPlayerDevice: (playerId: string) => Promise<{
        success: boolean;
        device_id?: string;
        error?: string;
      }>;
      // Game-Specific Player Mapping API
      setGamePlayerMapping: (
        gameId: string,
        playerNum: number,
        deviceId: string
      ) => Promise<{ success: boolean; error?: string }>;
      clearGamePlayerMapping: (
        gameId: string,
        playerNum?: number
      ) => Promise<{ success: boolean; error?: string }>;
      listGamePlayerMappings: (gameId?: string) => Promise<{
        success: boolean;
        player_mappings?: Array<{
          game_id: string;
          player_num: number;
          device_id: string;
        }>;
        error?: string;
      }>;
      // Predefined Effects Library API
      playEffect: (effectName: string) => Promise<PlayEffectResult>;
      listEffectsLibrary: () => Promise<EffectsListResult>;
      stopEffect: () => Promise<{ success: boolean; error?: string }>;
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

// New daemon-related functions
export async function getDaemonStatus(): Promise<DaemonStatus> {
  return await ensureBridge().getDaemonStatus();
}

export async function reconnectDaemon(): Promise<void> {
  const result = await ensureBridge().reconnectDaemon();
  if (!result.success) {
    throw new Error(result.error || "Failed to reconnect to daemon");
  }
}

export function subscribeToDaemonEvents(
  callback: (event: DaemonEvent) => void
): () => void {
  return ensureBridge().onDaemonEvent(callback);
}

export function subscribeToDaemonStatus(
  callback: (status: DaemonStatus) => void
): () => void {
  return ensureBridge().onDaemonStatus(callback);
}

// -------------------------------------------------------------------------
// CS2 GSI Integration
// -------------------------------------------------------------------------

/**
 * Start the CS2 GSI server.
 * @param gsiPort Port for the GSI HTTP server (default 3000)
 */
export async function cs2Start(gsiPort = 3000): Promise<CS2StartResult> {
  return await ensureBridge().cs2Start(gsiPort);
}

/**
 * Stop the CS2 GSI server.
 */
export async function cs2Stop(): Promise<CS2StopResult> {
  return await ensureBridge().cs2Stop();
}

/**
 * Get CS2 GSI server status.
 */
export async function cs2Status(): Promise<CS2Status> {
  return await ensureBridge().cs2Status();
}

/**
 * Generate CS2 GSI config file content.
 * @param gsiPort Port for the GSI HTTP server
 */
export async function cs2GenerateConfig(
  gsiPort = 3000
): Promise<CS2ConfigResult> {
  return await ensureBridge().cs2GenerateConfig(gsiPort);
}

// -------------------------------------------------------------------------
// CS2 Config Path Management
// -------------------------------------------------------------------------

/**
 * Get the saved CS2 config path.
 */
export async function cs2GetConfigPath(): Promise<CS2ConfigPathResult> {
  return await ensureBridge().cs2GetConfigPath();
}

/**
 * Set the CS2 config path.
 */
export async function cs2SetConfigPath(configPath: string): Promise<void> {
  const result = await ensureBridge().cs2SetConfigPath(configPath);
  if (!result.success) {
    throw new Error(result.error || "Failed to save config path");
  }
}

/**
 * Auto-detect the CS2 config folder path.
 */
export async function cs2AutoDetectPath(): Promise<CS2AutoDetectResult> {
  return await ensureBridge().cs2AutoDetectPath();
}

/**
 * Open folder browser to select CS2 config path.
 */
export async function cs2BrowseConfigPath(): Promise<CS2BrowseResult> {
  return await ensureBridge().cs2BrowseConfigPath();
}

/**
 * Save the GSI config file directly to the CS2 folder.
 * @param gsiPort Port for the GSI HTTP server
 */
export async function cs2SaveConfigToCS2(
  gsiPort = 3000
): Promise<CS2SaveToCS2Result> {
  return await ensureBridge().cs2SaveConfigToCS2(gsiPort);
}

// -------------------------------------------------------------------------
// Half-Life: Alyx Integration
// -------------------------------------------------------------------------

/**
 * Start the Alyx console log watcher.
 * @param logPath Optional path to console.log (auto-detect if not provided)
 */
export async function alyxStart(logPath?: string): Promise<AlyxStartResult> {
  return await ensureBridge().alyxStart(logPath);
}

/**
 * Stop the Alyx console log watcher.
 */
export async function alyxStop(): Promise<AlyxStopResult> {
  return await ensureBridge().alyxStop();
}

/**
 * Get Alyx integration status.
 */
export async function alyxStatus(): Promise<AlyxStatus> {
  return await ensureBridge().alyxStatus();
}

/**
 * Get Alyx mod info (download URLs, install instructions).
 */
export async function alyxGetModInfo(): Promise<AlyxModInfoResult> {
  return await ensureBridge().alyxGetModInfo();
}

// -------------------------------------------------------------------------
// Predefined Effects Library
// -------------------------------------------------------------------------

/**
 * Play a predefined effect by name.
 * @param effectName Name of the effect to play (e.g., "machinegun_front")
 */
export async function playEffect(effectName: string): Promise<PlayEffectResult> {
  return await ensureBridge().playEffect(effectName);
}

/**
 * List all available predefined effects.
 * Returns effects organized by category.
 */
export async function listEffectsLibrary(): Promise<EffectsListResult> {
  return await ensureBridge().listEffectsLibrary();
}

/**
 * Stop any currently playing effect (emergency stop).
 */
export async function stopEffect(): Promise<{ success: boolean; error?: string }> {
  return await ensureBridge().stopEffect();
}
