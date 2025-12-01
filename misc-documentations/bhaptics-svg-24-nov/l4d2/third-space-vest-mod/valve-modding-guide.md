https://developer.valvesoftware.com/wiki/Left_4_Dead_2/Scripting

Scripting
< Left 4 Dead 2
Jump to navigationJump to search
<
Left 4 Dead 2
Alien Swarm / Reactive Drop
Portal 2
Counter-Strike: Global Offensive
Team Fortress 2
Source 2013 MP (2025)
Edit Tabs
← Left 4 Dead 2/Docs

Contents
1	Useful links
2	Overview
3	Uses
3.1	Director Scripts
3.2	Entity Scripts ↓
3.3	Global Scripts ↓
3.4	Other Uses
4	Script Files
4.1	Location
4.2	Decrypting NUC Files
5	Loading VScripts
5.1	Director Scripts
5.2	Entity Scripts
5.3	Global Scripts
6	Scripting Environment
6.1	Table Structure
6.2	Delegation
7	Entity Scripts
7.1	I/O system Interaction
8	Global Scripts
8.1	Mode Scripts
8.1.1	Tables
8.2	Map Scripts
8.2.1	Tables
8.3	Scripted Mode
8.3.1	Available Functions
8.4	Shared Tables
9	Glossary
10	Director Options
11	Third-Party Tools
11.1	VSLib
12	See also
12.1	Intros
12.2	Documentations
12.3	Miscelleanous
13	External links
Useful links
List of game events
List of script functions
Director Scripts
Expanded Mutation System
Mutation Gametype
Decrypted mutations
Overview
 Left 4 Dead 2 VScripts are server-side scripts that are run in an in-game virtual machine. They are written in Squirrel, a compiled scripting language similar to Lua. The VM currently runs Squirrel version 3.0.4.

Uses
Director Scripts
The most common use of VScripts in Left 4 Dead 2 is to temporarily influence the behavior of the AI Director. These scripts can range from simple adjustments of infected spawning and prohibiting boss infected, to custom events like onslaughts and gauntlets, and even complex staged panic events and fully custom finales. Most of the events in the official campaigns are mainly implemented this way.

Director Scripts work mainly by writing overriding values of the various variables used by the Director into a DirectorOptions table.

Only one Director Script can be running at a time. Executing a new one will terminate any previous running one and remove any values it set in DirectorOptions.

Entity Scripts ↓
Another common use is to attach a script to an entity. The script provides easy access to read and modify many of the entity's properties, and even to write new KeyValues. This allows for controlling entities in ways that would be very complicated or impossible to with the entity I/O system in Hammer.

Any entity is capable of running a script, and has the ability to set a specified think function to run every 0.1 seconds, as well as executing script code as an entity output.

Some entities also have specialized functions for VScripts, with the most prominent being point_script_use_target, which allows for turning other entities into fully programmable timed buttons.

Global Scripts ↓
Scripts can also be made to run on map load, based on game mode and optionally map name. These scripts are commonly used to create pure script addons and modify global Director options for mutations.

Global scripts can have script hook functions added that get called from the game at certain events, like when players/objects take damage.

There are many utility functions and features readily available for these scripts, including a resource and building system, and custom panic wave spawning. Please see Valve's Expanded Mutation System tutorial for more information.

Other Uses
All scripts can access functions for many features, including spawning entities either from precompiled lists or programmatically, spawning infected, a HUD system, storing data across levels and to disk, and much more.

Please see L4D2 Vscript Examples for more examples and ideas.

Script Files
The scripts are loaded from text files with the file extensions .nut and .nuc, where .nuc denotes encryption of plaintext .nut. Custom scripts are read from \left 4 dead 2\left4dead2\scripts\vscripts\, as well as \scripts\vscripts\ when packed into a .vpk file.

Location
Official .nuc script files are located in scripts/vscripts in multiple locations
Note:
Browse and extract VPK files with third-party programs like GCFScape.
left 4 dead 2\left4dead2\pak01_dir.vpk
left 4 dead 2\left4dead2_dlc1\pak01_dir.vpk
April 22, 2010 The Passing update
left 4 dead 2\left4dead2_dlc2\pak01_dir.vpk
October 5, 2010 The Sacrifice update
left 4 dead 2\left4dead2_dlc3\pak01_dir.vpk
March 22, 2011 Cold Stream Beta / L4D1 Transition Project update
left 4 dead 2\update\pak01_dir.vpk
This is where mutations were updated/replaced bi-weekly. Also contain files introduced with September 24, 2020 The Last Stand Community Update.
left 4 dead 2\sdk_content\scripting\scripts\vscripts\
Plaintext versions of many of the scripts introduced in the EMS update.
Decrypting NUC Files
.nuc files are ICE encrypted .nut files. The encryption key is SDhfi878. You can use VICE to decode them.
You may find decrypted mutation vscripts here.

