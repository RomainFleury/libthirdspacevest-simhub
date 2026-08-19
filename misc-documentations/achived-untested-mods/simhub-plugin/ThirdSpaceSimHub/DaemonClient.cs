using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace ThirdSpaceSimHub
{
    /// <summary>
    /// TCP client for communicating with the Third Space Vest Python daemon.
    /// Protocol: Newline-delimited JSON over TCP (port 5050).
    /// </summary>
    public class DaemonClient : IDisposable
    {
        private TcpClient _client;
        private NetworkStream _stream;
        private readonly string _host;
        private readonly int _port;
        private bool _connected;
        private readonly object _sendLock = new object();
        private DateTime _lastReconnectAttempt = DateTime.MinValue;
        private readonly TimeSpan _reconnectCooldown = TimeSpan.FromSeconds(3);

        // Throttling to prevent overwhelming the vest
        private readonly Dictionary<int, DateTime> _lastTriggerTime = new Dictionary<int, DateTime>();
        private readonly TimeSpan _triggerCooldown = TimeSpan.FromMilliseconds(50);

        public bool IsConnected => _connected && _client?.Connected == true;
        public string Host => _host;
        public int Port => _port;

        public event Action<string> OnLog;
        public event Action OnConnected;
        public event Action OnDisconnected;

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
                Log($"Connecting to daemon at {_host}:{_port}...");
                _client = new TcpClient();
                _client.Connect(_host, _port);
                _stream = _client.GetStream();
                _connected = true;
                Log("Connected to daemon!");
                OnConnected?.Invoke();
                return true;
            }
            catch (Exception ex)
            {
                Log($"Failed to connect: {ex.Message}");
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
                OnDisconnected?.Invoke();
                Log("Disconnected from daemon");
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
        /// Send a trigger command to activate a vest cell.
        /// </summary>
        public void SendTrigger(int cell, int speed)
        {
            // Validate parameters
            if (cell < 0 || cell > 7) return;
            speed = Math.Max(1, Math.Min(10, speed));

            // Throttle per-cell to prevent spam
            lock (_lastTriggerTime)
            {
                if (_lastTriggerTime.TryGetValue(cell, out var lastTime))
                {
                    if (DateTime.Now - lastTime < _triggerCooldown)
                        return;
                }
                _lastTriggerTime[cell] = DateTime.Now;
            }

            SendCommand(new { cmd = "trigger", cell, speed });
        }

        /// <summary>
        /// Send a batch of trigger commands.
        /// </summary>
        public void SendTriggers(IEnumerable<HapticCommand> commands)
        {
            foreach (var cmd in commands)
            {
                SendTrigger(cmd.Cell, cmd.Speed);
            }
        }

        /// <summary>
        /// Stop all active effects.
        /// </summary>
        public void SendStop()
        {
            SendCommand(new { cmd = "stop" });
        }

        /// <summary>
        /// Ping the daemon to check connection.
        /// </summary>
        public bool Ping()
        {
            try
            {
                SendCommand(new { cmd = "ping" });
                return true;
            }
            catch
            {
                return false;
            }
        }

        /// <summary>
        /// Send a JSON command to the daemon.
        /// </summary>
        private void SendCommand(object command)
        {
            if (!TryReconnect()) return;

            lock (_sendLock)
            {
                try
                {
                    var json = JsonConvert.SerializeObject(command) + "\n";
                    var bytes = Encoding.UTF8.GetBytes(json);
                    _stream.Write(bytes, 0, bytes.Length);
                }
                catch (Exception ex)
                {
                    Log($"Send failed: {ex.Message}");
                    _connected = false;
                }
            }
        }

        private void Log(string message)
        {
            OnLog?.Invoke($"[ThirdSpace] {message}");
        }

        public void Dispose()
        {
            Disconnect();
        }
    }
}

