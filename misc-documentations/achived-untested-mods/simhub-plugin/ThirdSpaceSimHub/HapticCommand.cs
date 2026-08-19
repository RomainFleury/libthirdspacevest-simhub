namespace ThirdSpaceSimHub
{
    /// <summary>
    /// Represents a haptic command to send to the vest daemon.
    /// </summary>
    public class HapticCommand
    {
        /// <summary>
        /// Vest cell index (0-7).
        /// 
        /// Hardware Layout (from reverse engineering):
        /// 
        ///       FRONT                    BACK
        ///   ┌─────┬─────┐          ┌─────┬─────┐
        ///   │  2  │  5  │  Upper   │  1  │  6  │
        ///   │ UL  │ UR  │          │ UL  │ UR  │
        ///   ├─────┼─────┤          ├─────┼─────┤
        ///   │  3  │  4  │  Lower   │  0  │  7  │
        ///   │ LL  │ LR  │          │ LL  │ LR  │
        ///   └─────┴─────┘          └─────┴─────┘
        ///     L     R                L     R
        /// </summary>
        public int Cell { get; set; }

        /// <summary>
        /// Intensity/speed (1-10).
        /// </summary>
        public int Speed { get; set; }

        public HapticCommand(int cell, int speed)
        {
            Cell = cell;
            Speed = speed;
        }

        public override string ToString() => $"Cell {Cell} @ Speed {Speed}";
    }

    /// <summary>
    /// Vest cell constants for readability.
    /// Based on hardware addressing from reverse engineering.
    /// </summary>
    public static class VestCells
    {
        // Front cells (correct hardware indices)
        public const int FrontUpperLeft = 2;
        public const int FrontUpperRight = 5;
        public const int FrontLowerLeft = 3;
        public const int FrontLowerRight = 4;

        // Back cells (correct hardware indices)
        public const int BackUpperLeft = 1;
        public const int BackUpperRight = 6;
        public const int BackLowerLeft = 0;
        public const int BackLowerRight = 7;

        // Cell groups (using correct indices)
        public static readonly int[] AllFront = { FrontUpperLeft, FrontUpperRight, FrontLowerLeft, FrontLowerRight };
        public static readonly int[] AllBack = { BackUpperLeft, BackUpperRight, BackLowerLeft, BackLowerRight };
        public static readonly int[] LeftSide = { FrontUpperLeft, FrontLowerLeft, BackUpperLeft, BackLowerLeft };
        public static readonly int[] RightSide = { FrontUpperRight, FrontLowerRight, BackUpperRight, BackLowerRight };
        public static readonly int[] UpperRow = { FrontUpperLeft, FrontUpperRight, BackUpperLeft, BackUpperRight };
        public static readonly int[] LowerRow = { FrontLowerLeft, FrontLowerRight, BackLowerLeft, BackLowerRight };
        public static readonly int[] All = { 0, 1, 2, 3, 4, 5, 6, 7 };
    }
}