Loading VScripts
VScripts are loaded in a variety of ways, depending on their context. They can also be manually loaded with the console command script_execute filename.

Director Scripts
info_director inputs
BeginScript <scriptlist>
Executes generic Director scripts, whether for onslaught events or changing spawning behavior.
They are placed in the LocalScript script scope.
EndScript
Ends the currently running local script, then resets the Director options to either map-specific values, or default values.
ScriptedPanicEvent <scriptlist>
With the given scripts, set up the structure of a scripted panic event.
They are placed in the LocalScript script scope.
Note:
The scripts of these inputs must reside under the "vscripts" subfolder. Events will play out only the 1 second DELAY "stage 0" otherwise.
Finale scripts
As a trigger_finale finale starts, it loads a script of this format: [mapname]_finale.nut.
They are placed in the g_MapScript script scope.
Entity Scripts
Keyvalue
Entity Scripts (vscripts) <scriptlist>
As an entity is preparing itself before it spawns, the VScript path names in that keyvalue will be ran. (See Entity Scripts for more info.)
Input
RunScriptFile <script>
Inserts the given script into the entity's scope, then runs it.
Entity Scripts are placed in the _<unique ID>_<entity name> script scope.

Global Scripts
Mode scripts
A script with the same name as the current game mode. Loaded when a new mode is set.
They are placed in the g_ModeScript script scope.
Tip:
The map command can also set gamemodes. For example, map <map name> mutation12 loads the Realism Versus mode script, mutation12.nuc.
Note:
Adding a script for a mode will enable Scripted Mode.
Map-specific mode scripts
Per-map scripts when the map is loaded in the specified game mode. They are in the name format: [mapname]_[modename].nut.
They are placed in the g_MapScript script scope.
Addon scripts
These scripts vary in context, but they all share one big attribute: they don't override files with the same name, but instead load alongside them. They are executed in the order below, each after its respective base script (without _addon suffix). A script is considered an "addon script" if it's named as:
mapspawn_addon.nut (runs once every chapter) - getroottable() scope
response_testbed_addon.nut (runs once every chapter) - g_rr scope
scriptedmode_addon.nut (runs twice every round) - g_MapScript scope
director_base_addon.nut (runs twice every round) - DirectorScript scope
Scripting Environment
Please see Left 4 Dead 2/Script Functions for built in classes and functions.

When a script is loaded, it is placed into a table, or Script Scope. Global and Director Scripts are put into set scopes, while a unique scope is generated for each Entity Script. Please see Vscript Fundamentals for more information.

Table Structure
DirectorScript = 			// Base Director Scope.
{
	DirectorOptions 		// Base DirectorOptions table.
	MapScript =  			// Script scope for either map scripts or trigger_finale scripts
	{
		DirectorOptions         
		BaseScriptedDOTable 	// Default DirectorOptions for Scripted mode
		ChallengeScript = 	// Script scope for mode scripts
		{
			DirectorOptions // Filled with BaseScriptedDOTable, MutationOptions and MapOptions; if identical keys are present then the most-right table gets precedence.
			MutationState 	// Filled with MapState overwriting previous values
			MutationOptions // Initial values used if defined in mode script 
		}
		LocalScript =		// Script scope for scripts executed through info_director 'BeginScript' or 'ScriptedPanicEvent' inputs
		{
			DirectorOptions // DirectorOptions for current Director Script (like onslaughts). Only available when a script is active
		}
		MapOptions 		// Initial values used if defined in map script 
		MapState 		// Initial values used if defined in map script 
	}
}
g_MapScript 	// Global reference to the Map Script scope (DirectorScript.MapScript).
g_ModeScript 	// Global reference to the Mode Script scope (DirectorScript.MapScript.ChallengeScript).
SessionOptions 	// Global reference to g_ModeScript.DirectorOptions (Scripted mode only).
SessionState  	// Global reference to g_ModeScript.MutationState (Scripted mode only).

g_rr		// Scope holding the Response Rule system.
g_RoundState	// TODO
Delegation
Some of the tables have delegation set up, so that if a key isn't present in it, it is read from its delegate (usually parent) table instead.

The tables are delegated like this (delegates on the right):

