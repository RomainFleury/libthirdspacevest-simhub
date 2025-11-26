using GameReaderCommon;
using SimHub.Plugins;
using System;
using System.IO;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using Newtonsoft.Json;

namespace ThirdSpaceSimHub
{
    /// <summary>
    /// Third Space Vest haptic integration plugin for SimHub.
    /// 
    /// This plugin reads telemetry from any SimHub-compatible racing game
    /// and sends haptic commands to the Third Space Vest daemon.
    /// </summary>
    [PluginDescription("Third Space Vest haptic integration for sim racing")]
    [PluginAuthor("Third Space")]
    [PluginName("Third Space Vest")]
    public class ThirdSpacePlugin : IPlugin, IDataPlugin, IWPFSettingsV2
    {
        private DaemonClient _daemon;
        private TelemetryMapper _mapper;
        private PluginSettings _settings;
        private string _settingsPath;

        public PluginManager PluginManager { get; set; }
        public string LeftMenuTitle => "Third Space Vest";

        public ImageSource PictureIcon
        {
            get
            {
                try
                {
                    // Try to load the vest icon from embedded resources
                    return new BitmapImage(new Uri("pack://application:,,,/ThirdSpaceSimHub;component/vest-icon.png"));
                }
                catch
                {
                    return null;
                }
            }
        }

        // Expose settings for UI binding
        public PluginSettings Settings => _settings;
        public DaemonClient Daemon => _daemon;

        /// <summary>
        /// Plugin initialization - called when SimHub starts.
        /// </summary>
        public void Init(PluginManager pluginManager)
        {
            this.PluginManager = pluginManager;

            // Load or create settings
            _settingsPath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "SimHub",
                "ThirdSpaceSettings.json"
            );
            LoadSettings();

            // Initialize components
            _mapper = new TelemetryMapper(_settings);
            _daemon = new DaemonClient(_settings.DaemonHost, _settings.DaemonPort);

            // Connect logging
            _daemon.OnLog += msg => SimHub.Logging.Current.Info(msg);

            // Auto-connect if enabled
            if (_settings.AutoConnect)
            {
                _daemon.Connect();
            }

            SimHub.Logging.Current.Info("[ThirdSpace] Plugin initialized!");
        }

        /// <summary>
        /// Plugin shutdown - called when SimHub closes.
        /// </summary>
        public void End(PluginManager pluginManager)
        {
            SaveSettings();
            _daemon?.SendStop();
            _daemon?.Disconnect();
            _daemon?.Dispose();
            SimHub.Logging.Current.Info("[ThirdSpace] Plugin shutdown");
        }

        /// <summary>
        /// Data update - called every frame (~60Hz) with game telemetry.
        /// </summary>
        public void DataUpdate(PluginManager pluginManager, ref GameData data)
        {
            // Skip if no data, game not running, or not connected
            if (data?.NewData == null) return;
            if (!data.GameRunning) return;
            if (!_daemon.IsConnected)
            {
                _daemon.TryReconnect();
                return;
            }

            try
            {
                // Extract telemetry values
                var newData = data.NewData;

                // Get wheel rumble values (handle null FeedbackData)
                double frontLeftRumble = 0, frontRightRumble = 0, rearLeftRumble = 0, rearRightRumble = 0;
                if (newData.FeedbackData != null)
                {
                    frontLeftRumble = newData.FeedbackData.FrontLeftWheelRumble;
                    frontRightRumble = newData.FeedbackData.FrontRightWheelRumble;
                    rearLeftRumble = newData.FeedbackData.RearLeftWheelRumble;
                    rearRightRumble = newData.FeedbackData.RearRightWheelRumble;
                }

                // Map telemetry to haptic commands
                var commands = _mapper.MapTelemetry(
                    speedKmh: newData.SpeedKmh,
                    maxSpeedKmh: newData.MaxSpeedKmh > 0 ? newData.MaxSpeedKmh : 300,
                    brake: newData.Brake,
                    throttle: newData.Throttle,
                    accelerationSway: newData.AccelerationSway ?? 0,
                    accelerationSurge: newData.AccelerationSurge ?? 0,
                    gear: newData.Gear ?? "",
                    absActive: newData.ABSActive,
                    tcActive: newData.TCActive,
                    carDamage1: newData.CarDamage1,
                    carDamage2: newData.CarDamage2,
                    carDamage3: newData.CarDamage3,
                    carDamage4: newData.CarDamage4,
                    frontLeftRumble: frontLeftRumble,
                    frontRightRumble: frontRightRumble,
                    rearLeftRumble: rearLeftRumble,
                    rearRightRumble: rearRightRumble
                );

                // Send commands to daemon
                _daemon.SendTriggers(commands);
            }
            catch (Exception ex)
            {
                SimHub.Logging.Current.Error($"[ThirdSpace] DataUpdate error: {ex.Message}");
            }
        }

        /// <summary>
        /// Get the WPF settings control for the plugin.
        /// </summary>
        public Control GetWPFSettingsControl(PluginManager pluginManager)
        {
            return new SettingsView(this);
        }

        /// <summary>
        /// Manually connect to the daemon.
        /// </summary>
        public void Connect()
        {
            _daemon?.Disconnect();
            _daemon = new DaemonClient(_settings.DaemonHost, _settings.DaemonPort);
            _daemon.OnLog += msg => SimHub.Logging.Current.Info(msg);
            _daemon.Connect();
        }

        /// <summary>
        /// Manually disconnect from the daemon.
        /// </summary>
        public void Disconnect()
        {
            _daemon?.Disconnect();
        }

        /// <summary>
        /// Test haptic feedback by triggering all cells.
        /// </summary>
        public void TestHaptics()
        {
            if (!_daemon.IsConnected)
            {
                SimHub.Logging.Current.Warn("[ThirdSpace] Cannot test - not connected to daemon");
                return;
            }

            SimHub.Logging.Current.Info("[ThirdSpace] Testing all cells...");
            foreach (var cell in VestCells.All)
            {
                _daemon.SendTrigger(cell, 5);
            }
        }

        private void LoadSettings()
        {
            try
            {
                if (File.Exists(_settingsPath))
                {
                    var json = File.ReadAllText(_settingsPath);
                    _settings = JsonConvert.DeserializeObject<PluginSettings>(json) ?? new PluginSettings();
                    SimHub.Logging.Current.Info("[ThirdSpace] Settings loaded");
                }
                else
                {
                    _settings = new PluginSettings();
                }
            }
            catch (Exception ex)
            {
                SimHub.Logging.Current.Error($"[ThirdSpace] Failed to load settings: {ex.Message}");
                _settings = new PluginSettings();
            }
        }

        private void SaveSettings()
        {
            try
            {
                var directory = Path.GetDirectoryName(_settingsPath);
                if (!Directory.Exists(directory))
                    Directory.CreateDirectory(directory);

                var json = JsonConvert.SerializeObject(_settings, Formatting.Indented);
                File.WriteAllText(_settingsPath, json);
                SimHub.Logging.Current.Info("[ThirdSpace] Settings saved");
            }
            catch (Exception ex)
            {
                SimHub.Logging.Current.Error($"[ThirdSpace] Failed to save settings: {ex.Message}");
            }
        }
    }
}

