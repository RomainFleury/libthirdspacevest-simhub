using HarmonyLib;
using MelonLoader;
using System;
using System.IO;
using UnityEngine;

[assembly: MelonInfo(typeof(ThirdSpace_SuperhotVR.ThirdSpace_SuperhotVR), "ThirdSpace_SuperhotVR", "1.0.0", "ThirdSpace")]
[assembly: MelonGame("SUPERHOT_Team", "SUPERHOT_VR")]

namespace ThirdSpace_SuperhotVR
{
    /// <summary>
    /// Third Space Vest haptic integration for SUPERHOT VR.
    /// Based on OWO_SuperhotVR mod, adapted for Third Space Vest daemon.
    /// </summary>
    public class ThirdSpace_SuperhotVR : MelonMod
    {
        public static DaemonClient daemon;
        private static bool _mindwaveCharging = false;

        public override void OnInitializeMelon()
        {
            MelonLogger.Msg("[ThirdSpace] Initializing Third Space Vest integration...");

            daemon = new DaemonClient();

            // Check for manual IP config
            string configPath = Path.Combine(Directory.GetCurrentDirectory(), "Mods", "ThirdSpace_Config.txt");
            daemon.Initialize(configPath);

            // Connect to daemon
            if (daemon.Connect())
            {
                MelonLogger.Msg("[ThirdSpace] Ready for haptic feedback!");
            }
            else
            {
                MelonLogger.Warning("[ThirdSpace] Could not connect to daemon. Make sure it's running on port 5050.");
                MelonLogger.Warning("[ThirdSpace] Start daemon with: python -m modern_third_space.cli daemon start");
            }
        }

        public override void OnDeinitializeMelon()
        {
            MelonLogger.Msg("[ThirdSpace] Shutting down...");
            daemon?.StopAll();
            daemon?.Dispose();
        }

        #region Helper Methods

        private static string GetHandString(HandType hand)
        {
            switch (hand)
            {
                case HandType.LeftHand:
                case HandType.Empty_LeftHand:
                    return "left";
                case HandType.RightHand:
                case HandType.Empty_RightHand:
                    return "right";
                default:
                    return null;
            }
        }

        private static HandType GetHandFromControllerString(string controllerName)
        {
            if (controllerName.Contains("Right"))
                return HandType.RightHand;
            if (controllerName.Contains("Left"))
                return HandType.LeftHand;
            return HandType.None;
        }

        private static PickableItems GetGunType(Gun gun)
        {
            if (gun.ammoCount <= 0)
                return PickableItems.Gun_NoAmmo;

            if (gun is ShotGun)
                return PickableItems.Shotgun;
            if (gun is UziGun)
                return PickableItems.Uzi;
            if (gun is PistolGun)
                return PickableItems.Pistol;

            return PickableItems.None;
        }

        #endregion

        #region Harmony Patches

        /// <summary>
        /// Player death - full body haptic feedback.
        /// </summary>
        [HarmonyPatch(typeof(PlayerActionsVR), "Kill", new Type[] { typeof(Vector3), typeof(bool), typeof(bool), typeof(bool) })]
        public class Patch_KillPlayer
        {
            [HarmonyPostfix]
            public static void Postfix(Vector3 killerObjectPosition, bool switchToBlack, bool hardKill, bool forced)
            {
                if (daemon == null || !daemon.IsConnected) return;

                daemon.StopAll();
                daemon.SendEvent(HapticEvents.Death, priority: 4);
                MelonLogger.Msg("[ThirdSpace] Event: Death");
            }
        }

        /// <summary>
        /// Pick up item - hand-specific feedback.
        /// </summary>
        [HarmonyPatch(typeof(VrPickingSystem), "PickupItem", new Type[] { typeof(VrHandController), typeof(PickupProxy), typeof(GrabTypes) })]
        public class Patch_PickUpItem
        {
            [HarmonyPostfix]
            public static void PostFix(VrPickingSystem __instance, VrHandController handController, PickupProxy pickup, GrabTypes grabType)
            {
                if (daemon == null || !daemon.IsConnected) return;

                string eventName = pickup.GameObject.name == "TeleportPyramid"
                    ? HapticEvents.GrabPyramid
                    : HapticEvents.GrabObject;

                HandType hand = GetHandFromControllerString(handController.CurrentController.ToString());
                string handStr = GetHandString(hand);

                daemon.SendEvent(eventName, handStr, priority: 2);
                MelonLogger.Msg($"[ThirdSpace] Event: {eventName} ({handStr})");
            }
        }

