using HarmonyLib;
using MelonLoader;
using System;
using System.IO;
using UnityEngine;

[assembly: MelonInfo(typeof(ThirdSpace_PistolWhip.ThirdSpace_PistolWhip), "ThirdSpace_PistolWhip", "1.0.0", "ThirdSpace")]
[assembly: MelonGame("Cloudhead Games, Ltd.", "Pistol Whip")]

namespace ThirdSpace_PistolWhip
{
    /// <summary>
    /// Third Space Vest haptic integration for Pistol Whip.
    /// 
    /// Adapted from existing bHaptics/OWO mods by replacing their SDK calls
    /// with TCP daemon communication. Harmony patches are based on:
    /// - bHaptics mod: https://github.com/floh-bhaptics/PistolWhip_bhaptics
    /// - OWO mod: https://github.com/floh-bhaptics/PistolWhip_OWO
    /// </summary>
    public class ThirdSpace_PistolWhip : MelonMod
    {
        public static DaemonClient daemon;
        
        // Track game state
        public static bool rightGunHasAmmo = true;
        public static bool leftGunHasAmmo = true;
        public static bool lowHealth = false;

        public override void OnInitializeMelon()
        {
            MelonLogger.Msg("[ThirdSpace] Initializing Third Space Vest integration for Pistol Whip...");

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

        private static string GetHandString(Transform hand)
        {
            if (hand == null) return null;
            string handName = hand.name;
            if (handName.Contains("Right") || handName.Contains("right"))
                return "right";
            if (handName.Contains("Left") || handName.Contains("left"))
                return "left";
            return null;
        }

        private static bool IsShotgun(int gunType)
        {
            // From source code analysis: gunType == 3 is shotgun
            return gunType == 3;
        }

        #endregion

        #region Harmony Patches

        /// <summary>
        /// Gun fire - recoil feedback.
        /// Also detects empty gun fire (click feedback).
        /// Adapted from bHaptics/OWO mods.
        /// </summary>
        [HarmonyPatch(typeof(Gun), "Fire")]
        public class Patch_GunFire
        {
            [HarmonyPrefix]
            public static void Prefix(Gun __instance, out int __state)
            {
                // Store ammo count before Fire() is called
                __state = __instance.currentAmmo;
            }

            [HarmonyPostfix]
            public static void Postfix(Gun __instance, int __state)
            {
                if (daemon == null || !daemon.IsConnected) return;

                // Determine hand
                string hand = GetHandString(__instance.hand);
                if (hand == null) return;

                // Check if gun was empty (no ammo before Fire() was called)
                if (__state == 0)
                {
                    // Empty gun - subtle click feedback
                    daemon.SendEvent("empty_gun_fire", hand, priority: 1);
                    MelonLogger.Msg($"[ThirdSpace] Event: empty_gun_fire ({hand})");
                    return;
                }

                // Normal fire - check if shotgun
                bool isShotgun = IsShotgun(__instance.gunType);
                string eventName = isShotgun ? "shotgun_fire" : "gun_fire";

                daemon.SendEvent(eventName, hand, priority: 2);
                MelonLogger.Msg($"[ThirdSpace] Event: {eventName} ({hand})");
            }
        }

        /// <summary>
        /// Gun reload - hip or shoulder reload.
        /// Adapted from bHaptics/OWO mods.
        /// </summary>
        [HarmonyPatch(typeof(Gun), "Reload")]
        public class Patch_GunReload
        {
            [HarmonyPostfix]
            public static void Postfix(Gun __instance, int reloadType)
            {
                if (daemon == null || !daemon.IsConnected) return;

                string hand = GetHandString(__instance.hand);
                if (hand == null) return;

                // Reload types: 0 = DOWN (hip), 1 = UP (shoulder), 2 = BOTH
                string eventName;
                if (reloadType == 0) // Hip reload
                    eventName = "reload_hip";
                else if (reloadType == 1) // Shoulder reload
                    eventName = "reload_shoulder";
                else
                    eventName = "reload_hip"; // Default to hip

                daemon.SendEvent(eventName, hand, priority: 1);
                MelonLogger.Msg($"[ThirdSpace] Event: {eventName} ({hand})");
            }
        }

        /// <summary>
        /// Melee hit - impact feedback.
        /// Adapted from bHaptics/OWO mods.
        /// </summary>
        [HarmonyPatch(typeof(MeleeWeapon), "ProcessHit")]
        public class Patch_MeleeHit
        {
            [HarmonyPostfix]
            public static void Postfix(MeleeWeapon __instance)
            {
                if (daemon == null || !daemon.IsConnected) return;

                string hand = GetHandString(__instance.hand);
                if (hand == null) return;

                daemon.SendEvent("melee_hit", hand, priority: 2);
                MelonLogger.Msg($"[ThirdSpace] Event: melee_hit ({hand})");
            }
        }

        /// <summary>
        /// Player hit by projectile - getting shot.
        /// Adapted from bHaptics/OWO mods.
        /// </summary>
        [HarmonyPatch(typeof(Projectile), "ShowPlayerHitEffects")]
        public class Patch_PlayerHit
        {
            [HarmonyPostfix]
            public static void Postfix()
            {
                if (daemon == null || !daemon.IsConnected) return;

                daemon.SendEvent("player_hit", priority: 3);
                MelonLogger.Msg("[ThirdSpace] Event: player_hit");
            }
        }

        /// <summary>
        /// Player death - fatal hit.
        /// Adapted from bHaptics/OWO mods.
        /// </summary>
        [HarmonyPatch(typeof(Player), "ProcessKillerHit")]
        public class Patch_PlayerDeath
        {
            [HarmonyPostfix]
            public static void Postfix()
            {
                if (daemon == null || !daemon.IsConnected) return;

                daemon.SendEvent("death", priority: 4);
                MelonLogger.Msg("[ThirdSpace] Event: death");
            }
        }

        /// <summary>
        /// Armor lost - low health heartbeat.
        /// Adapted from bHaptics/OWO mods.
        /// </summary>
        [HarmonyPatch(typeof(PlayerHUD), "OnArmorLost")]
        public class Patch_LowHealth
        {
            [HarmonyPostfix]
            public static void Postfix()
            {
                if (daemon == null || !daemon.IsConnected) return;
                if (lowHealth) return; // Already in low health state

                lowHealth = true;
                daemon.SendEvent("low_health", priority: 1);
                MelonLogger.Msg("[ThirdSpace] Event: low_health");
            }
        }

        /// <summary>
        /// Armor gained - healing effect.
        /// Adapted from bHaptics/OWO mods.
        /// </summary>
        [HarmonyPatch(typeof(PlayerHUD), "playArmorGainedEffect")]
        public class Patch_Healing
        {
            [HarmonyPostfix]
            public static void Postfix()
            {
                if (daemon == null || !daemon.IsConnected) return;

                lowHealth = false; // Reset low health state
                daemon.SendEvent("healing", priority: 1);
                MelonLogger.Msg("[ThirdSpace] Event: healing");
            }
        }

        /// <summary>
        /// Track ammo state for both guns.
        /// Adapted from bHaptics/OWO mods.
        /// </summary>
        [HarmonyPatch(typeof(GunAmmoDisplay), "Update")]
        public class Patch_AmmoCheck
        {
            [HarmonyPostfix]
            public static void Postfix(GunAmmoDisplay __instance)
            {
                // Track ammo state for "no ammo" events
                // This can be used to trigger haptics when trying to fire empty gun
                // Note: This is optional - the Gun.Fire() patch will naturally handle empty guns
            }
        }


        #endregion
    }
}

