using HarmonyLib;
using MelonLoader;
using System;
using System.IO;
using System.Reflection;

[assembly: MelonInfo(typeof(ThirdSpace_PistolWhip.ThirdSpace_PistolWhip), "ThirdSpace_PistolWhip", "1.0.0", "ThirdSpace")]
[assembly: MelonGame("Cloudhead Games, Ltd.", "Pistol Whip")]

namespace ThirdSpace_PistolWhip
{
    /// <summary>
    /// Third Space Vest haptic integration for Pistol Whip.
    /// Harmony patches resolve game types at runtime so the DLL can be built
    /// against MelonLoader + Harmony only (no Pistol Whip Il2Cpp assemblies).
    /// Patch targets follow the archived bHaptics/OWO mods.
    /// </summary>
    public class ThirdSpace_PistolWhip : MelonMod
    {
        public static DaemonClient daemon;
        public static bool rightGunHasAmmo = true;
        public static bool leftGunHasAmmo = true;
        public static bool lowHealth = false;

        public override void OnInitializeMelon()
        {
            MelonLogger.Msg("[ThirdSpace] Initializing Third Space Vest integration for Pistol Whip...");

            daemon = new DaemonClient();
            string configPath = System.IO.Path.Combine(Directory.GetCurrentDirectory(), "Mods", "ThirdSpace_Config.txt");
            daemon.Initialize(configPath);

            if (daemon.Connect())
            {
                MelonLogger.Msg("[ThirdSpace] Ready for haptic feedback!");
            }
            else
            {
                MelonLogger.Warning("[ThirdSpace] Could not connect to daemon. Make sure it's running on port 5050.");
            }
        }

        public override void OnDeinitializeMelon()
        {
            MelonLogger.Msg("[ThirdSpace] Shutting down...");
            daemon?.StopAll();
            daemon?.Dispose();
        }

        internal static Type FindType(string name)
        {
            return AccessTools.TypeByName(name)
                ?? AccessTools.TypeByName("Il2Cpp." + name);
        }

        internal static MethodBase FindMethod(string typeName, string methodName)
        {
            var type = FindType(typeName);
            if (type == null)
            {
                MelonLogger.Warning($"[ThirdSpace] Type not found: {typeName} (patch skipped)");
                return null;
            }
            var method = AccessTools.Method(type, methodName);
            if (method == null)
            {
                MelonLogger.Warning($"[ThirdSpace] Method not found: {typeName}.{methodName} (patch skipped)");
            }
            return method;
        }

        internal static object GetMember(object obj, string name)
        {
            if (obj == null) return null;
            try
            {
                var traverse = Traverse.Create(obj);
                var field = traverse.Field(name);
                var fieldValue = field.GetValue();
                if (fieldValue != null) return fieldValue;
                var prop = traverse.Property(name);
                return prop.GetValue();
            }
            catch { /* fall through */ }

            var type = obj.GetType();
            var accessProp = AccessTools.Property(type, name);
            if (accessProp != null) return accessProp.GetValue(obj, null);
            var accessField = AccessTools.Field(type, name);
            return accessField?.GetValue(obj);
        }

        internal static object GetPath(object obj, params string[] names)
        {
            foreach (var name in names)
            {
                obj = GetMember(obj, name);
                if (obj == null) return null;
            }
            return obj;
        }

        internal static int GetInt(object obj, string name, int fallback = 0)
        {
            var value = GetMember(obj, name);
            if (value == null) return fallback;
            try { return Convert.ToInt32(value); }
            catch { return fallback; }
        }

        internal static void SetHandAmmo(bool isRight, bool hasAmmo)
        {
            if (isRight) rightGunHasAmmo = hasAmmo;
            else leftGunHasAmmo = hasAmmo;
        }

        internal static bool HandHasAmmo(bool isRight)
        {
            return isRight ? rightGunHasAmmo : leftGunHasAmmo;
        }

        internal static string GetHandString(object hand)
        {
            if (hand == null) return null;
            var nameObj = GetMember(hand, "name");
            string handName = nameObj as string ?? hand.ToString() ?? "";
            if (handName.IndexOf("Right", StringComparison.OrdinalIgnoreCase) >= 0) return "right";
            if (handName.IndexOf("Left", StringComparison.OrdinalIgnoreCase) >= 0) return "left";
            return null;
        }

        internal static bool IsShotgun(object gun)
        {
            return GetInt(gun, "gunType") == 3;
        }

        [HarmonyPatch]
        public class Patch_GunAmmoDisplay
        {
            static bool Prepare() => FindMethod("GunAmmoDisplay", "Update") != null;
            static MethodBase TargetMethod() => FindMethod("GunAmmoDisplay", "Update");