        /// <summary>
        /// Punch hit - intercepted via haptic system.
        /// </summary>
        [HarmonyPatch(typeof(VrHapticSystem), "SetVibration", new Type[] { typeof(Controller), typeof(string), typeof(float) })]
        public class Patch_SetVibration
        {
            [HarmonyPostfix]
            public static void PostFix(Controller controller, string preset, float multiplier)
            {
                if (daemon == null || !daemon.IsConnected) return;
                if (preset != "Punch") return;

                HandType hand = GetHandFromControllerString(controller.ToString());
                string handStr = GetHandString(hand);

                daemon.SendEvent(HapticEvents.PunchHit, handStr, priority: 2);
                MelonLogger.Msg($"[ThirdSpace] Event: Punch Hit ({handStr})");
            }
        }

        /// <summary>
        /// Fire gun (pistol).
        /// </summary>
        [HarmonyPatch(typeof(Gun), "Fire", new Type[] { typeof(Ray), typeof(LayerMask), typeof(Gun) })]
        public class Patch_FireGun
        {
            [HarmonyPostfix]
            public static void PostFix(Ray ray, LayerMask mask, Gun weapon)
            {
                if (daemon == null || !daemon.IsConnected) return;
                if (weapon == null) return;

                try
                {
                    HandType hand = GetHandFromControllerString(weapon.gameObject.transform.parent.parent.parent.ToString());
                    string handStr = GetHandString(hand);
                    PickableItems gunType = GetGunType(weapon);

                    string eventName = gunType == PickableItems.Shotgun
                        ? HapticEvents.ShotgunRecoil
                        : HapticEvents.PistolRecoil;

                    daemon.SendEvent(eventName, handStr, priority: 2);
                    MelonLogger.Msg($"[ThirdSpace] Event: {eventName} ({handStr})");
                }
                catch { }
            }
        }

        /// <summary>
        /// Fire shotgun.
        /// </summary>
        [HarmonyPatch(typeof(ShotGun), "Fire", new Type[] { typeof(Ray), typeof(LayerMask), typeof(ShotGun) })]
        public class Patch_FireShotgun
        {
            [HarmonyPostfix]
            public static void PostFix(Ray ray, LayerMask mask, Gun weapon)
            {
                if (daemon == null || !daemon.IsConnected) return;
                if (weapon == null) return;

                try
                {
                    HandType hand = GetHandFromControllerString(weapon.gameObject.transform.parent.parent.parent.ToString());
                    string handStr = GetHandString(hand);

                    daemon.SendEvent(HapticEvents.ShotgunRecoil, handStr, priority: 2);
                    MelonLogger.Msg($"[ThirdSpace] Event: Shotgun Recoil ({handStr})");
                }
                catch { }
            }
        }

        /// <summary>
        /// Fire uzi - rapid fire weapon.
        /// </summary>
        [HarmonyPatch(typeof(UziGun), "ShootUziBullets")]
        public class Patch_FireUzi
        {
            [HarmonyPostfix]
            public static void PostFix(UziGun __instance)
            {
                if (daemon == null || !daemon.IsConnected) return;

                try
                {
                    HandType hand = GetHandFromControllerString(__instance.gameObject.transform.parent.parent.parent.ToString());
                    string handStr = GetHandString(hand);

                    daemon.SendEvent(HapticEvents.UziRecoil, handStr, priority: 2);
                    // Note: No logging for uzi since it fires rapidly
                }
                catch { }
            }
        }

        /// <summary>
        /// No ammo click.
        /// </summary>
        [HarmonyPatch(typeof(Gun), "FireNoAmmo")]
        public class Patch_NoAmmo
        {
            [HarmonyPostfix]
            public static void PostFix(Gun __instance)
            {
                if (daemon == null || !daemon.IsConnected) return;

                try
                {
                    HandType hand = GetHandFromControllerString(__instance.gameObject.transform.parent.parent.parent.ToString());
                    string handStr = GetHandString(hand);

                    daemon.SendEvent(HapticEvents.NoAmmo, handStr, priority: 2);
                    MelonLogger.Msg($"[ThirdSpace] Event: No Ammo ({handStr})");
                }
                catch { }
            }
        }

