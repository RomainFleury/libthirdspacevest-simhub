import React from 'react';
import { useWalkingDeadIntegration } from '../hooks/useWalkingDeadIntegration';

// Event icons for visual feedback
const EVENT_ICONS: Record<string, string> = {
  gun_fire: '🔫',
  gun_fire_two_hand: '💥',
  zombie_grab: '🧟',
  zombie_hold: '🤛',
  zombie_release: '✋',
  damage: '💔',
  bullet_hit: '🎯',
  healing: '💚',
  low_health: '❤️',
  low_health_start: '❤️',
  low_health_stop: '💚',
  low_stamina: '😤',
  low_stamina_start: '😤',
  low_stamina_stop: '💨',
  eating: '🍖',
  eating_start: '🍖',
  eating_stop: '✅',
  backpack_out: '🎒',
  backpack_in: '🎒',
  shoulder_out: '📦',
  shoulder_in: '📦',
  item_store: '📥',
  lamp_out: '🔦',
  book_out: '📖',
};

export function WalkingDeadIntegrationPanel() {
  const {
    status,
    isLoading,
    error,
    gameEvents,
    enable,
    disable,
    clearEvents,
  } = useWalkingDeadIntegration();

  const formatTime = (ts: number) => {
    const date = new Date(ts * 1000);
    return date.toLocaleTimeString();
  };

  const formatEventName = (name: string) => {
    return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="walkingdead-panel">
      <div className="panel-header">
        <h3>🧟 Walking Dead: S&S</h3>
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
              <span className="stat-label">Event Type</span>
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

        {/* Setup Instructions */}
        <div className="mod-info">
          <details>
            <summary>📦 Setup Instructions</summary>
            <div className="mod-details">
              <h5>⚠️ Important: Version-Specific</h5>
              <p className="warning">
                Walking Dead: Saints and Sinners uses Unreal Engine, so this integration
                requires a memory reader that only works with specific game versions.
              </p>
              
              <h5>Requirements</h5>
              <ol>
                <li>Python 3.9+ with PyMeow</li>
                <li>Walking Dead: S&S (Steam or Oculus)</li>
                <li>Third Space Vest daemon running</li>
              </ol>
              
              <h5>Setup</h5>
              <ol>
                <li>Start the daemon: <code>python -m modern_third_space.cli daemon start</code></li>
                <li>Start the memory reader: <code>python walkingdead_reader.py</code></li>
                <li>Launch Walking Dead: Saints and Sinners</li>
                <li>Enable integration in this panel</li>
              </ol>
              
              <p className="note">
                <strong>Reference:</strong> Based on{' '}
                <a href="https://github.com/McFredward/twd_bhaptics" target="_blank" rel="noreferrer">
                  twd_bhaptics
                </a>{' '}
                by McFredward
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
                Waiting for events from Walking Dead...
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
                  {(event.hand || event.side) && (
                    <span className="event-side">
                      ({event.hand || event.side})
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
        .walkingdead-panel {
          background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
          border: 1px solid #4a7c2a;
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
          color: #6dbf47;
          font-size: 1.2rem;
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: bold;
        }

        .status-badge.active {
          background: #6dbf47;
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
          background: #6dbf47;
          color: white;
        }

        .btn-primary:hover {
          background: #8ed466;
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
          color: #6dbf47;
          padding: 8px 0;
        }

        .mod-details {
          background: rgba(0,0,0,0.3);
          padding: 12px;
          border-radius: 6px;
          margin-top: 8px;
        }

        .mod-details h5 {
          margin: 12px 0 8px;
          color: #6dbf47;
        }

        .mod-details h5:first-child {
          margin-top: 0;
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
          color: #6dbf47;
        }

        .mod-details a {
          color: #4fc3f7;
        }

        .mod-details .note {
          margin-top: 12px;
          font-size: 0.9rem;
          color: #888;
        }

        .mod-details .warning {
          color: #f4a460;
          font-size: 0.9rem;
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

        .event-side {
          color: #6dbf47;
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
