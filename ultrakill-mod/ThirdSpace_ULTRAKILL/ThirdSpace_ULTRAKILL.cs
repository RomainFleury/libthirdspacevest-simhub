using BepInEx;
using BepInEx.Logging;
using HarmonyLib;
using System;
using System.IO;
using UnityEngine;

namespace ThirdSpace_ULTRAKILL
{
    /// <summary>
    /// Third Space Vest haptic integration for ULTRAKILL.
    /// Based on OWO_ULTRAKILL mod, adapted for Third Space Vest daemon.
    /// 
    /// Reference: https://github.com/OWODevelopers/OWO_ULTRAKILL
    /// </summary>
    [BepInPlugin(PluginInfo.PLUGIN_GUID, PluginInfo.PLUGIN_NAME, PluginInfo.PLUGIN_VERSION)]
    public class ThirdSpace_ULTRAKILL : BaseUnityPlugin
    {
        public static ManualLogSource Log;
        public static DaemonClient Daemon;
        public static bool IsPlayerActive = false;

        private void Awake()
        {
            Log = Logger;
            Log.LogInfo($"[ThirdSpace] {PluginInfo.PLUGIN_NAME} v{PluginInfo.PLUGIN_VERSION} loading...");

            // Initialize daemon client
            Daemon = new DaemonClient();
            
            // Check for manual IP config
            string configPath = Path.Combine(Paths.PluginPath, "ThirdSpace_Config.txt");
            Daemon.Initialize(configPath);

            // Connect to daemon
            if (Daemon.Connect())
            {
                Log.LogInfo("[ThirdSpace] Connected to vest daemon!");
            }
            else
            {
                Log.LogWarning("[ThirdSpace] Could not connect to daemon. Make sure it's running.");
                Log.LogWarning("[ThirdSpace] Start with: python -m modern_third_space.cli daemon start");
            }

            // Apply Harmony patches
            var harmony = new Harmony(PluginInfo.PLUGIN_GUID);
            harmony.PatchAll();

            Log.LogInfo($"[ThirdSpace] {PluginInfo.PLUGIN_NAME} loaded successfully!");
        }

        private void OnDestroy()
        {
            Log.LogInfo("[ThirdSpace] Shutting down...");
            Daemon?.StopAll();
            Daemon?.Dispose();
        }

        #region Helper Methods

        /// <summary>
        /// Calculate direction from hit position relative to player.
        /// </summary>
        public static string GetHitDirection(Vector3 hitForward)
        {
            Transform player = MonoSingleton<NewMovement>.Instance?.transform;
            if (player == null) return "front";

            float angle = Vector3.SignedAngle(-hitForward.normalized, player.forward, Vector3.up) + 180;

            // Based on OWO mod angle mapping
            if (angle > 135 && angle <= 225)
                return "front";
            else if (angle > 45 && angle <= 135)
                return "right";
            else if ((angle >= 0 && angle <= 45) || (angle > 315 && angle <= 360))
                return "back";
            else // 225 - 315
                return "left";
        }

        /// <summary>
        /// Calculate speed direction for dashes.
        /// </summary>
        public static string GetSpeedDirection(Vector3 velocity)
        {
            Transform player = MonoSingleton<NewMovement>.Instance?.transform;
            if (player == null) return "front";

            Vector3 normalizedSpeed = new Vector3(velocity.x, 0, velocity.z).normalized;
            float angle = Vector3.SignedAngle(normalizedSpeed, player.forward, Vector3.up) + 180;

            if (angle > 135 && angle <= 225)
                return "front";
            else if (angle > 45 && angle <= 135)
                return "right";
            else if ((angle >= 0 && angle <= 45) || (angle > 315 && angle <= 360))
                return "back";
            else
                return "left";
        }

        #endregion

        #region Harmony Patches - Damage

