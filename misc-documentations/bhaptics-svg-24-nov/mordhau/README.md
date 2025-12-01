# Mordhau exploration

## New info

There is a local mordhau server that can be useful:
https://github.com/Serega25511s/Mordhau-LAN-API-Emulator

About the Project
Mordhau LAN API Emulator is a server API emulator for the game Mordhau, designed for local (LAN) play without the need for an internet connection or official servers. This project allows you to run your own backend for Mordhau, play over a local network, and test or modify the server side of the game in offline mode.

⚠️ Attention: This project is for educational and research purposes only. Use at your own risk.

Features
Full emulation of main Mordhau API endpoints for LAN mode
Does not require an internet connection
Integration with Goldberg Emu for Steam API emulation and LAN support
Storage of users, servers, matches, and inventory data in memory (no database required)
Flexible configuration via code



## Fandom server configuration

This site seems super useful, especially because it states the list of server options for the logs!!!

We could probably try some logging configurations for the client as well?

https://mordhau.fandom.com/wiki/Server_Configuration

Server Configuration
Sign in to edit
With all of the following examples, there can be multiple values underneath the [Heading] value, but for the sake of making it clear which heading each of these settings have to be placed under, the heading will be repeated at the start of each code snippet.

If the heading doesn't exist, you should add it, otherwise include the setting under the existing heading in the file.

Important: Only make changes to these INI files when the server is shut down, as the file will be overwritten with the version held in memory when the server shuts down.



Contents
1	Config Folder
2	Engine.ini
2.1	Tick rate
2.2	Default Map
2.3	Altering Gravity
2.4	Logging
3	Game.ini
3.1	General Settings
3.2	Disabling Votekick
3.3	Admins
3.4	Max Players
3.5	Server Password
3.6	Map Rotation
3.7	Game-mode Settings
3.8	Mods & Server Actors
3.9	Override Game-modes
3.10	Webhooks
3.11	RCON
Config Folder
Windows (Steam): C:\Program Files (x86)\Steam\steamapps\common\Mordhau Dedicated Server\Mordhau\Saved\Config\WindowsServer\

Windows (WindowsGSM): <WindowsGSM Folder>\servers\1\serverfiles\steamapps\Mordhau\Saved\Config\WindowsServer\

Linux (LinuxGSM): ~/serverfiles/Mordhau/Saved/Config/LinuxServer/

If you are not self-hosting, the location of this config file may be different. Your server host may provide a UI to allow you to edit these files or individual settings, they may also provide you with FTP details to access the filesystem and edit the files directly.


Engine.ini

Tick rate
The tick rate needs to be set as follows, repeating under the two headings. Separate tick rates can specified for both online and LAN connections.

[/Script/OnlineSubsystemUtils.IpNetDriver]
NetServerMaxTickRate=120
LanServerMaxTickRate=60

[IpDrv.TcpNetDriver]
NetServerMaxTickRate=120
LanServerMaxTickRate=60
 


Default Map
This setting needs to have the full folder path for the map to be specified, which may be difficult to determine especially for modded maps. Setting the map name as the first launch parameter for the server is typically preferred.

For modded maps, you will have to rely on the mod author specifying the full path for their map on their mod.io page description.

[/Script/EngineSettings.GameMapsSettings]
ServerDefaultMap=/Game/Mordhau/Maps/DuelCamp/FFA_Camp
 


Altering Gravity
You can adjust the server gravity, in this case the default is set to -980. This is the amount of force that "pushes" players down. Increasing this to be a smaller negative number like -100 would result in lower gravity.

[/Script/Engine.PhysicsSettings]
DefaultGravityZ=-980.000000
 


Logging
You can modify the verbosity and levels of server logging, by default multiple log types are set to be Verbose, that you may want to alter to reduce log file sizes.

Options are (in order of severity): Fatal, Error, Warning, Display, Log, Verbose, VeryVerbose

To disable, you can set to: NoLogging

The Default settings look like the following:

[LogFiles]
PurgeLogsDays=5
MaxLogFilesOnDisk=10
LogTimes=True

[Core.Log]
LogMordhauGameInstance=Verbose
LogMordhauGameSession=Verbose
LogMordhauWebAPI=Verbose
LogMordhauPlayerController=Verbose
LogPlayFabAPI=Verbose
LogMatchmaking=Verbose
 

