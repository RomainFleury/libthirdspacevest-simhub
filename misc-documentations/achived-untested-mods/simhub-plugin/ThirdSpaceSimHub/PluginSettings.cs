using System.ComponentModel;
using System.Runtime.CompilerServices;

namespace ThirdSpaceSimHub
{
    /// <summary>
    /// Plugin settings that can be configured via the UI.
    /// </summary>
    public class PluginSettings : INotifyPropertyChanged
    {
        // Connection settings
        private string _daemonHost = "127.0.0.1";
        private int _daemonPort = 5050;
        private bool _autoConnect = true;

        // Effect enables
        private bool _enableBraking = true;
        private bool _enableAcceleration = true;
        private bool _enableGForce = true;
        private bool _enableGearShift = true;
        private bool _enableImpact = true;
        private bool _enableABS = true;
        private bool _enableTC = true;
        private bool _enableRumble = true;

        // Effect intensities (0.0 - 2.0, where 1.0 is default)
        private double _brakingIntensity = 1.0;
        private double _accelerationIntensity = 1.0;
        private double _gForceIntensity = 1.0;
        private double _impactIntensity = 1.0;
        private double _rumbleIntensity = 0.5;

        #region Connection Properties

        public string DaemonHost
        {
            get => _daemonHost;
            set { _daemonHost = value; OnPropertyChanged(); }
        }

        public int DaemonPort
        {
            get => _daemonPort;
            set { _daemonPort = value; OnPropertyChanged(); }
        }

        public bool AutoConnect
        {
            get => _autoConnect;
            set { _autoConnect = value; OnPropertyChanged(); }
        }

        #endregion

        #region Effect Enable Properties

        public bool EnableBraking
        {
            get => _enableBraking;
            set { _enableBraking = value; OnPropertyChanged(); }
        }

        public bool EnableAcceleration
        {
            get => _enableAcceleration;
            set { _enableAcceleration = value; OnPropertyChanged(); }
        }

        public bool EnableGForce
        {
            get => _enableGForce;
            set { _enableGForce = value; OnPropertyChanged(); }
        }

        public bool EnableGearShift
        {
            get => _enableGearShift;
            set { _enableGearShift = value; OnPropertyChanged(); }
        }

        public bool EnableImpact
        {
            get => _enableImpact;
            set { _enableImpact = value; OnPropertyChanged(); }
        }

        public bool EnableABS
        {
            get => _enableABS;
            set { _enableABS = value; OnPropertyChanged(); }
        }

        public bool EnableTC
        {
            get => _enableTC;
            set { _enableTC = value; OnPropertyChanged(); }
        }

        public bool EnableRumble
        {
            get => _enableRumble;
            set { _enableRumble = value; OnPropertyChanged(); }
        }

        #endregion

        #region Intensity Properties

        public double BrakingIntensity
        {
            get => _brakingIntensity;
            set { _brakingIntensity = Clamp(value, 0, 2); OnPropertyChanged(); }
        }

        public double AccelerationIntensity
        {
            get => _accelerationIntensity;
            set { _accelerationIntensity = Clamp(value, 0, 2); OnPropertyChanged(); }
        }

        public double GForceIntensity
        {
            get => _gForceIntensity;
            set { _gForceIntensity = Clamp(value, 0, 2); OnPropertyChanged(); }
        }

        public double ImpactIntensity
        {
            get => _impactIntensity;
            set { _impactIntensity = Clamp(value, 0, 2); OnPropertyChanged(); }
        }

        public double RumbleIntensity
        {
            get => _rumbleIntensity;
            set { _rumbleIntensity = Clamp(value, 0, 2); OnPropertyChanged(); }
        }

        #endregion

        #region INotifyPropertyChanged

        public event PropertyChangedEventHandler PropertyChanged;

        protected virtual void OnPropertyChanged([CallerMemberName] string propertyName = null)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }

        #endregion

        private static double Clamp(double value, double min, double max)
        {
            if (value < min) return min;
            if (value > max) return max;
            return value;
        }
    }
}