The Director Scope
(DirectorScript.MapScript.ChallengeScript or DirectorScript.MapScript.LocalScript) < DirectorScript.MapScript < DirectorScript < ::
DirectorOptions
DirectorScript.MapScript.ChallengeScript.DirectorOptions (Scripted mode only) < DirectorScript.MapScript.LocalScript.DirectorOptions (when Director Script active) < DirectorScript.MapScript.DirectorOptions < DirectorScript.DirectorOptions
See GetDirectorOptions in director_base.nut.
Entity Scripts
Use script scope _<unique ID>_<entity name>

Adding a script to the Entity Scripts KeyValue of a server-side entity loads the script as an Entity Script. The script is executed when the entity spawns, and loads into a unique script scope made up of an unique identifier followed by the entity name or class name.

A think function can be set with the thinkfunction KeyValue, the specified script function every 0.1 seconds. While it has the potential to become expensive, a programmer is able to limit the amount of code executed. Functions can also be manually called through the I/O system with the input RunScriptCode function_name(argument, …).

Entity Scripts have a self reference to their owning entity handle, allowing the script easy access to control the entity through its class methods. There are also hook functions available depending on the entity class. Both methods and hooks are documented here.

Some entities have additional script functionality:

point_script_use_target - Has both methods and hooks for controlling the button.
logic_script - Can pass multiple entity names to the script as an array called EntityGroup.
point_template
env_entity_maker
info_item_position
The script can be reloaded with console command ent_fire <name of entity> runscriptfile <relative vscript path>. This is useful for quick script reloading.

I/O system Interaction
Any script can use the EntFire() and DoEntFire() functions to fire outputs to map entities. Since the activator and caller arguments in DoEntFire() take a script handle, it can be used to fire an output to an entity using the !self or !activator keyword, even without having to know its name, as long as the entity handle is available.

EntFire( "church_bell_relay", "Trigger", 0 ); // Fires an output to the Trigger input of the named entity.

player <- null;
while(player = Entities.FindByClassname(player, "player"))   // Iterate through the script handles of the players.
{
    DoEntFire("!self", "speakresponseconcept", "PlayerLaugh", 0, null, player); // Make each player laugh.
}
Conversely, the CBaseEntity::ConnectOutput() and DisconnectOutput() functions can be used to call a script function when the specified entity output fires. In addition, arbitrary VScript code can be run from the I/O system, using the RunScriptCode input available in all entities. The code will run in the current entities script scope.

Warning:
Never use double-quotation marks in any Hammer Output, since it will corrupt the map file. This means that strings cannot be passed with RunScriptCode.
Global Scripts
Naming a script file with a game mode name makes it a mode specific script which executes every time a map is loaded in the specified mode. If a Mode Script exists, a map specific script with the map name followed by an underscore and the mode name can also be loaded.

Mode Scripts
Use script scope g_ModeScript

Tables
MutationState
Initial values for the SessionState table.
MutationOptions
Initial values for the SessionOptions table.
Map Scripts
Use script scope g_MapScript

Tables
MapState
Map specific values for the SessionState table.
MapOptions
Map specific values for the SessionOptions table.
Scripted Mode
Adding a Mode Script will enable Scripted Mode for the game mode. This works on the base game modes included in the game as well.

Scripted Mode loads utility functions into the g_MapScript scope, disables the hardcoded setting of 2 on the MaxSpecials Director option, and enables game event callbacks and script hook functions. It also seems to break the finale tank music in Dark Carnival.

Todo: 	Does enabling Scripted Mode have any other consequences?
Available Functions
Todo: 	Document the available utility features.
Shared Tables
SessionState
A table for storing session specific variables. Not preserved across level transitions.
SessionOptions
Active Director Options for the game mode.
Glossary
DirectorOptions
A table of named variables that override the AI Director behavior.
Entity handle
Also known as EHANDLE.
Todo: 	Looks like some sort of pointer reference to an entity.
Script handle
An entity instance with accessors and mutators to the C++ entity object. Also known as HScript.
Script scope
The table where the variables, functions and classes of a VScript are placed.
Director Options
Please see L4D2 Director Scripts for a table of available options.

Third-Party Tools
VSLib
VSLib (VScript Library) is a simple, lightweight library for L4D2's VScript mutation system. It greatly simplifies coding VScripts by taking care of a lot of tedious work for you. It is used in several popular mods like Rayman1103's Admin System and Stranded. Read more about VSLib.

See also
Intros
VScript
Mutation Gametype (L4D2)
Documentations
VSLib
L4D2 Vscript Examples
L4D2 Director Scripts
L4D2 Script Functions
Decrypted Mutation Vscripts
L4D2 Level Design/Boss Prohibition
Custom Finales Contains all original finale scripts as reference.
Extended Mutation System
Left 4 Dead 2 Tool Updates
Miscelleanous
logic_script
trigger_finale
info_director