using System;
using System.Collections.Generic;

namespace ThirdSpaceGTAV
{
    /// <summary>
    /// Maps GTA V events to haptic feedback directions and intensities.
    /// </summary>
    public static class HapticMapper
    {
        /// <summary>
        /// Calculate angle from player to damage source and map to directional cells.
        /// Returns list of cell indices (0-7) that should be activated.
        /// </summary>
        public static List<int> AngleToCells(float angleDegrees)
        {
            // Normalize angle to 0-360
            while (angleDegrees < 0) angleDegrees += 360;
            while (angleDegrees >= 360) angleDegrees -= 360;

            var cells = new List<int>();

            // Vest cell layout:
            // Front: 2 (UL), 5 (UR), 3 (LL), 4 (LR)
            // Back:  1 (UL), 6 (UR), 0 (LL), 7 (LR)

            if (angleDegrees >= 315 || angleDegrees < 45)
            {
                // Front (0-45° and 315-360°)
                cells.Add(2); // Front Upper Left
                cells.Add(5); // Front Upper Right
            }
            else if (angleDegrees >= 45 && angleDegrees < 135)
            {
                // Right side (45-135°)
                cells.Add(5); // Front Upper Right
                cells.Add(4); // Front Lower Right
                cells.Add(6); // Back Upper Right
                cells.Add(7); // Back Lower Right
            }
            else if (angleDegrees >= 135 && angleDegrees < 225)
            {
                // Back (135-225°)
                cells.Add(1); // Back Upper Left
                cells.Add(6); // Back Upper Right
                cells.Add(0); // Back Lower Left
                cells.Add(7); // Back Lower Right
            }
            else // 225-315
            {
                // Left side (225-315°)
                cells.Add(2); // Front Upper Left
                cells.Add(3); // Front Lower Left
                cells.Add(1); // Back Upper Left
                cells.Add(0); // Back Lower Left
            }

            return cells;
        }

        /// <summary>
        /// Calculate haptic intensity (speed 1-10) based on damage amount.
        /// </summary>
        public static int DamageToIntensity(float damageAmount)
        {
            // Scale damage (typically 0-100) to haptic speed (1-10)
            // Light damage (0-25): speed 3-5
            // Medium damage (25-50): speed 5-7
            // Heavy damage (50-100): speed 7-10
            if (damageAmount <= 0) return 0;
            if (damageAmount < 25) return Math.Max(3, (int)(damageAmount / 5));
            if (damageAmount < 50) return 5 + (int)((damageAmount - 25) / 12.5);
            return Math.Min(10, 7 + (int)((damageAmount - 50) / 16.67));
        }

        /// <summary>
        /// Get all cells for full-body effects (death, explosions).
        /// </summary>
        public static List<int> GetAllCells()
        {
            return new List<int> { 0, 1, 2, 3, 4, 5, 6, 7 };
        }
    }
}