        /// <summary>
        /// Bullet parry with hand/melee.
        /// </summary>
        [HarmonyPatch(typeof(VrHandController), "ApplyHit", new Type[] { })]
        public class Patch_ParryBullet
        {
            [HarmonyPostfix]
            public static void PostFix(VrHandController __instance)
            {
                if (daemon == null || !daemon.IsConnected) return;

                HandType hand = GetHandFromControllerString(__instance.CurrentController.ToString());
                string handStr = GetHandString(hand);

                daemon.SendEvent(HapticEvents.BulletParry, handStr, priority: 3);
                MelonLogger.Msg($"[ThirdSpace] Event: Bullet Parry ({handStr})");
            }
        }

        /// <summary>
        /// Throw item - velocity-based trigger.
        /// </summary>
        [HarmonyPatch(typeof(VrPickupDroppingSystem), "DropItem", new Type[] { typeof(VrHandController), typeof(float), typeof(float) })]
        public class Patch_DropItem
        {
            [HarmonyPostfix]
            public static void PostFix(VrPickupDroppingSystem __instance, VrHandController handController, float linearVelocity, float angularVelocity)
            {
                if (daemon == null || !daemon.IsConnected) return;

                // Only trigger on actual throws (high velocity)
                if (linearVelocity < 2.0f) return;

                HandType hand = GetHandFromControllerString(handController.CurrentController.ToString());
                string handStr = GetHandString(hand);

                daemon.SendEvent(HapticEvents.Throw, handStr, priority: 2);
                MelonLogger.Msg($"[ThirdSpace] Event: Throw ({handStr})");
            }
        }

        /// <summary>
        /// Mind wave charge start (dual hand activation).
        /// </summary>
        [HarmonyPatch(typeof(MindDeathWaveSystem), "DualModeDeathWaveOnTarget", new Type[] { typeof(MindDeathWaveComponent), typeof(MindDeathWaveComponent) })]
        public class Patch_DualDeathWave
        {
            [HarmonyPrefix]
            public static void PreFix(MindDeathWaveComponent firstController, MindDeathWaveComponent secondController, MindDeathWaveSystem __instance)
            {
                if (daemon == null || !daemon.IsConnected) return;
                if (__instance.dualDeathWaveActivated) return;

                _mindwaveCharging = true;
                daemon.SendEvent(HapticEvents.MindwaveCharge, priority: 1);
                MelonLogger.Msg("[ThirdSpace] Event: Mindwave Charge Start");
            }
        }

        /// <summary>
        /// Mind wave charge stop/cancel.
        /// </summary>
        [HarmonyPatch(typeof(MindDeathWaveSystem), "ResetDeathWave", new Type[] { typeof(MindDeathWaveComponent) })]
        public class Patch_ResetDualDeathWave
        {
            [HarmonyPrefix]
            public static void PreFix(MindDeathWaveComponent deathWaveController, MindDeathWaveSystem __instance)
            {
                if (daemon == null || !daemon.IsConnected) return;
                if (!__instance.dualDeathWaveActivated) return;

                _mindwaveCharging = false;
                daemon.StopAll();
                MelonLogger.Msg("[ThirdSpace] Event: Mindwave Charge Stop");
            }
        }

        /// <summary>
        /// Mind wave release (enemy killed with mindwave).
        /// </summary>
        [HarmonyPatch(typeof(ScoreManager), "scorePoints", new Type[] { typeof(int), typeof(Vector3), typeof(ScoreManager.ScoreType), typeof(GunPickup), typeof(PejAiBody) })]
        public class Patch_ExplodeHead
        {
            [HarmonyPrefix]
            public static void PreFix(int rewardedpoints, Vector3 particlePos, ScoreManager.ScoreType scoreType, GunPickup weapon, PejAiBody enemy)
            {
                if (daemon == null || !daemon.IsConnected) return;
                if (scoreType != ScoreManager.ScoreType.deathwave) return;

                _mindwaveCharging = false;
                daemon.SendEvent(HapticEvents.MindwaveRelease, priority: 2);
                MelonLogger.Msg("[ThirdSpace] Event: Mindwave Release!");
            }
        }

        #endregion
    }
}