        /// <summary>
        /// Player takes damage - directional feedback based on hit source.
        /// </summary>
        [HarmonyPatch(typeof(NewMovement), "GetHurt")]
        public class Patch_GetHurt
        {
            [HarmonyPostfix]
            public static void Postfix(
                NewMovement __instance,
                int damage,
                bool invincible,
                float scoreLossMultiplier = 1f,
                bool explosion = false,
                bool instablack = false,
                float hardDamageMultiplier = 0.35f,
                bool ignoreInvincibility = false)
            {
                if (Daemon == null || !Daemon.IsConnected) return;
                if (damage <= 0) return;

                // Check for death
                if (__instance.hp <= 0)
                {
                    Daemon.StopAll();
                    Daemon.SendEvent(HapticEvents.Death);
                    IsPlayerActive = false;
                    Log.LogInfo("[ThirdSpace] Event: Death");
                    return;
                }

                // Regular damage - we'll get direction from specific damage patches
                // This is a fallback
                int intensity = Mathf.Clamp(damage * 2, 20, 100);
                Daemon.SendEvent(HapticEvents.Damage, "front", intensity);
                Log.LogDebug($"[ThirdSpace] Event: Damage (fallback, intensity={intensity})");
            }
        }

        /// <summary>
        /// Directional damage from various projectiles.
        /// </summary>
        [HarmonyPatch(typeof(Projectile), "TimeToDie")]
        public class Patch_Projectile
        {
            private static int _prevHealth;

            [HarmonyPrefix]
            public static void Prefix()
            {
                _prevHealth = MonoSingleton<NewMovement>.Instance?.hp ?? 0;
            }

            [HarmonyPostfix]
            public static void Postfix(Projectile __instance)
            {
                if (Daemon == null || !Daemon.IsConnected) return;
                
                int currentHealth = MonoSingleton<NewMovement>.Instance?.hp ?? 0;
                int damage = _prevHealth - currentHealth;
                
                if (damage > 0)
                {
                    string direction = GetHitDirection(__instance.transform.forward);
                    int intensity = Mathf.Clamp(damage * 2, 20, 100);
                    Daemon.SendEvent(HapticEvents.Damage, direction, intensity);
                    Log.LogDebug($"[ThirdSpace] Event: Damage from projectile ({direction}, intensity={intensity})");
                }
            }
        }

        /// <summary>
        /// Explosion damage.
        /// </summary>
        [HarmonyPatch(typeof(Explosion), "Collide")]
        public class Patch_Explosion
        {
            private static int _prevHealth;

            [HarmonyPrefix]
            public static void Prefix()
            {
                _prevHealth = MonoSingleton<NewMovement>.Instance?.hp ?? 0;
            }

            [HarmonyPostfix]
            public static void Postfix(Explosion __instance, Collider other)
            {
                if (Daemon == null || !Daemon.IsConnected) return;
                
                int currentHealth = MonoSingleton<NewMovement>.Instance?.hp ?? 0;
                
                if (currentHealth < _prevHealth)
                {
                    Daemon.SendEvent(HapticEvents.Explosion);
                    Log.LogDebug("[ThirdSpace] Event: Explosion");
                }
            }
        }

        #endregion

        #region Harmony Patches - Weapons

        [HarmonyPatch(typeof(Revolver), "Shoot")]
        public class Patch_Revolver
        {
            [HarmonyPostfix]
            public static void Postfix()
            {
                if (Daemon == null || !Daemon.IsConnected || !IsPlayerActive) return;
                Daemon.SendEvent(HapticEvents.RevolverFire);
            }
        }

        [HarmonyPatch(typeof(Shotgun), "Shoot")]
        public class Patch_Shotgun
        {
            [HarmonyPostfix]
            public static void Postfix()
            {
                if (Daemon == null || !Daemon.IsConnected || !IsPlayerActive) return;
                Daemon.SendEvent(HapticEvents.ShotgunFire);
            }
        }

        [HarmonyPatch(typeof(Nailgun), "Shoot")]
        public class Patch_Nailgun
        {
            [HarmonyPostfix]
            public static void Postfix()
            {
                if (Daemon == null || !Daemon.IsConnected || !IsPlayerActive) return;
                Daemon.SendEvent(HapticEvents.NailgunFire);
            }
        }

