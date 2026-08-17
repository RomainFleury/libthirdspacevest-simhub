using HarmonyLib;
using Il2Cpp;
using Il2CppBattleSister.Ballistics;
using MelonLoader;
using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

[assembly: MelonInfo(typeof(ThirdSpace_BattleSister.ThirdSpace_BattleSister), "ThirdSpace_BattleSister", "1.0.0", "ThirdSpace")]
[assembly: MelonGame("Pixel Toys", "Battle Sister")]

namespace ThirdSpace_BattleSister
{
    /// <summary>
    /// Third Space Vest haptic integration for Warhammer 40,000: Battle Sister.
    /// Harmony patches adapted from https://github.com/floh-bhaptics/BattleSister_bhaptics
    /// with bHaptics SDK calls replaced by TCP daemon events.
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
            {
                MelonLogger.Msg("[ThirdSpace] Ready for haptic feedback!");
            }
            else
            {
                MelonLogger.Warning("[ThirdSpace] Could not connect to daemon on port 5050.");
            }
        }

        public override void OnDeinitializeMelon()
        {
            daemon?.StopAll();
            daemon?.Dispose();
        }

        private static bool IsRightHand(bool isPrimaryHand)
        {
            if (isPrimaryHand && rightHanded) return true;
            if (!isPrimaryHand && !rightHanded) return true;
            return false;
        }

        private static string HandString(bool isRight)
        {
            return isRight ? "right" : "left";
        }

        private static KeyValuePair<float, float> GetAngleAndShift(Transform player, Vector3 hit)
        {
            Vector3 patternOrigin = new Vector3(0f, 0f, 1f);
            Vector3 hitPosition = hit - player.position;
            Vector3 playerDir = player.rotation.eulerAngles;
            Vector3 flattenedHit = new Vector3(hitPosition.x, 0f, hitPosition.z);
            float hitAngle = Vector3.Angle(flattenedHit, patternOrigin);
            Vector3 crossProduct = Vector3.Cross(flattenedHit, patternOrigin);
            if (crossProduct.y < 0f) hitAngle *= -1f;
            float myRotation = (hitAngle - playerDir.y) * -1f;
            if (myRotation < 0f) myRotation = 360f + myRotation;

            float hitShift = hitPosition.y;
            float upperBound = 0.0f;
            float lowerBound = -0.5f;
            if (hitShift > upperBound) hitShift = 0.5f;
            else if (hitShift < lowerBound) hitShift = -0.5f;
            else hitShift = (hitShift - lowerBound) / (upperBound - lowerBound) - 0.5f;

            return new KeyValuePair<float, float>(myRotation, hitShift);
        }

        [HarmonyPatch(typeof(VrRig), "SetHandedness")]
        public class Patch_SetHandedness
        {
            [HarmonyPostfix]
            public static void Postfix(Handedness handedness)
            {
                string text = handedness.ToString();
                rightHanded = text.IndexOf("Right", StringComparison.OrdinalIgnoreCase) >= 0;
            }
        }

        [HarmonyPatch(typeof(VrMeleeAudio), "OnCollisionEnter")]
        public class Patch_MeleeCollide
        {
            [HarmonyPostfix]
            public static void Postfix(VrMeleeAudio __instance)
            {
                if (daemon == null || !daemon.IsConnected) return;
                bool isRight;
                try
                {
                    isRight = IsRightHand(__instance.m_item.AttachedHoldInteraction.ActivePrimaryHand.m_isPrimaryHand);
                }
                catch
                {
                    return;
                }
                daemon.SendEvent("melee_hit", HandString(isRight), priority: 2);
            }
        }

        [HarmonyPatch(typeof(VrGun), "Fire")]
        public class Patch_FireGun
        {
            [HarmonyPostfix]
            public static void Postfix(VrGun __instance)
            {
                if (daemon == null || !daemon.IsConnected) return;
                bool isRight;
                DamageType damageType = DamageType.Bolt;
                try
                {
                    isRight = IsRightHand(__instance.AttachedHoldInteraction.ActivePrimaryHand.m_isPrimaryHand);
                    damageType = __instance.Magazine.damageType;
                }
                catch
                {
                    return;
                }

                string eventName = "gun_fire";
                if (damageType == DamageType.GrenadeLauncherProjectile)
                    eventName = "shotgun_fire";
                else if (damageType == DamageType.PowerSword || damageType == DamageType.Fire)
                    eventName = "melee_hit";

                daemon.SendEvent(eventName, HandString(isRight), priority: 2);

                try
                {
                    if (__instance.AttachedHoldInteraction.HasPrimaryGrasp &&
                        __instance.AttachedHoldInteraction.HasSecondaryGrasp)
                    {
                        daemon.SendEvent("two_hand", HandString(!isRight), priority: 1);
                    }
                }
                catch { }
            }
        }

        [HarmonyPatch(typeof(ImpactManager), "ProcessImpact")]
        public class Patch_ProcessImpact
        {
            [HarmonyPostfix]
            public static void Postfix(DamageType damageType, Collider impactCollider, Vector3 impactPosition)
            {
                if (daemon == null || !daemon.IsConnected) return;
                Rigidbody myPlayer;
                try
                {
                    myPlayer = impactCollider.attachedRigidbody;
                    if (myPlayer == null || myPlayer.name != "PlayerRig") return;
                }
                catch
                {
                    return;
                }

                string eventName = "player_hit";
                if (damageType == DamageType.Axe ||
                    damageType == DamageType.Club ||
                    damageType == DamageType.BloodletterSword)
                {
                    eventName = "blade_hit";
                }
                else if (damageType == DamageType.Explosion)
                {
                    eventName = "explosion";
                }

                var angleShift = GetAngleAndShift(myPlayer.transform, impactPosition);
                daemon.SendEvent(eventName, priority: 3, angle: angleShift.Key);
            }
        }

        [HarmonyPatch(typeof(VrTimedExplosive), "Explode")]
        public class Patch_BombExplode
        {
            [HarmonyPostfix]
            public static void Postfix()
            {
                if (daemon == null || !daemon.IsConnected) return;
                daemon.SendEvent("explosion", priority: 3);
            }
        }

        [HarmonyPatch(typeof(HealthAudio), "OnDeath")]
        public class Patch_OnDeath
        {
            [HarmonyPostfix]
            public static void Postfix()
            {
                if (daemon == null || !daemon.IsConnected) return;
                lowHealth = false;
                daemon.SendEvent("death", priority: 4);
            }
        }

        [HarmonyPatch(typeof(HealthStatusReceiver_DamageHud), "OnApplyHealthStatusUpdate")]
        public class Patch_OnHealthUpdated
        {
            [HarmonyPostfix]
            public static void Postfix(HealthStatusReceiver_DamageHud __instance)
            {
                if (daemon == null || !daemon.IsConnected) return;
                try
                {
                    float current = __instance.m_healthStatus.m_currentHealth;
                    float start = __instance.m_healthStatus.m_startHealth;
                    bool isLow = current < 0.5f * start;
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
