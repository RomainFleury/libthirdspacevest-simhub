namespace ThirdSpace_SuperhotVR
{
    /// <summary>
    /// Maps SuperHot VR events to haptic commands.
    /// The actual cell mapping is done on the daemon side for flexibility.
    /// This class just defines the event names used.
    /// </summary>
    public static class HapticEvents
    {
        // Combat events
        public const string Death = "death";
        public const string PunchHit = "punch_hit";
        public const string BulletParry = "bullet_parry";

        // Weapon events
        public const string PistolRecoil = "pistol_recoil";
        public const string ShotgunRecoil = "shotgun_recoil";
        public const string UziRecoil = "uzi_recoil";
        public const string NoAmmo = "no_ammo";

        // Action events
        public const string GrabObject = "grab_object";
        public const string GrabPyramid = "grab_pyramid";
        public const string Throw = "throw";

        // Special ability events
        public const string MindwaveCharge = "mindwave_charge";
        public const string MindwaveRelease = "mindwave_release";
    }

    /// <summary>
    /// Hand type for hand-specific haptics.
    /// </summary>
    public enum HandType
    {
        None,
        LeftHand,
        RightHand,
        Empty_LeftHand,
        Empty_RightHand
    }

    /// <summary>
    /// Pickable item types in SuperHot VR.
    /// </summary>
    public enum PickableItems
    {
        None,
        Pistol,
        Shotgun,
        Uzi,
        Knife,
        Throwable,
        Pyramid,
        Gun_NoAmmo
    }
}