Recommended Settings:

[Core.Log]
LogMordhauGameInstance=Log
LogMordhauGameSession=Log
LogMordhauWebAPI=Log
LogMordhauPlayerController=Log
LogPlayFabAPI=Log
LogMatchmaking=Log
LogStreaming=Error
LogClass=Error
 

If you are struggling with massive log sizes due to DDOS attacks or other similar incidents, you can disable network logging entirely:

[Core.Log]
LogNet=NoLogging
 


Game.ini

General Settings
[/Script/Mordhau.MordhauGameSession]
bAdvertiseServerViaSteam=True
bUseOfficialBanList=True
bUseOfficialMuteList=True
 

[/Script/Mordhau.MordhauGameMode]
bIsThirdPersonCameraDisabled=1
ConstrainAspectRatio=1.7777778
bIsHitStopOnTeamHitsDisabled=False
bDisableClientMods=False
bAllowAdminChat=True
bAllowWhisperChat=True
bLogKillfeed=False
bLogChat=False
bLogScore=False
 

Disabling Votekick
Added support to disable vote-kick option for FFA and SG game modes (default True)

; Deathmatch
; ------------------
[/Game/Mordhau/Blueprints/GameModes/BP_DeathmatchGameState.BP_DeathmatchGameState_C]
bAllowVoteKick=False

; Swordgame
; ------------------
[/Game/Mordhau/Blueprints/GameModes/BP_SwordGameGameState.BP_SwordGameGameState_C]
bAllowVoteKick=False

Admins
You can add yourself and others as permanent admins, so that whenever you join the server it automatically recognises you as an admin to use commands.

Multiple admins can be added with additional Admins= entries, with a new line for each separate PlayfabID.

[/Script/Mordhau.MordhauGameSession]
Admins=<PlayfabID1>
Admins=<PlayfabID2>
Admins=<PlayfabID3>
 

As an alternative, you can also set an Admin Password and log in each time you join server with the AdminLogin <Password> console command, but you must be very careful to whom you give that password as there is nothing to stop them adding further admins and running amok.

[/Script/Mordhau.MordhauGameSession]
AdminPassword=<yourpassword>
 

All admins can also use the AddAdmin <PlayfabID> and RemoveAdmin <PlayfabID> console commands. You can view a list of current admins with the AdminList command. You should be very selective in who you assign as an admin, as they will be able to use these commands to add additional admins without your approval.


Max Players
The following would set the maximum amount of players/slots on the server to 24. Generally going higher than 64 would cause performance issues with the Engine and is not recommended.

Great care should be taken in increasing both the tick rate and the max players, as this would create an exponential decrease in server performance.

You can monitor the performance of the tick rate with m.ShowServerStats 1 to ensure your server can handle the amount of players, and decrease the tick rate or players accordingly. Minimum tick rate always fluctuates a small amount, so only pay attention to the average and maximum tick rate displayed to measure performance.

[/Script/Mordhau.MordhauGameSession]
MaxSlots=24

[/Script/Engine.GameSession]
MaxPlayers=24
 


Server Password
To create a private server, all you need to do is specify the Server Password as follows:

[/Script/Mordhau.MordhauGameSession]
ServerPassword=<Your Password>
 

You can also join a private server from the command line, with the open <Server IP>?ServerPassword=<Your Password> console command.


Map Rotation
See Server Map Names for a full list of all official maps and their unique names. For modded maps you'll have to rely on the mod author providing the map names in the description of their mod on mod.io

Multiple maps can be added with additional MapRotation= entries, with a new line for each separate map.

[/Script/Mordhau.MordhauGameMode]
MapRotation=FFA_Cortile
MapRotation=FFA_Contraband
MapRotation=FFA_Highland
 


Game-mode Settings
The specifics of Game-modes can be set generally for all modes as follows:

[/Script/Mordhau.MordhauGameMode]
AutoKickOnTeamKillAmount=999
PlayerRespawnTime=15.000000
BallistaRespawnTime=300.000000
CatapultRespawnTime=300.000000
HorseRespawnTime=300.000000
DamageFactor=1.000000
TeamDamageFlinch=1
TeamDamageFactor=1.000000
AutoKickOnTeamKillAmount=999
 

