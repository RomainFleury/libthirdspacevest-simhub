using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Threading;
using System;

namespace ThirdSpaceSimHub
{
    /// <summary>
    /// Settings view code-behind for the Third Space Vest plugin.
    /// </summary>
    public partial class SettingsView : UserControl
    {
        private readonly ThirdSpacePlugin _plugin;
        private readonly DispatcherTimer _statusTimer;
        private bool _isInitializing = true;

        public SettingsView(ThirdSpacePlugin plugin)
        {
            _plugin = plugin;
            InitializeComponent();

            // Initialize UI from settings
            LoadSettingsToUI();

            // Set up status polling
            _statusTimer = new DispatcherTimer
            {
                Interval = TimeSpan.FromSeconds(1)
            };
            _statusTimer.Tick += (s, e) => UpdateConnectionStatus();
            _statusTimer.Start();

            // Initial status update
            UpdateConnectionStatus();

            _isInitializing = false;
        }

        private void LoadSettingsToUI()
        {
            var settings = _plugin.Settings;

            // Connection
            HostTextBox.Text = settings.DaemonHost;
            PortTextBox.Text = settings.DaemonPort.ToString();
            AutoConnectCheckBox.IsChecked = settings.AutoConnect;

            // Effect toggles
            BrakingCheckBox.IsChecked = settings.EnableBraking;
            AccelerationCheckBox.IsChecked = settings.EnableAcceleration;
            GForceCheckBox.IsChecked = settings.EnableGForce;
            GearShiftCheckBox.IsChecked = settings.EnableGearShift;
            ImpactCheckBox.IsChecked = settings.EnableImpact;
            RumbleCheckBox.IsChecked = settings.EnableRumble;
            ABSCheckBox.IsChecked = settings.EnableABS;
            TCCheckBox.IsChecked = settings.EnableTC;

            // Intensity sliders
            BrakingSlider.Value = settings.BrakingIntensity;
            AccelerationSlider.Value = settings.AccelerationIntensity;
            GForceSlider.Value = settings.GForceIntensity;
            ImpactSlider.Value = settings.ImpactIntensity;
            RumbleSlider.Value = settings.RumbleIntensity;

            UpdateSliderLabels();

            // Wire up checkbox events
            BrakingCheckBox.Checked += CheckBox_Changed;
            BrakingCheckBox.Unchecked += CheckBox_Changed;
            AccelerationCheckBox.Checked += CheckBox_Changed;
            AccelerationCheckBox.Unchecked += CheckBox_Changed;
            GForceCheckBox.Checked += CheckBox_Changed;
            GForceCheckBox.Unchecked += CheckBox_Changed;
            GearShiftCheckBox.Checked += CheckBox_Changed;
            GearShiftCheckBox.Unchecked += CheckBox_Changed;
            ImpactCheckBox.Checked += CheckBox_Changed;
            ImpactCheckBox.Unchecked += CheckBox_Changed;
            RumbleCheckBox.Checked += CheckBox_Changed;
            RumbleCheckBox.Unchecked += CheckBox_Changed;
            ABSCheckBox.Checked += CheckBox_Changed;
            ABSCheckBox.Unchecked += CheckBox_Changed;
            TCCheckBox.Checked += CheckBox_Changed;
            TCCheckBox.Unchecked += CheckBox_Changed;
            AutoConnectCheckBox.Checked += CheckBox_Changed;
            AutoConnectCheckBox.Unchecked += CheckBox_Changed;

            // Wire up text box events
            HostTextBox.TextChanged += TextBox_Changed;
            PortTextBox.TextChanged += TextBox_Changed;
        }

        private void UpdateConnectionStatus()
        {
            if (_plugin.Daemon.IsConnected)
            {
                StatusIndicator.Fill = new SolidColorBrush(Color.FromRgb(129, 199, 132)); // Green
                StatusText.Text = $"Connected to {_plugin.Daemon.Host}:{_plugin.Daemon.Port}";
                StatusText.Foreground = new SolidColorBrush(Color.FromRgb(129, 199, 132));
            }
            else
            {
                StatusIndicator.Fill = new SolidColorBrush(Color.FromRgb(229, 115, 115)); // Red
                StatusText.Text = "Disconnected";
                StatusText.Foreground = new SolidColorBrush(Color.FromRgb(229, 115, 115));
            }
        }

        private void UpdateSliderLabels()
        {
            BrakingValueText.Text = $"{BrakingSlider.Value:F1}x";
            AccelerationValueText.Text = $"{AccelerationSlider.Value:F1}x";
            GForceValueText.Text = $"{GForceSlider.Value:F1}x";
            ImpactValueText.Text = $"{ImpactSlider.Value:F1}x";
            RumbleValueText.Text = $"{RumbleSlider.Value:F1}x";
        }

        private void SaveSettingsFromUI()
        {
            if (_isInitializing) return;

            var settings = _plugin.Settings;

            // Connection
            settings.DaemonHost = HostTextBox.Text;
            if (int.TryParse(PortTextBox.Text, out int port))
                settings.DaemonPort = port;
            settings.AutoConnect = AutoConnectCheckBox.IsChecked ?? true;

            // Effect toggles
            settings.EnableBraking = BrakingCheckBox.IsChecked ?? true;
            settings.EnableAcceleration = AccelerationCheckBox.IsChecked ?? true;
            settings.EnableGForce = GForceCheckBox.IsChecked ?? true;
            settings.EnableGearShift = GearShiftCheckBox.IsChecked ?? true;
            settings.EnableImpact = ImpactCheckBox.IsChecked ?? true;
            settings.EnableRumble = RumbleCheckBox.IsChecked ?? true;
            settings.EnableABS = ABSCheckBox.IsChecked ?? true;
            settings.EnableTC = TCCheckBox.IsChecked ?? true;

            // Intensity sliders
            settings.BrakingIntensity = BrakingSlider.Value;
            settings.AccelerationIntensity = AccelerationSlider.Value;
            settings.GForceIntensity = GForceSlider.Value;
            settings.ImpactIntensity = ImpactSlider.Value;
            settings.RumbleIntensity = RumbleSlider.Value;
        }

        private void ConnectButton_Click(object sender, RoutedEventArgs e)
        {
            SaveSettingsFromUI();
            _plugin.Connect();
            UpdateConnectionStatus();
        }

        private void DisconnectButton_Click(object sender, RoutedEventArgs e)
        {
            _plugin.Disconnect();
            UpdateConnectionStatus();
        }

        private void TestButton_Click(object sender, RoutedEventArgs e)
        {
            _plugin.TestHaptics();
        }

        private void Slider_ValueChanged(object sender, RoutedPropertyChangedEventArgs<double> e)
        {
            UpdateSliderLabels();
            SaveSettingsFromUI();
        }

        private void CheckBox_Changed(object sender, RoutedEventArgs e)
        {
            SaveSettingsFromUI();
        }

        private void TextBox_Changed(object sender, TextChangedEventArgs e)
        {
            SaveSettingsFromUI();
        }
    }
}

