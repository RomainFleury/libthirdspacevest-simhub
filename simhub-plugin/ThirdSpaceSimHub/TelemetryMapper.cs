using System;
using System.Collections.Generic;

namespace ThirdSpaceSimHub
{
    /// <summary>
    /// Maps SimHub telemetry data to haptic commands for the Third Space Vest.
    /// </summary>
    public class TelemetryMapper
    {
        private readonly PluginSettings _settings;
        
        // State tracking for change detection
        private string _lastGear = "";
        private double _lastCarDamage1;
        private double _lastCarDamage2;
        private double _lastCarDamage3;
        private double _lastCarDamage4;
        private double _lastSpeed;

        public TelemetryMapper(PluginSettings settings)
        {
            _settings = settings;
        }

        /// <summary>
        /// Process telemetry data and generate haptic commands.
        /// </summary>
        public List<HapticCommand> MapTelemetry(
            double speedKmh,
            double maxSpeedKmh,
            double brake,
            double throttle,
            double accelerationSway,  // Lateral G-force (left/right)
            double accelerationSurge, // Longitudinal G-force (front/back)
            string gear,
            int absActive,
            int tcActive,
            double carDamage1,
            double carDamage2,
            double carDamage3,
            double carDamage4,
            double frontLeftRumble,
            double frontRightRumble,
            double rearLeftRumble,
            double rearRightRumble)
        {
            var commands = new List<HapticCommand>();

            // === BRAKING ===
            if (_settings.EnableBraking && brake > 10 && speedKmh > 10)
            {
                var brakeIntensity = CalculateIntensity(brake / 100.0 * (speedKmh / Math.Max(100, maxSpeedKmh)));
                var brakeSpeed = ScaleToSpeed(brakeIntensity * _settings.BrakingIntensity);
                
                if (brakeSpeed > 0)
                {
                    // Front cells for braking (deceleration pushes forward)
                    commands.Add(new HapticCommand(VestCells.FrontUpperLeft, brakeSpeed));
                    commands.Add(new HapticCommand(VestCells.FrontUpperRight, brakeSpeed));
                }
            }

            // === ACCELERATION ===
            if (_settings.EnableAcceleration && throttle > 50 && accelerationSurge > 0.2)
            {
                var accelIntensity = CalculateIntensity(accelerationSurge * (throttle / 100.0));
                var accelSpeed = ScaleToSpeed(accelIntensity * _settings.AccelerationIntensity);
                
                if (accelSpeed > 0)
                {
                    // Back cells for acceleration (pushes back into seat)
                    commands.Add(new HapticCommand(VestCells.BackUpperLeft, accelSpeed));
                    commands.Add(new HapticCommand(VestCells.BackUpperRight, accelSpeed));
                    commands.Add(new HapticCommand(VestCells.BackLowerLeft, accelSpeed));
                    commands.Add(new HapticCommand(VestCells.BackLowerRight, accelSpeed));
                }
            }

            // === CORNERING (G-Force) ===
            if (_settings.EnableGForce && Math.Abs(accelerationSway) > 0.3)
            {
                var gForceIntensity = CalculateIntensity(Math.Abs(accelerationSway));
                var gForceSpeed = ScaleToSpeed(gForceIntensity * _settings.GForceIntensity);
                
                if (gForceSpeed > 0)
                {
                    if (accelerationSway > 0) // Turning right - force pushes left
                    {
                        commands.Add(new HapticCommand(VestCells.FrontUpperLeft, gForceSpeed));
                        commands.Add(new HapticCommand(VestCells.FrontLowerLeft, gForceSpeed));
                        commands.Add(new HapticCommand(VestCells.BackUpperLeft, gForceSpeed));
                        commands.Add(new HapticCommand(VestCells.BackLowerLeft, gForceSpeed));
                    }
                    else // Turning left - force pushes right
                    {
                        commands.Add(new HapticCommand(VestCells.FrontUpperRight, gForceSpeed));
                        commands.Add(new HapticCommand(VestCells.FrontLowerRight, gForceSpeed));
                        commands.Add(new HapticCommand(VestCells.BackUpperRight, gForceSpeed));
                        commands.Add(new HapticCommand(VestCells.BackLowerRight, gForceSpeed));
                    }
                }
            }

            // === GEAR SHIFT ===
            if (_settings.EnableGearShift && gear != _lastGear && !string.IsNullOrEmpty(_lastGear))
            {
                // Brief pulse on gear change
                commands.Add(new HapticCommand(VestCells.BackUpperLeft, 5));
                commands.Add(new HapticCommand(VestCells.BackUpperRight, 5));
            }
            _lastGear = gear;

            // === IMPACT/COLLISION ===
            if (_settings.EnableImpact)
            {
                var impactSpeed = DetectImpact(carDamage1, carDamage2, carDamage3, carDamage4);
                if (impactSpeed > 0)
                {
                    // All cells for impact
                    foreach (var cell in VestCells.All)
                    {
                        commands.Add(new HapticCommand(cell, impactSpeed));
                    }
                }
            }

            // === ABS ACTIVE ===
            if (_settings.EnableABS && absActive > 0)
            {
                // Pulsing on front cells
                commands.Add(new HapticCommand(VestCells.FrontLowerLeft, 4));
                commands.Add(new HapticCommand(VestCells.FrontLowerRight, 4));
            }

            // === TRACTION CONTROL ===
            if (_settings.EnableTC && tcActive > 0)
            {
                // Pulsing on back cells
                commands.Add(new HapticCommand(VestCells.BackLowerLeft, 4));
                commands.Add(new HapticCommand(VestCells.BackLowerRight, 4));
            }

            // === SURFACE RUMBLE ===
            if (_settings.EnableRumble)
            {
                // Front-left wheel rumble
                if (frontLeftRumble > 1)
                {
                    var rumbleSpeed = ScaleToSpeed(frontLeftRumble * _settings.RumbleIntensity / 100);
                    if (rumbleSpeed > 0)
                        commands.Add(new HapticCommand(VestCells.FrontUpperLeft, rumbleSpeed));
                }
                // Front-right wheel rumble
                if (frontRightRumble > 1)
                {
                    var rumbleSpeed = ScaleToSpeed(frontRightRumble * _settings.RumbleIntensity / 100);
                    if (rumbleSpeed > 0)
                        commands.Add(new HapticCommand(VestCells.FrontUpperRight, rumbleSpeed));
                }
                // Rear-left wheel rumble
                if (rearLeftRumble > 1)
                {
                    var rumbleSpeed = ScaleToSpeed(rearLeftRumble * _settings.RumbleIntensity / 100);
                    if (rumbleSpeed > 0)
                        commands.Add(new HapticCommand(VestCells.BackLowerLeft, rumbleSpeed));
                }
                // Rear-right wheel rumble
                if (rearRightRumble > 1)
                {
                    var rumbleSpeed = ScaleToSpeed(rearRightRumble * _settings.RumbleIntensity / 100);
                    if (rumbleSpeed > 0)
                        commands.Add(new HapticCommand(VestCells.BackLowerRight, rumbleSpeed));
                }
            }

            _lastSpeed = speedKmh;
            return commands;
        }