Time durations here are in seconds.

You can also specify these settings to be changed to different values for each game-mode:

; Skirmish
; ------------------
[/Game/Mordhau/Blueprints/GameModes/BP_SkirmishGameState.BP_SkirmishGameState_C]
RoundDuration=300

[/Game/Mordhau/Blueprints/GameModes/BP_SkirmishGameMode.BP_SkirmishGameMode_C]
DamageFactor=1.000000
TeamDamageFlinch=1.000000
TeamDamageFactor=1.000000
AutoKickOnTeamKillAmount=999

; Deathmatch
; ------------------
[/Game/Mordhau/Blueprints/GameModes/BP_DeathmatchGameMode.BP_DeathmatchGameMode_C]
ScoreToWin=5000
PlayerRespawnTime=0.000000

[/Game/Mordhau/Blueprints/GameModes/BP_DeathmatchGameState.BP_DeathmatchGameState_C]
MatchDurationMax=3000

; Team Deathmatch
; ------------------
[/Game/Mordhau/Blueprints/GameModes/BP_TeamDeathmatchGameMode.BP_TeamDeathmatchGameMode_C]
TeamScoreToWin=1000
DamageFactor=1.000000
TeamDamageFlinch=1
TeamDamageFactor=1.000000
AutoKickOnTeamKillAmount=999

[/Game/Mordhau/Blueprints/GameModes/BP_TeamDeathmatchGameState.BP_TeamDeathmatchGameState_C]
MatchDurationMax=1200

; Frontline
; ------------------
[/Game/Mordhau/Blueprints/GameModes/Battle/BP_FrontlineGameMode.BP_FrontlineGameMode_C]
PlayerRespawnTime=15.000000
BallistaRespawnTime=300.000000
CatapultRespawnTime=300.000000
HorseRespawnTime=300.000000
DamageFactor=1.000000
TeamDamageFlinch=1
TeamDamageFactor=1.000000
AutoKickOnTeamKillAmount=999

; Invasion
; ------------------
[/Game/Mordhau/Blueprints/GameModes/Push/BP_PushGameMode.BP_PushGameMode_C]
PlayerRespawnTime=15.000000
BallistaRespawnTime=300.000000
CatapultRespawnTime=300.000000
HorseRespawnTime=300.000000
DamageFactor=1.000000
TeamDamageFlinch=1
TeamDamageFactor=1.000000
AutoKickOnTeamKillAmount=999
 

Time durations here are in seconds.


Mods & Server Actors
Mods can be located via mod.io. For most mods (such as maps), you can locate their unique Mod ID from the sidebar on mod.io labelled as "Resource ID". This ID can be added as a Mods= line as follows.

[/Script/Mordhau.MordhauGameSession]
Mods=<Resource ID 1>
Mods=<Resource ID 2>
Mods=<Resource ID 3>
 

In some cases, the mod may specify to add it as a "Server Actor". For some mods, these might be entirely server-side only.

[/Script/Mordhau.MordhauGameMode]
SpawnServerActorsOnMapLoad=<Path to Server Actor 1>
SpawnServerActorsOnMapLoad=<Path to Server Actor 2>
 


Override Game-modes
It's possible to override the game-mode for a specific map. An example use case would be to be able to play the Ranked Duel versions of maps that have all the obstacles and spikes removed as FFA maps. The drawback is that the Ranked duel maps only have Spawn points set up for two individuals, at opposing sides of the map. It's possible to override these spawn points with a Server Actor mod to compensate.

[/Script/Mordhau.MordhauGameMode]
MapGameModeOverrides=(("DU_Truce","/Game/Mordhau/Blueprints/GameModes/BP_DeathmatchGameMode.BP_DeathmatchGameMode_C"), ("DU_Arena","/Game/Mordhau/Blueprints/GameModes/BP_DeathmatchGameMode.BP_DeathmatchGameMode_C"), ("DU_Highlands","/Game/Mordhau/Blueprints/GameModes/BP_DeathmatchGameMode.BP_DeathmatchGameMode_C"))
 


Webhooks
It's possible to connect the server to Discord Webhooks, so that it outputs admin actions/punishments and the server chat to a specified channel.

