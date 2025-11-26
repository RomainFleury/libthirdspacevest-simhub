namespace ThirdSpaceSimHub
{
    /// <summary>
    /// Represents a haptic command to send to the vest daemon.
    /// </summary>
    public class HapticCommand
    {
        /// <summary>
        /// Vest cell index (0-7).
        /// Layout:
        ///   FRONT          BACK
        /// ┌───┬───┐    ┌───┬───┐
        /// │ 0 │ 1 │    │ 4 │ 5 │  Upper
        /// ├───┼───┤    ├───┼───┤
        /// │ 2 │ 3 │    │ 6 │ 7 │  Lower
        /// └───┴───┘    └───┴───┘
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
    /// </summary>
    public static class VestCells
    {
        // Front cells
        public const int FrontUpperLeft = 0;
        public const int FrontUpperRight = 1;
        public const int FrontLowerLeft = 2;
        public const int FrontLowerRight = 3;

        // Back cells
        public const int BackUpperLeft = 4;
        public const int BackUpperRight = 5;
        public const int BackLowerLeft = 6;
        public const int BackLowerRight = 7;

        // Cell groups
        public static readonly int[] AllFront = { 0, 1, 2, 3 };
        public static readonly int[] AllBack = { 4, 5, 6, 7 };
        public static readonly int[] LeftSide = { 0, 2, 4, 6 };
        public static readonly int[] RightSide = { 1, 3, 5, 7 };
        public static readonly int[] UpperRow = { 0, 1, 4, 5 };
        public static readonly int[] LowerRow = { 2, 3, 6, 7 };
        public static readonly int[] All = { 0, 1, 2, 3, 4, 5, 6, 7 };
    }
}

