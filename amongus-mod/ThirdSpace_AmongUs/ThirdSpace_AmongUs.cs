using BepInEx;
using BepInEx.IL2CPP;
using BepInEx.Logging;
using HarmonyLib;
using System;
using System.IO;

namespace ThirdSpace_AmongUs
{
    /// <summary>
    /// Third Space Vest haptic integration for Among Us.
    /// 
    /// BepInEx plugin that hooks into Among Us game events and sends
    /// haptic feedback commands to the Third Space Vest daemon.
    /// 
    /// Supported events:
    /// - Player killed (impostor kills you)
    /// - Being ejected (voted out)
    /// - Executing a kill (as impostor)
    /// - Emergency meeting
    /// - Vote cast
    /// - Body reported
    /// - Task completion
    /// - Vent usage
    /// - Sabotages
    /// - Game start/end
    /// </summary>
    [BepInPlugin(PluginInfo.PLUGIN_GUID, PluginInfo.PLUGIN_NAME, PluginInfo.PLUGIN_VERSION)]
    [BepInProcess("Among Us.exe")]
    public class ThirdSpace_AmongUs : BasePlugin
    {
        public static ManualLogSource Logger { get; private set; }
        public static DaemonClient Daemon { get; private set; }
        
        private Harmony _harmony;

        public override void Load()
        {
            Logger = Log;
            Logger.LogInfo($"[ThirdSpace] Loading {PluginInfo.PLUGIN_NAME} v{PluginInfo.PLUGIN_VERSION}...");

            // Initialize daemon client
            Daemon = new DaemonClient();
            
            // Check for config file
            string configPath = Path.Combine(Paths.ConfigPath, "ThirdSpace.cfg");
            Daemon.Initialize(configPath);
            
            // Connect to daemon
            if (Daemon.Connect())
            {
                Logger.LogInfo("[ThirdSpace] Connected to vest daemon!");
            }
            else
            {
                Logger.LogWarning("[ThirdSpace] Could not connect to daemon. Make sure it's running on port 5050.");
                Logger.LogWarning("[ThirdSpace] Start daemon with: python -m modern_third_space.cli daemon start");
            }
            
            // Apply Harmony patches
            _harmony = new Harmony(PluginInfo.PLUGIN_GUID);
            _harmony.PatchAll();
            
            Logger.LogInfo("[ThirdSpace] Ready for haptic feedback!");
        }

        public override bool Unload()
        {
            Logger.LogInfo("[ThirdSpace] Shutting down...");
            
            Daemon?.StopAll();
            Daemon?.Dispose();
            
            _harmony?.UnpatchSelf();
            
            return base.Unload();
        }
    }

    public static class PluginInfo
    {
        public const string PLUGIN_GUID = "com.thirdspace.amongus";
        public const string PLUGIN_NAME = "ThirdSpace_AmongUs";
        public const string PLUGIN_VERSION = "1.0.0";
    }

    #region Harmony Patches

    /// <summary>
    /// Patch for player kill events.
    /// Detects when local player is killed or kills someone.
    /// </summary>
    [HarmonyPatch(typeof(PlayerControl), nameof(PlayerControl.MurderPlayer))]
    public class Patch_MurderPlayer
    {
        [HarmonyPostfix]
        public static void Postfix(PlayerControl __instance, PlayerControl target)
        {
            if (ThirdSpace_AmongUs.Daemon == null || !ThirdSpace_AmongUs.Daemon.IsConnected)
                return;

            try
            {
                // Check if we are the victim
                if (target != null && target.AmOwner)
                {
                    ThirdSpace_AmongUs.Daemon.SendEvent("player_killed");
                    ThirdSpace_AmongUs.Logger.LogInfo("[ThirdSpace] Event: player_killed (you were killed!)");
                }
                // Check if we are the killer (local player)
                else if (__instance != null && __instance.AmOwner)
                {
                    ThirdSpace_AmongUs.Daemon.SendEvent("execute_kill");
                    ThirdSpace_AmongUs.Logger.LogInfo("[ThirdSpace] Event: execute_kill (you killed someone!)");
                }
            }
            catch (Exception ex)
            {
                ThirdSpace_AmongUs.Logger.LogError($"[ThirdSpace] Error in MurderPlayer patch: {ex.Message}");
            }
        }
    }

    /// <summary>
    /// Patch for ejection (voted out).
    /// </summary>
    [HarmonyPatch(typeof(ExileController), nameof(ExileController.Begin))]
    public class Patch_Ejection
    {
        [HarmonyPostfix]
        public static void Postfix(ExileController __instance)
        {
            if (ThirdSpace_AmongUs.Daemon == null || !ThirdSpace_AmongUs.Daemon.IsConnected)
                return;

            try
            {
                // Check if the ejected player is us
                if (__instance.exiled != null && __instance.exiled.Object != null && __instance.exiled.Object.AmOwner)
                {
                    ThirdSpace_AmongUs.Daemon.SendEvent("ejected");
                    ThirdSpace_AmongUs.Logger.LogInfo("[ThirdSpace] Event: ejected (you were voted out!)");
                }
            }
            catch (Exception ex)
            {
                ThirdSpace_AmongUs.Logger.LogError($"[ThirdSpace] Error in Ejection patch: {ex.Message}");
            }
        }
    }