It's important that the URL provided by Discord is wrapped in quotes, so that the server submits to the correct URL.

[/Script/Mordhau.MordhauGameSession]
AdminActionWebhookURL="<Discord Webhook URL>"
AdminPunishmentWebhookURL="<Discord Webhook URL>"
AdminChatCommandWebhookURL="<Discord Webhook URL>"
ServerLagReportsWebhookURL="<Discord Webhook URL>"
ChatFeedWebhookURL="<Discord Webhook URL>"
 


RCON
[/Script/Mordhau.MordhauGameSession]
RconPassword=<Your password>
RconPort=<RCON Port>
 

Broadcasts can be set to be Listening by default. Example list of Broadcasts are:

Chat: Connected clients will receive the chat feed
Login: This will inform clients when a player logs in or out
Matchstate: Informs clients when the match is starting or ending (may add more later)
Scorefeed: Notifies clients when scores change (both player and team)
Killfeed: Notifies clients when a player is killed
Custom: A customizable channel that modders can use to broadcast custom information
Example of settings:

[Rcon]
ListeningToByDefault=InsertTypeOfBroadcastHere
ListeningToByDefault=chat
ListeningToByDefault=custom
 


## example of a mod for mordhau
https://mod.io/g/mordhau/m/heartbeat-mod#description


## Mod manager 
https://mod.io/g/mordhau/m/clientside-mod-autoloader#description

## Guide

Guide on where to place mods
https://mod.io/g/mordhau/r/where-to-place-mods

Guide
Because this key information can't be found easily, I decided to expose it here on this easy guide

 
The downloaded files from mods will usually come in a zip file. you need to unzip and put the .pak files that are inside the zip into

SteamLibrary\steamapps\common\Mordhau\Mordhau\Content\CustomPaks

If the folder CustomPaks doesn't exist, Create it

## Dicitonary lib

I am not sure it is relevant., but maybe this project can give insights on how to create mods?

WHAT'S THIS?
This is a utility & dependency mod for modders and server admins,
It provides a Data Control Library for mods to store/retrieve data to/from Keys.

The main purpose of this mod is to make configuration of Mordhau Mods easier,
Also to help modders and server admins Log their stuff by using a function/command 📝







INSTALLATION:

Server:
Add this to your server's game.ini file, Under [/Script/Mordhau.MordhauGameMode]:
SpawnServerActorsOnMapLoad=/DictionaryLib/BP_DLib_Core.BP_DLib_Core_C

MSDK:
https://github.com/thePeacey/MSDK-DictionaryLib-Kit (read the readme)








HOW TO USE:
Only admins can use the commands,
Even if the CMD Whitelist is ON!

The following are Data Control commands:
!dlib set <OBJECT> <KEY> <VALUE>
!dlib add <OBJECT> <KEY> <VALUE>
!dlib rem <OBJECT> <KEY> <VALUE>
!dlib get <OBJECT> <KEY>

Examples:
!dlib set MyFabid DONATED true Sets the DONATED key for my fabid to true,
!dlib get MyFabid DONATED Retrieves the value of my fabid's DONATED key,
!dlib add MyFabid RULE_BREAKS FFA Adds FFA to my fabid's rulebreak history,

Any key and any object and any value, All set by you!


NEW! Library Control has been added (Useful for modders):
!dlib library.add <LIBRARY> <ITEM>
!dlib library.remove <LIBRARY> <ITEM>

<LIBRARY> is an <OBJECT>, But it's data control method does not retrieve or store keys.







FAQ:

- How do i change the command prefix?
-> Use the following commands:
!dlib set dlib_config cmd_prefix <character>
!dlib reload

- How do i give permission to only certain admins to use this?
-> Use the following commands:
!dlib set dlib_config cmd_whitelist_enabled true
!dlib add dlib_config cmd_whitelist <fabid>
!dlib reload

- How do i manually edit the data?
-> Go to: Saved\PlayerFiles\DictionaryLib

- Are any of the parameters Case-Sensitive?
-> NO! All Key & Object names are case-insensitive!
Example: CMD_WHITELIST and cmd_whitelist are same keys,
BOX and box are same objects!







CREDITS:
# Ellpee
# SoomRK
# MORDHAU Modding Community