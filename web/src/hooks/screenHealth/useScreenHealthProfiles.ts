import { useCallback, useState } from "react";
import {
  ScreenHealthStoredProfile,
  screenHealthDeleteProfile,
  screenHealthExportProfile,
  screenHealthGetActiveProfile,
  screenHealthImportProfile,
  screenHealthListProfiles,
  screenHealthSaveProfile,
  screenHealthSetActiveProfile,
} from "../../lib/bridgeApi";

export function useScreenHealthProfiles(opts?: { onError?: (msg: string) => void }) {
  const onError = opts?.onError;

  const [profiles, setProfiles] = useState<ScreenHealthStoredProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [activeProfile, setActiveProfile] = useState<ScreenHealthStoredProfile | null>(null);

  const refreshProfiles = useCallback(async () => {
    const result = await screenHealthListProfiles();
    if (!result.success) {
      onError?.(result.error || "Failed to load profiles");
      return;
    }
    setProfiles(result.profiles || []);
    setActiveProfileId(result.activeProfileId ?? null);
    const active = await screenHealthGetActiveProfile();
    if (active.success) {
      setActiveProfile(active.profile || null);
    }
  }, [onError]);

  const saveProfile = useCallback(
    async (profile: Partial<ScreenHealthStoredProfile> | Record<string, any>) => {
      const result = await screenHealthSaveProfile(profile);
      if (!result.success) throw new Error(result.error || "Failed to save profile");
      await refreshProfiles();
      return result.profile!;
    },
    [refreshProfiles]
  );

  const deleteProfile = useCallback(
    async (profileId: string) => {
      const result = await screenHealthDeleteProfile(profileId);
      if (!result.success) throw new Error(result.error || "Failed to delete profile");
      await refreshProfiles();
    },
    [refreshProfiles]
  );

  const setActive = useCallback(
    async (profileId: string) => {
      const result = await screenHealthSetActiveProfile(profileId);
      if (!result.success) throw new Error(result.error || "Failed to set active profile");
      await refreshProfiles();
    },
    [refreshProfiles]
  );

  const exportProfile = useCallback(async (profileId: string) => {
    const result = await screenHealthExportProfile(profileId);
    if (!result.success && !result.canceled) throw new Error(result.error || "Failed to export profile");
    return result;
  }, []);

  const importProfile = useCallback(async () => {
    const result = await screenHealthImportProfile();
    if (!result.success && !result.canceled) throw new Error(result.error || "Failed to import profile");
    await refreshProfiles();
    return result.profile || null;
  }, [refreshProfiles]);

  return {
    profiles,
    activeProfileId,
    activeProfile,
    refreshProfiles,
    saveProfile,
    deleteProfile,
    setActive,
    exportProfile,
    importProfile,
  };
}