    /// <summary>
    /// Patch for emergency meeting start.
    /// </summary>
    [HarmonyPatch(typeof(MeetingHud), nameof(MeetingHud.Start))]
    public class Patch_MeetingStart
    {
        [HarmonyPostfix]
        public static void Postfix()
        {
            if (ThirdSpace_AmongUs.Daemon == null || !ThirdSpace_AmongUs.Daemon.IsConnected)
                return;

            try
            {
                ThirdSpace_AmongUs.Daemon.SendEvent("emergency_meeting");
                ThirdSpace_AmongUs.Logger.LogInfo("[ThirdSpace] Event: emergency_meeting");
            }
            catch (Exception ex)
            {
                ThirdSpace_AmongUs.Logger.LogError($"[ThirdSpace] Error in MeetingStart patch: {ex.Message}");
            }
        }
    }

    /// <summary>
    /// Patch for casting a vote.
    /// </summary>
    [HarmonyPatch(typeof(MeetingHud), nameof(MeetingHud.CastVote))]
    public class Patch_CastVote
    {
        [HarmonyPostfix]
        public static void Postfix(MeetingHud __instance, byte srcPlayerId, byte suspectPlayerId)
        {
            if (ThirdSpace_AmongUs.Daemon == null || !ThirdSpace_AmongUs.Daemon.IsConnected)
                return;

            try
            {
                // Check if we are the one voting
                if (PlayerControl.LocalPlayer != null && PlayerControl.LocalPlayer.PlayerId == srcPlayerId)
                {
                    ThirdSpace_AmongUs.Daemon.SendEvent("vote_cast");
                    ThirdSpace_AmongUs.Logger.LogInfo("[ThirdSpace] Event: vote_cast");
                }
            }
            catch (Exception ex)
            {
                ThirdSpace_AmongUs.Logger.LogError($"[ThirdSpace] Error in CastVote patch: {ex.Message}");
            }
        }
    }

    /// <summary>
    /// Patch for reporting a body.
    /// </summary>
    [HarmonyPatch(typeof(PlayerControl), nameof(PlayerControl.ReportDeadBody))]
    public class Patch_ReportBody
    {
        [HarmonyPostfix]
        public static void Postfix(PlayerControl __instance)
        {
            if (ThirdSpace_AmongUs.Daemon == null || !ThirdSpace_AmongUs.Daemon.IsConnected)
                return;

            try
            {
                // Check if we reported
                if (__instance != null && __instance.AmOwner)
                {
                    ThirdSpace_AmongUs.Daemon.SendEvent("body_reported");
                    ThirdSpace_AmongUs.Logger.LogInfo("[ThirdSpace] Event: body_reported");
                }
            }
            catch (Exception ex)
            {
                ThirdSpace_AmongUs.Logger.LogError($"[ThirdSpace] Error in ReportBody patch: {ex.Message}");
            }
        }
    }

    /// <summary>
    /// Patch for task completion.
    /// </summary>
    [HarmonyPatch(typeof(PlayerTask), nameof(PlayerTask.Complete))]
    public class Patch_TaskComplete
    {
        [HarmonyPostfix]
        public static void Postfix()
        {
            if (ThirdSpace_AmongUs.Daemon == null || !ThirdSpace_AmongUs.Daemon.IsConnected)
                return;

            try
            {
                ThirdSpace_AmongUs.Daemon.SendEvent("task_complete");
                ThirdSpace_AmongUs.Logger.LogInfo("[ThirdSpace] Event: task_complete");
            }
            catch (Exception ex)
            {
                ThirdSpace_AmongUs.Logger.LogError($"[ThirdSpace] Error in TaskComplete patch: {ex.Message}");
            }
        }
    }

    /// <summary>
    /// Patch for vent usage.
    /// </summary>
    [HarmonyPatch(typeof(Vent), nameof(Vent.Use))]
    public class Patch_VentUse
    {
        private static bool _wasInVent = false;