        /// <summary>
        /// Detect collision based on damage increase.
        /// </summary>
        private int DetectImpact(double d1, double d2, double d3, double d4)
        {
            var increase1 = CalculateDamageIncrease(_lastCarDamage1, d1);
            var increase2 = CalculateDamageIncrease(_lastCarDamage2, d2);
            var increase3 = CalculateDamageIncrease(_lastCarDamage3, d3);
            var increase4 = CalculateDamageIncrease(_lastCarDamage4, d4);

            _lastCarDamage1 = d1;
            _lastCarDamage2 = d2;
            _lastCarDamage3 = d3;
            _lastCarDamage4 = d4;

            var maxIncrease = Math.Max(increase1, Math.Max(increase2, Math.Max(increase3, increase4)));
            
            if (maxIncrease > 0.1) // Significant damage increase
            {
                return ScaleToSpeed(Math.Min(1.0, maxIncrease * 2) * _settings.ImpactIntensity);
            }
            
            return 0;
        }

        private double CalculateDamageIncrease(double previous, double current)
        {
            if (current > previous)
                return current - previous;
            return 0;
        }

        /// <summary>
        /// Normalize intensity to 0-1 range with smoothing.
        /// </summary>
        private double CalculateIntensity(double value)
        {
            // Clamp to reasonable range and apply smoothing curve
            var clamped = Math.Max(0, Math.Min(1, value));
            // Apply slight curve to make low values more noticeable
            return Math.Pow(clamped, 0.7);
        }

        /// <summary>
        /// Scale 0-1 intensity to vest speed (1-10).
        /// </summary>
        private int ScaleToSpeed(double intensity)
        {
            if (intensity <= 0) return 0;
            return Math.Max(1, Math.Min(10, (int)(intensity * 10)));
        }
    }
}

