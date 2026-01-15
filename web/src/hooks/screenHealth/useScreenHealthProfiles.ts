import { useState, useCallback, useEffect } from "react";
import { SCREEN_HEALTH_PRESETS, type ScreenHealthPreset } from "../../data/screenHealthPresets";
import {
  screenHealthListProfiles,
  screenHealthSaveProfile,
  screenHealthDeleteProfile,
  screenHealthGetProfile,
  type ScreenHealthLocalProfile,
} from "../../lib/bridgeApi";

export type UnifiedProfile = {
  type: "preset" | "local";
  id: string; // preset_id or local id
  name: string; // display_name or name
  profile: Record<string, any>; // The actual daemon profile
  createdAt?: string; // Only for local
  updatedAt?: string; // Only for local
};

export function useScreenHealthProfiles() {
  const [localProfiles, setLocalProfiles] = useState<ScreenHealthLocalProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await screenHealthListProfiles();
      if (!result.success) {
        setError(result.error || "Failed to list profiles");
        return;
      }
      setLocalProfiles(result.profiles || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to list profiles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfiles();
  }, [refreshProfiles]);

  const listProfiles = useCallback((): UnifiedProfile[] => {
    // Combine presets and local profiles into unified list
    const presetProfiles: UnifiedProfile[] = SCREEN_HEALTH_PRESETS.map((preset) => ({
      type: "preset" as const,
      id: preset.preset_id,
      name: preset.display_name,
      profile: preset.profile,
    }));

    const localProfilesList: UnifiedProfile[] = localProfiles.map((local) => ({
      type: "local" as const,
      id: local.id,
      name: local.name,
      profile: local.profile,
      createdAt: local.createdAt,
      updatedAt: local.updatedAt,
    }));

    return [...presetProfiles, ...localProfilesList];
  }, [localProfiles]);

  const saveProfile = useCallback(
    async (name: string, profile: Record<string, any>): Promise<ScreenHealthLocalProfile | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await screenHealthSaveProfile({ name, profile });
        if (!result.success) {
          setError(result.error || "Failed to save profile");
          return null;
        }
        // Refresh the list to include the new profile
        await refreshProfiles();
        return result.profile || null;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save profile");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [refreshProfiles]
  );

  const deleteProfile = useCallback(
    async (profileId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        const result = await screenHealthDeleteProfile(profileId);
        if (!result.success) {
          setError(result.error || "Failed to delete profile");
          return false;
        }
        // Refresh the list to remove the deleted profile
        await refreshProfiles();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to delete profile");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [refreshProfiles]
  );

  const getProfile = useCallback(
    async (profileId: string): Promise<UnifiedProfile | null> => {
      // First check presets
      const preset = SCREEN_HEALTH_PRESETS.find((p) => p.preset_id === profileId);
      if (preset) {
        return {
          type: "preset",
          id: preset.preset_id,
          name: preset.display_name,
          profile: preset.profile,
        };
      }

      // Then check local profiles
      const local = localProfiles.find((p) => p.id === profileId);
      if (local) {
        return {
          type: "local",
          id: local.id,
          name: local.name,
          profile: local.profile,
          createdAt: local.createdAt,
          updatedAt: local.updatedAt,
        };
      }

      // If not found in cache, try fetching from storage
      try {
        const result = await screenHealthGetProfile(profileId);
        if (!result.success || !result.profile) {
          return null;
        }
        const fetched = result.profile;
        return {
          type: "local",
          id: fetched.id,
          name: fetched.name,
          profile: fetched.profile,
          createdAt: fetched.createdAt,
          updatedAt: fetched.updatedAt,
        };
      } catch (e) {
        return null;
      }
    },
    [localProfiles]
  );

  return {
    profiles: listProfiles(),
    localProfiles,
    loading,
    error,
    refreshProfiles,
    saveProfile,
    deleteProfile,
    getProfile,
  };
}
