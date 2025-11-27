using System;
using GTA;

namespace ThirdSpaceGTAV
{
    /// <summary>
    /// Third Space Vest haptic integration for Grand Theft Auto V.
    /// 
    /// This Script Hook V .NET mod detects player damage and death events
    /// and sends haptic commands to the Third Space Vest Python daemon.
    /// </summary>
    public class ThirdSpaceGTAV : Script
    {
        private DaemonClient _daemon;
        private EventHooks _eventHooks;
        private bool _initialized = false;

        public ThirdSpaceGTAV()
        {
            // Set tick interval (60 FPS = ~16ms)
            Tick += OnTick;
            Interval = 16;

            // Initialize daemon client
            _daemon = new DaemonClient("127.0.0.1", 5050);
            
            // Initialize event hooks
            _eventHooks = new EventHooks(_daemon);

            // Try to connect to daemon
            if (_daemon.Connect())
            {
                GTA.UI.Notification.Show("~g~[ThirdSpace]~w~ Haptic feedback enabled!");
            }
            else
            {
                GTA.UI.Notification.Show("~r~[ThirdSpace]~w~ Could not connect to daemon. Make sure it's running on port 5050.");
                GTA.UI.Notification.Show("~y~[ThirdSpace]~w~ Start daemon: python -m modern_third_space.cli daemon start");
            }
        }

        private void OnTick(object sender, EventArgs e)
        {
            // Initialize on first tick (game must be loaded)
            if (!_initialized)
            {
                if (Game.Player.Character != null && Game.Player.Character.Exists())
                {
                    _eventHooks.Initialize();
                    _initialized = true;
                }
                return;
            }

            // Update event hooks
            _eventHooks.Update();

            // Try to reconnect if disconnected
            if (!_daemon.IsConnected)
            {
                _daemon.TryReconnect();
            }
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                _daemon?.StopAll();
                _daemon?.Dispose();
            }
            base.Dispose(disposing);
        }
    }
}

