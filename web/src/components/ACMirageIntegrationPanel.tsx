import React, { useState } from 'react';
import { useACMirageIntegration } from '../hooks/useACMirageIntegration';

// Event icons for visual feedback
const EVENT_ICONS: Record<string, string> = {
  // Damage
  player_damage: '💥',
  player_damage_front: '💥',
  player_damage_back: '🔪',
  player_damage_left: '⬅️',
  player_damage_right: '➡️',
  player_death: '💀',
  // Assassinations
  assassination_kill: '🗡️',
  air_assassination: '🦅',
  // Combat
  sword_strike_right: '⚔️',
  sword_strike_left: '⚔️',
  dagger_strike: '🔪',
  parry_block: '🛡️',
  counter_attack: '⚡',
  // Environmental
  fall_damage: '⬇️',
  explosion: '💣',
  fire_damage: '🔥',
  // Stealth
  low_health_heartbeat: '❤️',
  detection_alert: '👁️',
  full_detection: '🚨',
  // Abilities
  eagle_vision: '🦅',
  focus_ability: '🎯',
};

export function ACMirageIntegrationPanel() {
  const {
    status,
    isLoading,
    error,
    gameEvents,
    start,
    stop,
    clearEvents,
  } = useACMirageIntegration();

  const [customLogPath, setCustomLogPath] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const formatTime = (ts: number) => {
    const date = new Date(ts * 1000);
    return date.toLocaleTimeString();
  };

  const formatEventName = (name: string) => {
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleStart = () => {
    start(customLogPath || undefined);
  };

  return (
    <div className="acmirage-panel">
      <div className="panel-header">
        <h3>🗡️ Assassin's Creed Mirage</h3>
        <span className={`status-badge ${status.running ? 'active' : 'inactive'}`}>
          {status.running ? 'Active' : 'Inactive'}
        </span>
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      <div className="panel-content">
        {/* Status Info */}
        <div className="status-info">
          <div className="stat">
            <span className="stat-label">Events Received</span>
            <span className="stat-value">{status.events_received}</span>
          </div>
          {status.last_event_ts && (
            <div className="stat">
              <span className="stat-label">Last Event</span>
              <span className="stat-value">{formatTime(status.last_event_ts)}</span>
            </div>
          )}
          {status.last_event_type && (
            <div className="stat">
              <span className="stat-label">Event Type</span>
              <span className="stat-value">{formatEventName(status.last_event_type)}</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="controls">
          <button
            onClick={status.running ? stop : handleStart}
            disabled={isLoading}
            className={status.running ? 'btn-danger' : 'btn-primary'}
          >
            {isLoading ? 'Loading...' : status.running ? 'Stop' : 'Start'}
          </button>
        </div>

        {/* Advanced Settings */}
        <div className="advanced-section">
          <button 
            className="btn-link" 
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? '▼' : '▶'} Advanced Settings
          </button>
          
          {showAdvanced && (
            <div className="advanced-content">
              <label>
                <span className="label-text">Custom Log Path (optional):</span>
                <input
                  type="text"
                  value={customLogPath}
                  onChange={(e) => setCustomLogPath(e.target.value)}
                  placeholder="%APPDATA%\Ubisoft\Assassin's Creed Mirage\logs"
                  className="path-input"
                  disabled={status.running}
                />
              </label>
              {status.log_path && (
                <p className="log-path-info">
                  📁 Currently watching: <code>{status.log_path}</code>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Setup Instructions */}
        <div className="mod-info">
          <details>
            <summary>📦 Setup Instructions</summary>
            <div className="mod-details">
              <p>This integration watches game logs for combat events.</p>
              <ol>
                <li>Start the Third Space Vest daemon (port 5050)</li>
                <li>Click "Start" above to begin watching logs</li>
                <li>Launch Assassin's Creed Mirage</li>
                <li>Play the game - haptics trigger on damage, kills, etc.</li>
              </ol>
              
              <h5>Supported Events:</h5>
              <ul className="event-list">
                <li><span className="event-icon">💥</span> Player Damage (directional)</li>
                <li><span className="event-icon">💀</span> Player Death</li>
                <li><span className="event-icon">🗡️</span> Assassination Kills</li>
                <li><span className="event-icon">⚔️</span> Sword/Dagger Strikes</li>
                <li><span className="event-icon">🛡️</span> Parry/Block</li>
                <li><span className="event-icon">👁️</span> Detection Alerts</li>
                <li><span className="event-icon">🦅</span> Eagle Vision</li>
              </ul>
              
              <p className="note">
                Note: Log detection depends on the game writing combat events to logs.
                If events aren't detected, try manual triggers from the Effects Library.
              </p>
            </div>
          </details>
        </div>

        {/* Live Events */}
        <div className="events-section">
          <div className="events-header">
            <h4>Live Events</h4>
            {gameEvents.length > 0 && (
              <button onClick={clearEvents} className="btn-small">
                Clear
              </button>
            )}
          </div>
          
          <div className="events-log">
            {gameEvents.length === 0 ? (
              <div className="no-events">
                Waiting for events from Assassin's Creed Mirage...
              </div>
            ) : (
              gameEvents.map((event, idx) => (
                <div key={idx} className="event-item">
                  <span className="event-icon">
                    {EVENT_ICONS[event.event_type] || '⚡'}
                  </span>
                  <span className="event-name">
                    {formatEventName(event.event_type)}
                  </span>
                  {event.damage && (
                    <span className="event-damage">
                      -{event.damage}
                    </span>
                  )}
                  {event.direction && (
                    <span className="event-direction">
                      ({event.direction})
                    </span>
                  )}
                  <span className="event-time">
                    {formatTime(event.timestamp)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style>{`
        .acmirage-panel {
          background: linear-gradient(135deg, #1a1a2e 0%, #1e3a5f 100%);
          border: 1px solid #d4af37;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .panel-header h3 {
          margin: 0;
          color: #d4af37;
          font-size: 1.2rem;
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: bold;
        }

        .status-badge.active {
          background: #00d26a;
          color: #000;
        }

        .status-badge.inactive {
          background: #666;
          color: #fff;
        }

        .error-message {
          background: #ff4444;
          color: white;
          padding: 10px;
          border-radius: 6px;
          margin-bottom: 16px;
        }

        .status-info {
          display: flex;
          gap: 24px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }

        .stat {
          display: flex;
          flex-direction: column;
        }

        .stat-label {
          color: #888;
          font-size: 0.85rem;
        }

        .stat-value {
          color: #fff;
          font-size: 1.1rem;
          font-weight: bold;
        }

        .controls {
          display: flex;
          gap: 10px;
          margin-bottom: 16px;
        }

        .controls button {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #d4af37;
          color: #000;
        }

        .btn-primary:hover {
          background: #e5c04a;
        }

        .btn-danger {
          background: #ff4444;
          color: white;
        }

        .btn-danger:hover {
          background: #ff6666;
        }

        .btn-small {
          padding: 4px 10px;
          font-size: 0.8rem;
          background: #333;
          color: #fff;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .btn-link {
          background: none;
          border: none;
          color: #d4af37;
          cursor: pointer;
          padding: 8px 0;
          font-size: 0.9rem;
        }

        .advanced-section {
          margin-bottom: 16px;
        }

        .advanced-content {
          background: rgba(0,0,0,0.3);
          padding: 12px;
          border-radius: 6px;
          margin-top: 8px;
        }

        .advanced-content label {
          display: block;
        }

        .label-text {
          display: block;
          color: #ccc;
          margin-bottom: 4px;
          font-size: 0.9rem;
        }

        .path-input {
          width: 100%;
          padding: 8px;
          background: #222;
          border: 1px solid #444;
          border-radius: 4px;
          color: #fff;
          font-family: monospace;
          font-size: 0.85rem;
        }

        .path-input:disabled {
          opacity: 0.5;
        }

        .log-path-info {
          margin-top: 8px;
          color: #888;
          font-size: 0.85rem;
        }

        .log-path-info code {
          background: #333;
          padding: 2px 6px;
          border-radius: 3px;
          color: #d4af37;
        }

        .mod-info {
          margin-bottom: 16px;
        }

        .mod-info summary {
          cursor: pointer;
          color: #d4af37;
          padding: 8px 0;
        }

        .mod-details {
          background: rgba(0,0,0,0.3);
          padding: 12px;
          border-radius: 6px;
          margin-top: 8px;
        }

        .mod-details p {
          color: #ccc;
          margin: 0 0 12px 0;
        }

        .mod-details ol {
          margin: 0;
          padding-left: 20px;
          color: #ccc;
        }

        .mod-details li {
          margin-bottom: 6px;
        }

        .mod-details h5 {
          color: #d4af37;
          margin: 16px 0 8px 0;
        }

        .event-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 4px;
        }

        .event-list li {
          color: #ccc;
          font-size: 0.9rem;
        }

        .mod-details .note {
          margin-top: 12px;
          font-size: 0.85rem;
          color: #888;
          font-style: italic;
        }

        .events-section {
          border-top: 1px solid #333;
          padding-top: 16px;
        }

        .events-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .events-header h4 {
          margin: 0;
          color: #fff;
        }

        .events-log {
          max-height: 200px;
          overflow-y: auto;
          background: rgba(0,0,0,0.3);
          border-radius: 6px;
          padding: 8px;
        }

        .no-events {
          color: #666;
          text-align: center;
          padding: 20px;
        }

        .event-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          border-bottom: 1px solid #222;
        }

        .event-item:last-child {
          border-bottom: none;
        }

        .event-icon {
          font-size: 1.2rem;
        }

        .event-name {
          flex: 1;
          color: #fff;
        }

        .event-damage {
          color: #ff6666;
          font-weight: bold;
          font-size: 0.9rem;
        }

        .event-direction {
          color: #d4af37;
          font-size: 0.85rem;
        }

        .event-time {
          color: #666;
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
}
