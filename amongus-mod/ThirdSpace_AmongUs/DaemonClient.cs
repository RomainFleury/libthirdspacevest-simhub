using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Sockets;
using System.Text;
using BepInEx.Logging;

namespace ThirdSpace_AmongUs
{
    /// <summary>
    /// TCP client for communicating with the Third Space Vest Python daemon.
    /// Protocol: Newline-delimited JSON over TCP (default port 5050).
    /// Adapted from SUPERHOT VR/Pistol Whip mods for BepInEx.
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

        // Event throttling to prevent spam
        private readonly Dictionary<string, DateTime> _lastEventTime = new Dictionary<string, DateTime>();
        private readonly TimeSpan _eventCooldown = TimeSpan.FromMilliseconds(100);

        public bool IsConnected => _connected && _client?.Connected == true;

        public DaemonClient()
        {
            _host = "127.0.0.1";
            _port = 5050;
        }

        /// <summary>
        /// Initialize with custom host/port from config file.
        /// Config format:
        ///   [Network]
        ///   Host = 127.0.0.1
        ///   Port = 5050
        /// </summary>
        public void Initialize(string configPath = null)
        {
            if (!string.IsNullOrEmpty(configPath) && File.Exists(configPath))
            {
                try
                {
                    var lines = File.ReadAllLines(configPath);
                    foreach (var line in lines)
                    {
                        var trimmed = line.Trim();
                        if (string.IsNullOrEmpty(trimmed) || trimmed.StartsWith("#") || trimmed.StartsWith("["))
                            continue;

                        var parts = trimmed.Split('=');
                        if (parts.Length == 2)
                        {
                            var key = parts[0].Trim().ToLower();
                            var value = parts[1].Trim();

                            if (key == "host")
                                _host = value;
                            else if (key == "port" && int.TryParse(value, out int port))
                                _port = port;
                        }
                    }
                    ThirdSpace_AmongUs.Logger.LogInfo($"[ThirdSpace] Using config: {_host}:{_port}");
                }
                catch (Exception ex)
                {
                    ThirdSpace_AmongUs.Logger.LogWarning($"[ThirdSpace] Failed to read config: {ex.Message}");
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
                ThirdSpace_AmongUs.Logger.LogInfo($"[ThirdSpace] Connecting to daemon at {_host}:{_port}...");
                _client = new TcpClient();
                _client.Connect(_host, _port);
                _stream = _client.GetStream();
                _connected = true;
                ThirdSpace_AmongUs.Logger.LogInfo("[ThirdSpace] Connected to daemon!");
                return true;
            }
            catch (Exception ex)
            {
                ThirdSpace_AmongUs.Logger.LogWarning($"[ThirdSpace] Connection failed: {ex.Message}");
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
        /// Send an Among Us game event to the daemon.
        /// </summary>
        public void SendEvent(string eventName, int priority = 0)
        {
            // Throttle events to prevent spam
            lock (_lastEventTime)
            {
                if (_lastEventTime.TryGetValue(eventName, out var lastTime))
                {
                    if (DateTime.Now - lastTime < _eventCooldown)
                        return;
                }
                _lastEventTime[eventName] = DateTime.Now;
            }

            // Build JSON command
            var json = $"{{\"cmd\":\"amongus_event\",\"event\":\"{eventName}\",\"priority\":{priority}}}";
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
                    ThirdSpace_AmongUs.Logger.LogWarning($"[ThirdSpace] Send failed: {ex.Message}");
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