        [HarmonyPostfix]
        public static void Postfix(Vent __instance)
        {
            if (ThirdSpace_AmongUs.Daemon == null || !ThirdSpace_AmongUs.Daemon.IsConnected)
                return;

            try
            {
                if (PlayerControl.LocalPlayer == null)
                    return;

                bool isInVent = PlayerControl.LocalPlayer.inVent;
                
                if (isInVent && !_wasInVent)
                {
                    ThirdSpace_AmongUs.Daemon.SendEvent("vent_enter");
                    ThirdSpace_AmongUs.Logger.LogInfo("[ThirdSpace] Event: vent_enter");
                }
                else if (!isInVent && _wasInVent)
                {
                    ThirdSpace_AmongUs.Daemon.SendEvent("vent_exit");
                    ThirdSpace_AmongUs.Logger.LogInfo("[ThirdSpace] Event: vent_exit");
                }
                
                _wasInVent = isInVent;
            }
            catch (Exception ex)
            {
                ThirdSpace_AmongUs.Logger.LogError($"[ThirdSpace] Error in VentUse patch: {ex.Message}");
            }
        }
    }

    /// <summary>
    /// Patch for sabotage events.
    /// </summary>
    [HarmonyPatch(typeof(ShipStatus), nameof(ShipStatus.RepairSystem))]
    public class Patch_Sabotage
    {
        [HarmonyPrefix]
        public static void Prefix(ShipStatus __instance, SystemTypes systemType, PlayerControl player, byte amount)
        {
            if (ThirdSpace_AmongUs.Daemon == null || !ThirdSpace_AmongUs.Daemon.IsConnected)
                return;

            try
            {
                // amount == 128 typically means sabotage start
                // We want to detect when sabotage is triggered
                if (amount >= 128)
                {
                    string eventName = systemType switch
                    {
                        SystemTypes.Reactor => "sabotage_reactor",
                        SystemTypes.LifeSupp => "sabotage_oxygen",
                        SystemTypes.Electrical => "sabotage_lights",
                        SystemTypes.Comms => "sabotage_comms",
                        _ => null
                    };

                    if (eventName != null)
                    {
                        ThirdSpace_AmongUs.Daemon.SendEvent(eventName);
                        ThirdSpace_AmongUs.Logger.LogInfo($"[ThirdSpace] Event: {eventName}");
                    }
                }
                // Check for sabotage fixed (amount < 64 often indicates repair)
                else if (amount < 64 && amount != 0)
                {
                    ThirdSpace_AmongUs.Daemon.SendEvent("sabotage_fixed");
                    ThirdSpace_AmongUs.Logger.LogInfo("[ThirdSpace] Event: sabotage_fixed");
                }
            }
            catch (Exception ex)
            {
                ThirdSpace_AmongUs.Logger.LogError($"[ThirdSpace] Error in Sabotage patch: {ex.Message}");
            }
        }
    }

    /// <summary>
    /// Patch for game start.
    /// </summary>
    [HarmonyPatch(typeof(ShipStatus), nameof(ShipStatus.Begin))]
    public class Patch_GameStart
    {
        [HarmonyPostfix]
        public static void Postfix()
        {
            if (ThirdSpace_AmongUs.Daemon == null || !ThirdSpace_AmongUs.Daemon.IsConnected)
                return;

            try
            {
                ThirdSpace_AmongUs.Daemon.SendEvent("game_start");
                ThirdSpace_AmongUs.Logger.LogInfo("[ThirdSpace] Event: game_start");
            }
            catch (Exception ex)
            {
                ThirdSpace_AmongUs.Logger.LogError($"[ThirdSpace] Error in GameStart patch: {ex.Message}");
            }
        }
    }

    /// <summary>
    /// Patch for game end.
    /// </summary>
    [HarmonyPatch(typeof(EndGameManager), nameof(EndGameManager.SetEverythingUp))]
    public class Patch_GameEnd
    {
        [HarmonyPostfix]
        public static void Postfix(EndGameManager __instance)
        {
            if (ThirdSpace_AmongUs.Daemon == null || !ThirdSpace_AmongUs.Daemon.IsConnected)
                return;

            try
            {
                // Determine if we won or lost
                bool localPlayerWon = false;
                
                if (PlayerControl.LocalPlayer != null)
                {
                    var data = PlayerControl.LocalPlayer.Data;
                    if (data != null)
                    {
                        // If we're impostor, we win if impostors won
                        // If we're crewmate, we win if crewmates won
                        bool isImpostor = data.Role != null && data.Role.IsImpostor;
                        bool impostorsWon = TempData.DidHumansWin == false;
                        localPlayerWon = (isImpostor && impostorsWon) || (!isImpostor && !impostorsWon);
                    }
                }

                string eventName = localPlayerWon ? "game_end_win" : "game_end_lose";
                ThirdSpace_AmongUs.Daemon.SendEvent(eventName);
                ThirdSpace_AmongUs.Logger.LogInfo($"[ThirdSpace] Event: {eventName}");
            }
            catch (Exception ex)
            {
                ThirdSpace_AmongUs.Logger.LogError($"[ThirdSpace] Error in GameEnd patch: {ex.Message}");
            }
        }
    }

    #endregion
}
