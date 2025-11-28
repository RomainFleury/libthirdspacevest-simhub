import { useState, useEffect, useCallback } from 'react';

export interface BF2Settings {
  edgeWidth: number;
  redThreshold: number;
  redRatio: number;
  cooldown: number;
  captureFps: number;
}

const DEFAULT_SETTINGS: BF2Settings = {
  edgeWidth: 20,
  redThreshold: 150,
  redRatio: 1.5,
  cooldown: 0.2,
  captureFps: 60,
};

export function useBF2Settings() {
  const [settings, setSettings] = useState<BF2Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Load settings on mount
  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // @ts-ignore - window.vestBridge
      const result = await window.vestBridge?.bf2GetSettings?.();
      if (result?.success && result?.settings) {
        setSettings(result.settings);
      } else {
        setError(result?.error || 'Failed to load settings');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  // Save all settings
  const saveSettings = useCallback(async (newSettings: BF2Settings) => {
    setLoading(true);
    setError(null);
    setSaveSuccess(null);
    try {
      // @ts-ignore - window.vestBridge
      const result = await window.vestBridge?.bf2SetSettings?.(newSettings);
      if (result?.success) {
        setSettings(newSettings);
        setSaveSuccess('Settings saved successfully!');
        // Clear success message after 3 seconds
        setTimeout(() => setSaveSuccess(null), 3000);
        return true;
      } else {
        setError(result?.error || 'Failed to save settings');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update a single setting
  const updateSetting = useCallback(async (key: keyof BF2Settings, value: number) => {
    setLoading(true);
    setError(null);
    setSaveSuccess(null);
    try {
      // @ts-ignore - window.vestBridge
      const result = await window.vestBridge?.bf2SetSetting?.(key, value);
      if (result?.success) {
        setSettings(prev => ({ ...prev, [key]: value }));
        setSaveSuccess('Setting updated!');
        setTimeout(() => setSaveSuccess(null), 2000);
        return true;
      } else {
        setError(result?.error || 'Failed to update setting');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update setting');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Reset to defaults
  const resetSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSaveSuccess(null);
    try {
      // @ts-ignore - window.vestBridge
      const result = await window.vestBridge?.bf2ResetSettings?.();
      if (result?.success && result?.settings) {
        setSettings(result.settings);
        setSaveSuccess('Settings reset to defaults!');
        setTimeout(() => setSaveSuccess(null), 3000);
        return true;
      } else {
        setError(result?.error || 'Failed to reset settings');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset settings');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get config file path (for reference)
  const getConfigFilePath = useCallback(async () => {
    try {
      // @ts-ignore - window.vestBridge
      const result = await window.vestBridge?.bf2GetConfigFilePath?.();
      return result?.path || null;
    } catch (err) {
      console.error('Failed to get config file path:', err);
      return null;
    }
  }, []);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    loading,
    error,
    saveSuccess,
    loadSettings,
    saveSettings,
    updateSetting,
    resetSettings,
    getConfigFilePath,
  };
}