            [HarmonyPostfix]
            public static void Postfix(object __instance)
            {
                try
                {
                    object hand = GetPath(__instance, "gun", "hand");
                    string handSide = GetHandString(hand);
                    if (handSide == null) return;
                    bool isRight = handSide == "right";
                    int bullets = GetInt(__instance, "currentBulletCount", -1);
                    if (bullets < 0) return;
                    SetHandAmmo(isRight, bullets > 0);
                }
                catch { /* GunAmmoDisplay layout can vary by game version */ }
            }
        }

        [HarmonyPatch]
        public class Patch_GunFire
        {
            static bool Prepare() => FindType("Gun") != null && FindMethod("Gun", "Fire") != null;
            static MethodBase TargetMethod() => FindMethod("Gun", "Fire");

            [HarmonyPostfix]
            public static void Postfix(object __instance)
            {
                if (daemon == null || !daemon.IsConnected) return;
                string hand = GetHandString(GetMember(__instance, "hand"));
                if (hand == null) return;

                bool isRight = hand == "right";
                if (!HandHasAmmo(isRight))
                {
                    daemon.SendEvent("empty_gun_fire", hand, priority: 1);
                    MelonLogger.Msg($"[ThirdSpace] Event: empty_gun_fire ({hand})");
                    return;
                }

                string eventName = IsShotgun(__instance) ? "shotgun_fire" : "gun_fire";
                daemon.SendEvent(eventName, hand, priority: 2);
                MelonLogger.Msg($"[ThirdSpace] Event: {eventName} ({hand})");
            }
        }

        [HarmonyPatch]
        public class Patch_GunReload
        {
            static bool Prepare() => FindMethod("Gun", "Reload") != null;
            static MethodBase TargetMethod() => FindMethod("Gun", "Reload");

            [HarmonyPostfix]
            public static void Postfix(object __instance, int reloadType)
            {
                if (daemon == null || !daemon.IsConnected) return;
                string hand = GetHandString(GetMember(__instance, "hand"));
                if (hand == null) return;

                string eventName = reloadType == 1 ? "reload_shoulder" : "reload_hip";
                daemon.SendEvent(eventName, hand, priority: 1);
                MelonLogger.Msg($"[ThirdSpace] Event: {eventName} ({hand})");
            }
        }

        [HarmonyPatch]
        public class Patch_MeleeHit
        {
            static bool Prepare() => FindMethod("MeleeWeapon", "ProcessHit") != null;
            static MethodBase TargetMethod() => FindMethod("MeleeWeapon", "ProcessHit");

            [HarmonyPostfix]
            public static void Postfix(object __instance)
            {
                if (daemon == null || !daemon.IsConnected) return;
                string hand = GetHandString(GetMember(__instance, "hand"));
                if (hand == null) return;
                daemon.SendEvent("melee_hit", hand, priority: 2);
                MelonLogger.Msg($"[ThirdSpace] Event: melee_hit ({hand})");
            }
        }

        [HarmonyPatch]
        public class Patch_PlayerHit
        {
            static bool Prepare() => FindMethod("Projectile", "ShowPlayerHitEffects") != null;
            static MethodBase TargetMethod() => FindMethod("Projectile", "ShowPlayerHitEffects");

            [HarmonyPostfix]
            public static void Postfix()
            {
                if (daemon == null || !daemon.IsConnected) return;
                daemon.SendEvent("player_hit", priority: 3);
                MelonLogger.Msg("[ThirdSpace] Event: player_hit");
            }
        }

        [HarmonyPatch]
        public class Patch_PlayerDeath
        {
            static bool Prepare() => FindMethod("Player", "ProcessKillerHit") != null;
            static MethodBase TargetMethod() => FindMethod("Player", "ProcessKillerHit");

            [HarmonyPostfix]
            public static void Postfix()
            {
                if (daemon == null || !daemon.IsConnected) return;
                daemon.SendEvent("death", priority: 4);
                MelonLogger.Msg("[ThirdSpace] Event: death");
            }
        }

        [HarmonyPatch]
        public class Patch_LowHealth
        {
            static bool Prepare() => FindMethod("PlayerHUD", "OnArmorLost") != null;
            static MethodBase TargetMethod() => FindMethod("PlayerHUD", "OnArmorLost");

            [HarmonyPostfix]
            public static void Postfix()
            {
                if (daemon == null || !daemon.IsConnected) return;
                if (lowHealth) return;
                lowHealth = true;
                daemon.SendEvent("low_health", priority: 1);
                MelonLogger.Msg("[ThirdSpace] Event: low_health");
            }
        }

        [HarmonyPatch]
        public class Patch_Healing
        {
            static bool Prepare() => FindMethod("PlayerHUD", "playArmorGainedEffect") != null;
            static MethodBase TargetMethod() => FindMethod("PlayerHUD", "playArmorGainedEffect");

            [HarmonyPostfix]
            public static void Postfix()
            {
                if (daemon == null || !daemon.IsConnected) return;
                lowHealth = false;
                daemon.SendEvent("healing", priority: 1);
                MelonLogger.Msg("[ThirdSpace] Event: healing");
            }
        }
    }
}