        [HarmonyPatch(typeof(Railcannon), "Shoot")]
        public class Patch_Railcannon
        {
            [HarmonyPostfix]
            public static void Postfix()
            {
                if (Daemon == null || !Daemon.IsConnected || !IsPlayerActive) return;
                Daemon.SendEvent(HapticEvents.RailcannonFire);
            }
        }

        [HarmonyPatch(typeof(RocketLauncher), "Shoot")]
        public class Patch_RocketLauncher
        {
            [HarmonyPostfix]
            public static void Postfix()
            {
                if (Daemon == null || !Daemon.IsConnected || !IsPlayerActive) return;
                Daemon.SendEvent(HapticEvents.RocketFire);
            }
        }

        [HarmonyPatch(typeof(RocketLauncher), "ShootCannonball")]
        public class Patch_Cannonball
        {
            [HarmonyPostfix]
            public static void Postfix()
            {
                if (Daemon == null || !Daemon.IsConnected || !IsPlayerActive) return;
                Daemon.SendEvent(HapticEvents.CannonballFire);
            }
        }

        #endregion

        #region Harmony Patches - Melee

        [HarmonyPatch(typeof(Punch), "PunchSuccess")]
        public class Patch_Punch
        {
            [HarmonyPostfix]
            public static void Postfix()
            {
                if (Daemon == null || !Daemon.IsConnected || !IsPlayerActive) return;
                Daemon.SendEvent(HapticEvents.Punch);
            }
        }

        [HarmonyPatch(typeof(Punch), "Parry")]
        public class Patch_Parry
        {
            [HarmonyPostfix]
            public static void Postfix()
            {
                if (Daemon == null || !Daemon.IsConnected || !IsPlayerActive) return;
                Daemon.SendEvent(HapticEvents.Parry);
            }
        }

        [HarmonyPatch(typeof(HookArm), "Update")]
        public class Patch_Hook
        {
            private static bool _wasNotThrowing = true;

            [HarmonyPostfix]
            public static void Postfix(HookArm __instance)
            {
                if (Daemon == null || !Daemon.IsConnected || !IsPlayerActive) return;

                bool isThrowing = __instance.state == HookState.Throwing;
                
                if (isThrowing && _wasNotThrowing)
                {
                    Daemon.SendEvent(HapticEvents.HookThrow);
                }
                
                _wasNotThrowing = !isThrowing;
            }
        }

        #endregion

        #region Harmony Patches - Movement

        [HarmonyPatch(typeof(NewMovement), "Jump")]
        public class Patch_Jump
        {
            [HarmonyPostfix]
            public static void Postfix(NewMovement __instance)
            {
                if (Daemon == null || !Daemon.IsConnected) return;
                if (__instance.modNoJump) return;
                
                Daemon.SendEvent(HapticEvents.Jump);
            }
        }

        [HarmonyPatch(typeof(NewMovement), "WallJump")]
        public class Patch_WallJump
        {
            [HarmonyPostfix]
            public static void Postfix()
            {
                if (Daemon == null || !Daemon.IsConnected) return;
                Daemon.SendEvent(HapticEvents.WallJump);
            }
        }

        [HarmonyPatch(typeof(GroundCheck), "OnTriggerEnter")]
        public class Patch_Landing
        {
            [HarmonyPostfix]
            public static void Postfix(GroundCheck __instance)
            {
                if (Daemon == null || !Daemon.IsConnected) return;
                if (!__instance.touchingGround) return;

                NewMovement nmov = Traverse.Create(__instance).Field("nmov").GetValue<NewMovement>();
                if (nmov == null) return;

                float fallSpeed = Traverse.Create(nmov).Field("fallSpeed").GetValue<float>();
                if (fallSpeed == 0) return;

                if (fallSpeed <= -92)
                {
                    Daemon.SendEvent(HapticEvents.Stomp);
                    Log.LogDebug("[ThirdSpace] Event: Stomp");
                }
                else
                {
                    Daemon.SendEvent(HapticEvents.Landing);
                }
            }
        }

        [HarmonyPatch(typeof(NewMovement), "Dodge")]
        public class Patch_Dodge
        {
            [HarmonyPostfix]
            public static void Postfix(NewMovement __instance)
            {
                if (Daemon == null || !Daemon.IsConnected) return;
                if (__instance.modNoDashSlide) return;

                string direction = GetSpeedDirection(__instance.rb.velocity);
                Daemon.SendEvent(HapticEvents.Dash, direction);
            }
        }

