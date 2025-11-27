using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Sockets;
using System.Text;

namespace ThirdSpaceGTAV
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

        public DaemonClient(string host = "127.0.0.1", int port = 5050)
        {
            _host = host;
            _port = port;
        }

        /// <summary>
        /// Connect to the daemon.
        /// </summary>
        public bool Connect()
        {
            if (IsConnected) return true;

            try
            {
                GTA.UI.Notification.Show($"~b~[ThirdSpace]~w~ Connecting to daemon at {_host}:{_port}...");
                _client = new TcpClient();
                _client.Connect(_host, _port);
                _stream = _client.GetStream();
                _connected = true;
                GTA.UI.Notification.Show("~g~[ThirdSpace]~w~ Connected to daemon!");
                return true;
            }
            catch (Exception ex)
            {
                GTA.UI.Notification.Show($"~r~[ThirdSpace]~w~ Connection failed: {ex.Message}");
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
        /// Send a GTA V game event to the daemon.
        /// </summary>
        public void SendEvent(string eventName, Dictionary<string, object> parameters = null)
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
            var json = new StringBuilder();
            json.Append("{");
            json.Append($"\"cmd\":\"gtav_event\",");
            json.Append($"\"event\":\"{eventName}\"");

            if (parameters != null && parameters.Count > 0)
            {
                foreach (var param in parameters)
                {
                    json.Append(",");
                    if (param.Value is string)
                        json.Append($"\"{param.Key}\":\"{param.Value}\"");
                    else if (param.Value is bool)
                        json.Append($"\"{param.Key}\":{param.Value.ToString().ToLower()}");
                    else
                        json.Append($"\"{param.Key}\":{param.Value}");
                }
            }

            json.Append("}");

            SendRaw(json.ToString());
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
                    GTA.UI.Notification.Show($"~r~[ThirdSpace]~w~ Send failed: {ex.Message}");
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

