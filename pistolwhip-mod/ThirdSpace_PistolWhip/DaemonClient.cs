using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Sockets;
using System.Text;
using MelonLoader;

namespace ThirdSpace_PistolWhip
{
    /// <summary>
    /// TCP client for communicating with the Third Space Vest Python daemon.
    /// Protocol: Newline-delimited JSON over TCP (default port 5050).
    /// Reused from SUPERHOT VR mod with Pistol Whip-specific event format.
    /// </summary>
    public class DaemonClient : IDisposable
    {
        private TcpClient _client;
        private NetworkStream _stream;
        private string _host;
        private int _port;
        private bool _connected;
        private readonly object _sendLock = new object();
        private DateTime _lastReconnectAttempt = DateTime.MinValue;
        private readonly TimeSpan _reconnectCooldown = TimeSpan.FromSeconds(5);

        // Event throttling to prevent spam (important for rhythm game)
        private readonly Dictionary<string, DateTime> _lastEventTime = new Dictionary<string, DateTime>();
        private readonly TimeSpan _eventCooldown = TimeSpan.FromMilliseconds(50);

        public bool IsConnected => _connected && _client?.Connected == true;

        public DaemonClient()
        {
            _host = "127.0.0.1";
            _port = 5050;
        }

        /// <summary>
        /// Initialize with custom host/port, optionally from config file.
        /// </summary>
        public void Initialize(string configPath = null)
        {
            // Try to read manual IP from config file
            if (!string.IsNullOrEmpty(configPath) && File.Exists(configPath))
            {
                try
                {
                    var lines = File.ReadAllLines(configPath);
                    foreach (var line in lines)
                    {
                        var trimmed = line.Trim();
                        if (string.IsNullOrEmpty(trimmed) || trimmed.StartsWith("#"))
                            continue;

                        // Format: IP or IP:PORT
                        if (trimmed.Contains(":"))
                        {
                            var parts = trimmed.Split(':');
                            _host = parts[0];
                            if (parts.Length > 1 && int.TryParse(parts[1], out int port))
                                _port = port;
                        }
                        else
                        {
                            _host = trimmed;
                        }
                        MelonLogger.Msg($"[ThirdSpace] Using manual config: {_host}:{_port}");
                        break;
                    }
                }
                catch (Exception ex)
                {
                    MelonLogger.Warning($"[ThirdSpace] Failed to read config: {ex.Message}");
                }
            }
        }

        /// <summary>
        /// Connect to the daemon.
        /// </summary>
        public bool Connect()
        {
            if (IsConnected) return true;

            try
            {
                MelonLogger.Msg($"[ThirdSpace] Connecting to daemon at {_host}:{_port}...");
                _client = new TcpClient();
                _client.Connect(_host, _port);
                _stream = _client.GetStream();
                _connected = true;
                MelonLogger.Msg("[ThirdSpace] Connected to daemon!");
                return true;
            }
            catch (Exception ex)
            {
                MelonLogger.Warning($"[ThirdSpace] Connection failed: {ex.Message}");
                _connected = false;
                return false;
            }
        }

        /// <summary>
        /// Disconnect from the daemon.
        /// </summary>
        public void Disconnect()
        {
            try
            {
                _stream?.Close();
                _client?.Close();
            }
            catch { }
            finally
            {
                _stream = null;
                _client = null;
                _connected = false;
            }
        }

        /// <summary>
        /// Try to reconnect if disconnected (with cooldown).
        /// </summary>
        public bool TryReconnect()
        {
            if (IsConnected) return true;

            if (DateTime.Now - _lastReconnectAttempt < _reconnectCooldown)
                return false;

            _lastReconnectAttempt = DateTime.Now;
            return Connect();
        }

        /// <summary>
        /// Send a Pistol Whip game event to the daemon.
        /// </summary>
        public void SendEvent(string eventName, string hand = null, int priority = 0)
        {
            // Throttle events to prevent spam (critical for rhythm game)
            var eventKey = $"{eventName}_{hand ?? "none"}";
            lock (_lastEventTime)
            {
                if (_lastEventTime.TryGetValue(eventKey, out var lastTime))
                {
                    if (DateTime.Now - lastTime < _eventCooldown)
                        return;
                }
                _lastEventTime[eventKey] = DateTime.Now;
            }

            // Build JSON command
            var json = hand != null
                ? $"{{\"cmd\":\"pistolwhip_event\",\"event\":\"{eventName}\",\"hand\":\"{hand}\",\"priority\":{priority}}}"
                : $"{{\"cmd\":\"pistolwhip_event\",\"event\":\"{eventName}\",\"priority\":{priority}}}";

            SendRaw(json);
        }

        /// <summary>
        /// Send raw JSON command to daemon.
        /// </summary>
        private void SendRaw(string json)
        {
            if (!TryReconnect()) return;

            lock (_sendLock)
            {
                try
                {
                    var message = json + "\n";
                    var bytes = Encoding.UTF8.GetBytes(message);
                    _stream.Write(bytes, 0, bytes.Length);
                }
                catch (Exception ex)
                {
                    MelonLogger.Warning($"[ThirdSpace] Send failed: {ex.Message}");
                    _connected = false;
                }
            }
        }

        /// <summary>
        /// Stop all haptic effects.
        /// </summary>
        public void StopAll()
        {
            SendRaw("{\"cmd\":\"stop\"}");
        }

        public void Dispose()
        {
            Disconnect();
        }
    }
}