        [HarmonyPatch(typeof(NewMovement), "StartSlide")]
        public class Patch_SlideStart
        {
            [HarmonyPostfix]
            public static void Postfix()
            {
                if (Daemon == null || !Daemon.IsConnected) return;
                Daemon.SendEvent(HapticEvents.SlideStart);
            }
        }

        #endregion

        #region Harmony Patches - State

        [HarmonyPatch(typeof(NewMovement), "Update")]
        public class Patch_Update
        {
            [HarmonyPostfix]
            public static void Postfix(NewMovement __instance)
            {
                IsPlayerActive = __instance.activated;
            }
        }

        [HarmonyPatch(typeof(NewMovement), "Respawn")]
        public class Patch_Respawn
        {
            [HarmonyPostfix]
            public static void Postfix()
            {
                if (Daemon == null || !Daemon.IsConnected) return;
                Daemon.SendEvent(HapticEvents.Respawn);
                Log.LogDebug("[ThirdSpace] Event: Respawn");
            }
        }

        [HarmonyPatch(typeof(NewMovement), "SuperCharge")]
        public class Patch_SuperCharge
        {
            [HarmonyPostfix]
            public static void Postfix()
            {
                if (Daemon == null || !Daemon.IsConnected) return;
                Daemon.SendEvent(HapticEvents.SuperCharge);
            }
        }

        [HarmonyPatch(typeof(DualWieldPickup), "PickedUp")]
        public class Patch_DualWieldPickup
        {
            [HarmonyPostfix]
            public static void Postfix()
            {
                if (Daemon == null || !Daemon.IsConnected) return;
                Daemon.SendEvent(HapticEvents.DualWieldStart);
            }
        }

        [HarmonyPatch(typeof(DualWield), "EndPowerUp")]
        public class Patch_DualWieldEnd
        {
            [HarmonyPostfix]
            public static void Postfix()
            {
                if (Daemon == null || !Daemon.IsConnected) return;
                Daemon.SendEvent(HapticEvents.DualWieldEnd);
            }
        }

        [HarmonyPatch(typeof(OptionsManager), "Pause")]
        public class Patch_Pause
        {
            [HarmonyPostfix]
            public static void Postfix()
            {
                IsPlayerActive = false;
                Daemon?.StopAll();
            }
        }

        #endregion
    }

    /// <summary>
    /// Plugin metadata.
    /// </summary>
    public static class PluginInfo
    {
        public const string PLUGIN_GUID = "com.thirdspace.ultrakill";
        public const string PLUGIN_NAME = "ThirdSpace_ULTRAKILL";
        public const string PLUGIN_VERSION = "1.0.0";
    }

    /// <summary>
    /// Haptic event names sent to daemon.
    /// </summary>
    public static class HapticEvents
    {
        // Damage
        public const string Damage = "damage";
        public const string Death = "death";
        public const string Explosion = "explosion";
        
        // Weapons
        public const string RevolverFire = "revolver_fire";
        public const string RevolverCharge = "revolver_charge";
        public const string ShotgunFire = "shotgun_fire";
        public const string NailgunFire = "nailgun_fire";
        public const string RailcannonFire = "railcannon_fire";
        public const string RocketFire = "rocket_fire";
        public const string CannonballFire = "cannonball_fire";
        
        // Melee
        public const string Punch = "punch";
        public const string Parry = "parry";
        public const string HookThrow = "hook_throw";
        
        // Movement
        public const string Jump = "jump";
        public const string WallJump = "wall_jump";
        public const string Landing = "landing";
        public const string Stomp = "stomp";
        public const string Dash = "dash";
        public const string SlideStart = "slide_start";
        
        // Power-ups
        public const string PowerUp = "power_up";
        public const string SuperCharge = "super_charge";
        public const string Respawn = "respawn";
        public const string DualWieldStart = "dual_wield_start";
        public const string DualWieldEnd = "dual_wield_end";
    }
}
