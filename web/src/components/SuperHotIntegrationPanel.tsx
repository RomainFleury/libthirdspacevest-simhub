import React from 'react';
import { useSuperHotIntegration } from '../hooks/useSuperHotIntegration';

// Event icons for visual feedback
const EVENT_ICONS: Record<string, string> = {
  death: '💀',
  punch_hit: '👊',
  bullet_parry: '🛡️',
  pistol_recoil: '🔫',
  shotgun_recoil: '💥',
  uzi_recoil: '🔥',
  no_ammo: '❌',
  grab_object: '✋',
  grab_pyramid: '🔺',
  throw: '🎯',
  mindwave_charge: '⚡',
  mindwave_release: '💫',
};

export function SuperHotIntegrationPanel() {
  const {
    status,
    isLoading,
    error,
    gameEvents,
    enable,
    disable,
    clearEvents,
  } = useSuperHotIntegration();

  const formatTime = (ts: number) => {
    const date = new Date(ts * 1000);
    return date.toLocaleTimeString();
  };

  const formatEventName = (name: string) => {
    return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="superhot-panel">
      <div className="panel-header">
        <h3>🔥 SUPERHOT VR</h3>
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
                <li>Install <a href="https://github.com/LavaGang/MelonLoader/releases" target="_blank" rel="noreferrer">MelonLoader 0.7.0+</a></li>
                <li>Download <code>ThirdSpace_SuperhotVR.dll</code></li>
                <li>Copy to <code>SUPERHOT VR/Mods/</code></li>
                <li>Start the daemon (port 5050)</li>
                <li>Launch SUPERHOT VR</li>
              </ol>
              <p className="note">
                The mod auto-connects to the daemon on localhost:5050
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
                Waiting for events from SUPERHOT VR...
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
                  {event.hand && (
                    <span className="event-hand">
                      ({event.hand})
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
        .superhot-panel {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border: 1px solid #e94560;
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
          color: #e94560;
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
          background: #e94560;
          color: white;
        }

        .btn-primary:hover {
          background: #ff6b6b;
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
          color: #e94560;
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
          color: #e94560;
        }

        .mod-details a {
          color: #4fc3f7;
        }

        .mod-details .note {
          margin-top: 12px;
          font-size: 0.9rem;
          color: #888;
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

        .event-hand {
          color: #e94560;
          font-size: 0.9rem;
        }

        .event-time {
          color: #666;
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
}

