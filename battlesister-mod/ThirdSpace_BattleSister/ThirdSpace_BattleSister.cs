using HarmonyLib;
using MelonLoader;
using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;

[assembly: MelonInfo(typeof(ThirdSpace_BattleSister.ThirdSpace_BattleSister), "ThirdSpace_BattleSister", "1.0.0", "ThirdSpace")]
[assembly: MelonGame("Pixel Toys", "Battle Sister")]

namespace ThirdSpace_BattleSister
{
    /// <summary>
    /// Third Space Vest haptic integration for Warhammer 40,000: Battle Sister.
    /// Harmony patches resolve game types at runtime so the DLL builds against
    /// MelonLoader + Harmony only. Targets follow BattleSister_bhaptics.
    /// </summary>
    public class ThirdSpace_BattleSister : MelonMod
    {
        public static DaemonClient daemon;
        public static bool rightHanded = true;
        public static bool lowHealth = false;

        public override void OnInitializeMelon()
        {
            MelonLogger.Msg("[ThirdSpace] Initializing Third Space Vest integration for Battle Sister...");
            daemon = new DaemonClient();
            string configPath = Path.Combine(Directory.GetCurrentDirectory(), "Mods", "ThirdSpace_Config.txt");
            daemon.Initialize(configPath);
            if (daemon.Connect())
                MelonLogger.Msg("[ThirdSpace] Ready for haptic feedback!");
            else
                MelonLogger.Warning("[ThirdSpace] Could not connect to daemon on port 5050.");
        }

        public override void OnDeinitializeMelon()
        {
            daemon?.StopAll();
            daemon?.Dispose();
        }

        internal static Type FindType(string name)
        {
            return AccessTools.TypeByName(name)
                ?? AccessTools.TypeByName("Il2Cpp." + name)
                ?? AccessTools.TypeByName("Il2CppBattleSister.Ballistics." + name);
        }

        internal static MethodBase FindMethod(string typeName, string methodName)
        {
            var type = FindType(typeName);
            if (type == null)
            {
                MelonLogger.Warning("[ThirdSpace] Type not found: " + typeName + " (patch skipped)");
                return null;
            }
            var method = AccessTools.Method(type, methodName);
            if (method == null)
                MelonLogger.Warning("[ThirdSpace] Method not found: " + typeName + "." + methodName + " (patch skipped)");
            return method;
        }

        internal static object GetMember(object obj, string name)
        {
            if (obj == null) return null;
            var type = obj.GetType();
            var prop = AccessTools.Property(type, name);
            if (prop != null) return prop.GetValue(obj, null);
            var field = AccessTools.Field(type, name);
            return field?.GetValue(obj);
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

        internal static bool GetBool(object obj, string name, bool fallback = false)
        {
            var value = GetMember(obj, name);
            if (value == null) return fallback;
            try { return Convert.ToBoolean(value); }
            catch { return fallback; }
        }

        internal static float GetFloat(object obj, string name, float fallback = 0f)
        {
            var value = GetMember(obj, name);
            if (value == null) return fallback;
            try { return Convert.ToSingle(value); }
            catch { return fallback; }
        }

        internal static bool TryXYZ(object vec, out float x, out float y, out float z)
        {
            x = y = z = 0f;
            if (vec == null) return false;
            try
            {
                x = Convert.ToSingle(GetMember(vec, "x"));
                y = Convert.ToSingle(GetMember(vec, "y"));
                z = Convert.ToSingle(GetMember(vec, "z"));
                return true;
            }
            catch
            {
                return false;
            }
        }

        internal static bool IsRightHand(bool isPrimaryHand)
        {
            if (isPrimaryHand && rightHanded) return true;
            if (!isPrimaryHand && !rightHanded) return true;
            return false;
        }

        internal static string HandString(bool isRight)
        {
            return isRight ? "right" : "left";
        }

        internal static string DamageName(object damageType)
        {
            return damageType == null ? "" : damageType.ToString();
        }

        internal static KeyValuePair<float, float> GetAngleAndShift(object playerTransform, object hit)
        {
            float px, py, pz, hx, hy, hz, ey = 0f;
            TryXYZ(GetMember(playerTransform, "position"), out px, out py, out pz);
            TryXYZ(hit, out hx, out hy, out hz);
            var rot = GetMember(playerTransform, "rotation");
            if (rot != null)
            {
                float ex, ez;
                TryXYZ(GetMember(rot, "eulerAngles"), out ex, out ey, out ez);
            }

            float dx = hx - px;
            float dz = hz - pz;
            float mag = (float)Math.Sqrt(dx * dx + dz * dz);
            float hitAngle = 0f;
            if (mag > 1e-5f)
            {
                float dot = dz / mag;
                if (dot > 1f) dot = 1f;
                if (dot < -1f) dot = -1f;
                hitAngle = (float)(Math.Acos(dot) * 180.0 / Math.PI);
                if (-dx < 0f) hitAngle *= -1f;
            }
            float myRotation = (hitAngle - ey) * -1f;
            if (myRotation < 0f) myRotation = 360f + myRotation;

            float hitShift = hy - py;
            float upperBound = 0.0f;
            float lowerBound = -0.5f;
            if (hitShift > upperBound) hitShift = 0.5f;
            else if (hitShift < lowerBound) hitShift = -0.5f;
            else hitShift = (hitShift - lowerBound) / (upperBound - lowerBound) - 0.5f;

            return new KeyValuePair<float, float>(myRotation, hitShift);
        }

        [HarmonyPatch]
        public class Patch_SetHandedness
        {
            static bool Prepare() => FindMethod("VrRig", "SetHandedness") != null;
            static MethodBase TargetMethod() => FindMethod("VrRig", "SetHandedness");

