# Mordhau exploration


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