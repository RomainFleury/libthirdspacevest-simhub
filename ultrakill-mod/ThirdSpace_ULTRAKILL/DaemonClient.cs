using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Sockets;
using System.Text;
using System.Threading;

namespace ThirdSpace_ULTRAKILL
{
    /// <summary>
    /// TCP client for communicating with the Third Space Vest Python daemon.
    /// Protocol: Newline-delimited JSON over TCP (default port 5050).
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
                        ThirdSpace_ULTRAKILL.Log.LogInfo($"[ThirdSpace] Using manual config: {_host}:{_port}");
                        break;
                    }
                }
                catch (Exception ex)
                {
                    ThirdSpace_ULTRAKILL.Log.LogWarning($"[ThirdSpace] Failed to read config: {ex.Message}");
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
                ThirdSpace_ULTRAKILL.Log.LogInfo($"[ThirdSpace] Connecting to daemon at {_host}:{_port}...");
                _client = new TcpClient();
                _client.Connect(_host, _port);
                _stream = _client.GetStream();
                _connected = true;
                ThirdSpace_ULTRAKILL.Log.LogInfo("[ThirdSpace] Connected to daemon!");
                return true;
            }
            catch (Exception ex)
            {
                ThirdSpace_ULTRAKILL.Log.LogWarning($"[ThirdSpace] Connection failed: {ex.Message}");
                _connected = false;
                return false;
            }
        }

        /// <summary>
        /// Try to reconnect if disconnected.
        /// </summary>
        public bool TryReconnect()
        {
            if (IsConnected) return true;
            if (DateTime.Now - _lastReconnectAttempt < _reconnectCooldown)
                return false;

            _lastReconnectAttempt = DateTime.Now;
            Disconnect();
            return Connect();
        }

        /// <summary>
        /// Disconnect from daemon.
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
        /// Send a game event to the daemon.
        /// </summary>
        public bool SendEvent(string eventName, string direction = null, int? intensity = null)
        {
            // Throttle events
            string key = $"{eventName}_{direction}";
            if (_lastEventTime.TryGetValue(key, out DateTime lastTime))
            {
                if (DateTime.Now - lastTime < _eventCooldown)
                    return false;
            }
            _lastEventTime[key] = DateTime.Now;

            // Build JSON command
            var sb = new StringBuilder();
            sb.Append("{\"cmd\":\"ultrakill_event\",\"event\":\"");
            sb.Append(eventName);
            sb.Append("\"");

            if (!string.IsNullOrEmpty(direction))
            {
                sb.Append(",\"direction\":\"");
                sb.Append(direction);
                sb.Append("\"");
            }

            if (intensity.HasValue)
            {
                sb.Append(",\"intensity\":");
                sb.Append(intensity.Value);
            }

            sb.Append("}\n");

            return Send(sb.ToString());
        }

        /// <summary>
        /// Send stop all command.
        /// </summary>
        public bool StopAll()
        {
            return Send("{\"cmd\":\"stop\"}\n");
        }

        /// <summary>
        /// Send raw JSON command.
        /// </summary>
        private bool Send(string json)
        {
            if (!TryReconnect())
                return false;

            lock (_sendLock)
            {
                try
                {
                    byte[] data = Encoding.UTF8.GetBytes(json);
                    _stream.Write(data, 0, data.Length);
                    _stream.Flush();
                    return true;
                }
                catch (Exception ex)
                {
                    ThirdSpace_ULTRAKILL.Log.LogWarning($"[ThirdSpace] Send failed: {ex.Message}");
                    _connected = false;
                    return false;
                }
            }
        }

        public void Dispose()
        {
            Disconnect();
        }
    }
}