            [HarmonyPostfix]
            public static void Postfix(object handedness)
            {
                string text = handedness == null ? "" : handedness.ToString();
                rightHanded = text.IndexOf("Right", StringComparison.OrdinalIgnoreCase) >= 0;
            }
        }

        [HarmonyPatch]
        public class Patch_MeleeCollide
        {
            static bool Prepare() => FindMethod("VrMeleeAudio", "OnCollisionEnter") != null;
            static MethodBase TargetMethod() => FindMethod("VrMeleeAudio", "OnCollisionEnter");

            [HarmonyPostfix]
            public static void Postfix(object __instance)
            {
                if (daemon == null || !daemon.IsConnected) return;
                try
                {
                    object isPrimary = GetPath(__instance, "m_item", "AttachedHoldInteraction", "ActivePrimaryHand", "m_isPrimaryHand");
                    if (isPrimary == null) return;
                    bool isRight = IsRightHand(Convert.ToBoolean(isPrimary));
                    daemon.SendEvent("melee_hit", HandString(isRight), priority: 2);
                }
                catch { }
            }
        }

        [HarmonyPatch]
        public class Patch_FireGun
        {
            static bool Prepare() => FindMethod("VrGun", "Fire") != null;
            static MethodBase TargetMethod() => FindMethod("VrGun", "Fire");

            [HarmonyPostfix]
            public static void Postfix(object __instance)
            {
                if (daemon == null || !daemon.IsConnected) return;
                try
                {
                    object isPrimary = GetPath(__instance, "AttachedHoldInteraction", "ActivePrimaryHand", "m_isPrimaryHand");
                    if (isPrimary == null) return;
                    bool isRight = IsRightHand(Convert.ToBoolean(isPrimary));
                    string damageType = DamageName(GetPath(__instance, "Magazine", "damageType"));

                    string eventName = "gun_fire";
                    if (damageType == "GrenadeLauncherProjectile")
                        eventName = "shotgun_fire";
                    else if (damageType == "PowerSword" || damageType == "Fire")
                        eventName = "melee_hit";

                    daemon.SendEvent(eventName, HandString(isRight), priority: 2);

                    object hold = GetMember(__instance, "AttachedHoldInteraction");
                    if (GetBool(hold, "HasPrimaryGrasp") && GetBool(hold, "HasSecondaryGrasp"))
                        daemon.SendEvent("two_hand", HandString(!isRight), priority: 1);
                }
                catch { }
            }
        }

        [HarmonyPatch]
        public class Patch_ProcessImpact
        {
            static bool Prepare() => FindMethod("ImpactManager", "ProcessImpact") != null;
            static MethodBase TargetMethod() => FindMethod("ImpactManager", "ProcessImpact");

            [HarmonyPostfix]
            public static void Postfix(object damageType, object impactCollider, object impactPosition)
            {
                if (daemon == null || !daemon.IsConnected) return;
                try
                {
                    object myPlayer = GetMember(impactCollider, "attachedRigidbody");
                    object name = GetMember(myPlayer, "name");
                    if (myPlayer == null || (name as string) != "PlayerRig") return;

                    string dtype = DamageName(damageType);
                    string eventName = "player_hit";
                    if (dtype == "Axe" || dtype == "Club" || dtype == "BloodletterSword")
                        eventName = "blade_hit";
                    else if (dtype == "Explosion")
                        eventName = "explosion";

                    var angleShift = GetAngleAndShift(GetMember(myPlayer, "transform"), impactPosition);
                    daemon.SendEvent(eventName, priority: 3, angle: angleShift.Key);
                }
                catch { }
            }
        }

        [HarmonyPatch]
        public class Patch_BombExplode
        {
            static bool Prepare() => FindMethod("VrTimedExplosive", "Explode") != null;
            static MethodBase TargetMethod() => FindMethod("VrTimedExplosive", "Explode");

            [HarmonyPostfix]
            public static void Postfix()
            {
                if (daemon == null || !daemon.IsConnected) return;
                daemon.SendEvent("explosion", priority: 3);
            }
        }

        [HarmonyPatch]
        public class Patch_OnDeath
        {
            static bool Prepare() => FindMethod("HealthAudio", "OnDeath") != null;
            static MethodBase TargetMethod() => FindMethod("HealthAudio", "OnDeath");

            [HarmonyPostfix]
            public static void Postfix()
            {
                if (daemon == null || !daemon.IsConnected) return;
                lowHealth = false;
                daemon.SendEvent("death", priority: 4);
            }
        }

        [HarmonyPatch]
        public class Patch_OnHealthUpdated
        {
            static bool Prepare() => FindMethod("HealthStatusReceiver_DamageHud", "OnApplyHealthStatusUpdate") != null;
            static MethodBase TargetMethod() => FindMethod("HealthStatusReceiver_DamageHud", "OnApplyHealthStatusUpdate");

            [HarmonyPostfix]
            public static void Postfix(object __instance)
            {
                if (daemon == null || !daemon.IsConnected) return;
                try
                {
                    object status = GetMember(__instance, "m_healthStatus");
                    float current = GetFloat(status, "m_currentHealth");
                    float start = GetFloat(status, "m_startHealth");
                    bool isLow = start > 0f && current < 0.5f * start;
                    if (isLow && !lowHealth)
                    {
                        lowHealth = true;
                        daemon.SendEvent("low_health", priority: 1);
                    }
                    else if (!isLow && lowHealth)
                    {
                        lowHealth = false;
                        daemon.SendEvent("low_health_end", priority: 1);
                    }
                }
                catch { }
            }
        }
    }
}
