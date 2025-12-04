import React from 'react';
import { useArmaReforgerIntegration } from '../hooks/useArmaReforgerIntegration';

// Event icons for visual feedback
const EVENT_ICONS: Record<string, string> = {
  // Player events
  player_damage: '💥',
  player_death: '💀',
  player_heal: '💚',
  player_suppressed: '😰',
  // Weapon events
  weapon_fire_rifle: '🔫',
  weapon_fire_mg: '⚔️',
  weapon_fire_pistol: '🔫',
  weapon_fire_launcher: '🚀',
  weapon_reload: '🔄',
  grenade_throw: '💣',
  // Vehicle events
  vehicle_collision: '💥',
  vehicle_damage: '🚗',
  vehicle_explosion: '🔥',
  helicopter_rotor: '🚁',
  // Environment events
  explosion_nearby: '💣',
  bullet_impact_near: '⚡',
};

export function ArmaReforgerIntegrationPanel() {
  const {
    status,
    isLoading,
    error,
    gameEvents,
    enable,
    disable,
    clearEvents,
  } = useArmaReforgerIntegration();

  const formatTime = (ts: number) => {
    const date = new Date(ts * 1000);
    return date.toLocaleTimeString();
  };

  const formatEventName = (name: string) => {
    return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatParams = (params?: Record<string, any>) => {
    if (!params || Object.keys(params).length === 0) return null;
    const parts: string[] = [];
    if (params.damage !== undefined) parts.push(`DMG: ${params.damage}`);
    if (params.angle !== undefined) parts.push(`${Math.round(params.angle)}°`);
    if (params.distance !== undefined) parts.push(`${params.distance.toFixed(1)}m`);
    if (params.severity !== undefined) parts.push(`${Math.round(params.severity * 100)}%`);
    if (params.hand) parts.push(params.hand);
    return parts.length > 0 ? parts.join(' | ') : null;
  };

  return (
    <div className="armareforger-panel">
      <div className="panel-header">
        <h3>🎖️ Arma Reforger</h3>
        <span className={`status-badge ${status.enabled ? 'active' : 'inactive'}`}>
          {status.enabled ? 'Active' : 'Inactive'}
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
              <span className="stat-label">Last Type</span>
              <span className="stat-value">{formatEventName(status.last_event_type)}</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="controls">
          <button
            onClick={status.enabled ? disable : enable}
            disabled={isLoading}
            className={status.enabled ? 'btn-danger' : 'btn-primary'}
          >
            {isLoading ? 'Loading...' : status.enabled ? 'Disable' : 'Enable'}
          </button>
        </div>

        {/* Mod Instructions */}
        <div className="mod-info">
          <details>
            <summary>📦 Mod Installation</summary>
            <div className="mod-details">
              <ol>
                <li>Subscribe to the <strong>Third Space Vest Mod</strong> on Arma Reforger Workshop (coming soon)</li>
                <li>Enable the mod in Arma Reforger's mod manager</li>
                <li>Start the Third Space daemon (port 5050)</li>
                <li>Launch Arma Reforger - the mod auto-connects</li>
              </ol>
              <p className="note">
                💡 The mod sends player damage, weapon fire, and vehicle events to the daemon.
              </p>
              <div className="supported-events">
                <strong>Supported Events:</strong>
                <ul>
                  <li>🔫 Weapon fire (rifle, MG, pistol, launcher)</li>
                  <li>💥 Player damage (directional)</li>
                  <li>💀 Player death</li>
                  <li>🚗 Vehicle collisions and damage</li>
                  <li>💣 Nearby explosions</li>
                  <li>😰 Suppression effects</li>
                </ul>
              </div>
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
                Waiting for events from Arma Reforger...
              </div>
            ) : (
              gameEvents.map((event, idx) => (
                <div key={idx} className="event-item">
                  <span className="event-icon">
                    {EVENT_ICONS[event.event] || '⚡'}
                  </span>
                  <span className="event-name">
                    {formatEventName(event.event)}
                  </span>
                  {formatParams(event.params) && (
                    <span className="event-params">
                      {formatParams(event.params)}
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
        .armareforger-panel {
          background: linear-gradient(135deg, #1a2e1a 0%, #16332e 100%);
          border: 1px solid #5a9e52;
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
          color: #5a9e52;
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
          font-size: 1.2rem;
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
          background: #5a9e52;
          color: white;
        }

        .btn-primary:hover {
          background: #6aba62;
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

        .mod-info {
          margin-bottom: 16px;
        }

        .mod-info summary {
          cursor: pointer;
          color: #5a9e52;
          padding: 8px 0;
        }

        .mod-details {
          background: rgba(0,0,0,0.3);
          padding: 12px;
          border-radius: 6px;
          margin-top: 8px;
        }

        .mod-details ol {
          margin: 0;
          padding-left: 20px;
          color: #ccc;
        }

        .mod-details li {
          margin-bottom: 6px;
        }

        .mod-details code {
          background: #333;
          padding: 2px 6px;
          border-radius: 3px;
          color: #5a9e52;
        }

        .mod-details a {
          color: #4fc3f7;
        }

        .mod-details .note {
          margin-top: 12px;
          font-size: 0.9rem;
          color: #888;
        }

        .supported-events {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #333;
        }

        .supported-events strong {
          color: #ccc;
        }

        .supported-events ul {
          margin: 8px 0 0 0;
          padding-left: 20px;
          color: #888;
        }

        .supported-events li {
          margin-bottom: 4px;
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

        .event-params {
          color: #5a9e52;
          font-size: 0.85rem;
          background: rgba(90, 158, 82, 0.2);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .event-time {
          color: #666;
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
}
