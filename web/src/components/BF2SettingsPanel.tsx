import React, { useState } from 'react';
import { useBF2Settings, BF2Settings } from '../hooks/useBF2Settings';

export function BF2SettingsPanel() {
  const {
    settings,
    loading,
    error,
    saveSuccess,
    updateSetting,
    resetSettings,
    getConfigFilePath,
  } = useBF2Settings();

  const [configPath, setConfigPath] = useState<string | null>(null);

  // Get config file path on mount
  React.useEffect(() => {
    getConfigFilePath().then(path => setConfigPath(path));
  }, [getConfigFilePath]);

  const handleSliderChange = (key: keyof BF2Settings, value: number) => {
    updateSetting(key, value);
  };

  const handleReset = () => {
    if (confirm('Reset all settings to defaults?')) {
      resetSettings();
    }
  };

  return (
    <div className="bf2-settings-panel">
      <div className="panel-header">
        <h3>⚙️ EA Battlefront 2 (2017) - Screen Capture Settings</h3>
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {saveSuccess && (
        <div className="success-message">
          ✓ {saveSuccess}
        </div>
      )}

      <div className="panel-content">
        <div className="settings-section">
          <h4>Detection Thresholds</h4>

          {/* Edge Width */}
          <div className="setting-item">
            <div className="setting-label">
              <label>Edge Width (pixels)</label>
              <span className="setting-value">{settings.edgeWidth}px</span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              step="1"
              value={settings.edgeWidth}
              onChange={(e) => handleSliderChange('edgeWidth', parseInt(e.target.value))}
              disabled={loading}
              className="slider"
            />
            <div className="setting-description">
              How many pixels to capture from each screen edge (5-50px)
            </div>
          </div>

          {/* Red Threshold */}
          <div className="setting-item">
            <div className="setting-label">
              <label>Red Threshold</label>
              <span className="setting-value">{settings.redThreshold}</span>
            </div>
            <input
              type="range"
              min="100"
              max="255"
              step="5"
              value={settings.redThreshold}
              onChange={(e) => handleSliderChange('redThreshold', parseInt(e.target.value))}
              disabled={loading}
              className="slider"
            />
            <div className="setting-description">
              Minimum red value to detect damage indicator (0-255, higher = less sensitive)
            </div>
          </div>

          {/* Red Ratio */}
          <div className="setting-item">
            <div className="setting-label">
              <label>Red Ratio</label>
              <span className="setting-value">{settings.redRatio.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="3.0"
              step="0.1"
              value={settings.redRatio}
              onChange={(e) => handleSliderChange('redRatio', parseFloat(e.target.value))}
              disabled={loading}
              className="slider"
            />
            <div className="setting-description">
              Red must be this much higher than green/blue (1.0-3.0x, higher = more selective)
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h4>Performance Settings</h4>

          {/* Cooldown */}
          <div className="setting-item">
            <div className="setting-label">
              <label>Cooldown (seconds)</label>
              <span className="setting-value">{settings.cooldown.toFixed(2)}s</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={settings.cooldown}
              onChange={(e) => handleSliderChange('cooldown', parseFloat(e.target.value))}
              disabled={loading}
              className="slider"
            />
            <div className="setting-description">
              Minimum time between damage detections (prevents spam, 0.1-1.0s)
            </div>
          </div>

          {/* Capture FPS */}
          <div className="setting-item">
            <div className="setting-label">
              <label>Capture FPS</label>
              <span className="setting-value">{settings.captureFps} FPS</span>
            </div>
            <input
              type="range"
              min="30"
              max="120"
              step="10"
              value={settings.captureFps}
              onChange={(e) => handleSliderChange('captureFps', parseInt(e.target.value))}
              disabled={loading}
              className="slider"
            />
            <div className="setting-description">
              How often to capture screen (30-120 FPS, higher = more CPU usage)
            </div>
          </div>
        </div>

        <div className="settings-actions">
          <button
            onClick={handleReset}
            disabled={loading}
            className="btn-secondary"
          >
            Reset to Defaults
          </button>
        </div>

        {configPath && (
          <div className="config-info">
            <details>
              <summary>📄 Config File Location</summary>
              <div className="config-path">
                <code>{configPath}</code>
                <p className="note">
                  The screen capture script reads from this file. Settings are automatically saved here when changed.
                </p>
              </div>
            </details>
          </div>
        )}
      </div>

      <style>{`
        .bf2-settings-panel {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border: 1px solid #4a90e2;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .panel-header {
          margin-bottom: 16px;
        }

        .panel-header h3 {
          margin: 0;
          color: #4a90e2;
          font-size: 1.2rem;
        }

        .error-message {
          background: #ff4444;
          color: white;
          padding: 10px;
          border-radius: 6px;
          margin-bottom: 16px;
        }

        .success-message {
          background: #00d26a;
          color: #000;
          padding: 10px;
          border-radius: 6px;
          margin-bottom: 16px;
          font-weight: bold;
        }

        .panel-content {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .settings-section {
          background: rgba(0, 0, 0, 0.3);
          padding: 16px;
          border-radius: 8px;
        }

        .settings-section h4 {
          margin: 0 0 16px 0;
          color: #fff;
          font-size: 1rem;
          border-bottom: 1px solid #333;
          padding-bottom: 8px;
        }

        .setting-item {
          margin-bottom: 20px;
        }

        .setting-item:last-child {
          margin-bottom: 0;
        }

        .setting-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .setting-label label {
          color: #fff;
          font-weight: 500;
        }

        .setting-value {
          color: #4a90e2;
          font-weight: bold;
          font-size: 1.1rem;
        }

        .slider {
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: #333;
          outline: none;
          -webkit-appearance: none;
        }

        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #4a90e2;
          cursor: pointer;
        }

        .slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #4a90e2;
          cursor: pointer;
          border: none;
        }

        .setting-description {
          color: #888;
          font-size: 0.85rem;
          margin-top: 6px;
        }

        .settings-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        .btn-secondary {
          padding: 10px 20px;
          border: 1px solid #666;
          border-radius: 6px;
          background: #333;
          color: #fff;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.2s;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #444;
          border-color: #777;
        }

        .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .config-info {
          background: rgba(0, 0, 0, 0.3);
          padding: 12px;
          border-radius: 6px;
        }

        .config-info summary {
          cursor: pointer;
          color: #4a90e2;
          padding: 8px 0;
        }

        .config-path {
          margin-top: 8px;
        }

        .config-path code {
          background: #333;
          padding: 8px;
          border-radius: 4px;
          display: block;
          color: #4a90e2;
          word-break: break-all;
        }

        .config-path .note {
          margin-top: 8px;
          color: #888;
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
}

