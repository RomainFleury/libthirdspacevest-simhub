// Third Space Vest Haptic Integration for Left 4 Dead 2
// VScript (Squirrel) mod to output damage and game events to console.log
//
// Installation:
// 1. Copy this file to: <L4D2>/left4dead2/scripts/vscripts/thirdspacevest_haptics.nut
// 2. Create a map script or use script_execute to load it
// 3. Launch game with -condebug flag
//
// Event Format: [L4D2Haptics] {EventType|param1|param2|...}

// Configuration
local ENABLE_DEBUG = false;  // Set to true for verbose logging

// Helper function to write events to console (which goes to console.log with -condebug)
function WriteHapticEvent(eventType, params = {}) {
    local paramStr = "";
    foreach (key, value in params) {
        if (paramStr != "") paramStr += "|";
        paramStr += value.tostring();
    }
    
    // Format: [L4D2Haptics] {EventType|param1|param2|...}
    local eventLine = format("[L4D2Haptics] {%s|%s}", eventType, paramStr);
    print(eventLine);
    
    if (ENABLE_DEBUG) {
        print(format("[L4D2Haptics Debug] Event: %s, Params: %s", eventType, paramStr));
    }
}

// Helper to get damage type name
function GetDamageTypeName(damageType) {
    // Damage type constants (DMG_* from Source engine)
    if (damageType & 0x0001) return "generic";      // DMG_GENERIC
    if (damageType & 0x0002) return "crush";        // DMG_CRUSH
    if (damageType & 0x0004) return "bullet";       // DMG_BULLET
    if (damageType & 0x0008) return "slash";         // DMG_SLASH
    if (damageType & 0x0010) return "burn";          // DMG_BURN
    if (damageType & 0x0020) return "vehicle";       // DMG_VEHICLE
    if (damageType & 0x0040) return "fall";          // DMG_FALL
    if (damageType & 0x0080) return "blast";         // DMG_BLAST
    if (damageType & 0x0100) return "club";          // DMG_CLUB
    if (damageType & 0x0200) return "shock";         // DMG_SHOCK
    if (damageType & 0x0400) return "sonic";          // DMG_SONIC
    if (damageType & 0x0800) return "energybeam";    // DMG_ENERGYBEAM
    if (damageType & 0x1000) return "prevent_physics_force"; // DMG_PREVENT_PHYSICS_FORCE
    if (damageType & 0x2000) return "nevergib";       // DMG_NEVERGIB
    if (damageType & 0x4000) return "alwaysgib";     // DMG_ALWAYSGIB
    if (damageType & 0x8000) return "drown";          // DMG_DROWN
    return "unknown";
}

// Helper to get entity name
function GetEntityName(entity) {
    if (!entity || !entity.IsValid()) return "unknown";
    
    // Try to get player name first
    if (entity.IsPlayer()) {
        local player = entity;
        if ("GetPlayerName" in player) {
            return player.GetPlayerName();
        }
    }
    
    // Try classname
    if ("GetClassname" in entity) {
        return entity.GetClassname();
    }
    
    return "unknown";
}

// Helper to calculate damage angle (relative to player view)
function GetDamageAngle(victim, attacker) {
    if (!victim || !victim.IsValid() || !victim.IsPlayer()) return 0;
    if (!attacker || !attacker.IsValid()) return 0;
    
    local victimPos = victim.GetOrigin();
    local attackerPos = attacker.GetOrigin();
    
    // Get victim's eye angles (view direction)
    local victimAngles = victim.EyeAngles();
    local victimForward = victimAngles.Forward();
    
    // Calculate direction from victim to attacker
    local toAttacker = attackerPos - victimPos;
    toAttacker.Normalize();
    
    // Calculate angle between victim's view and attacker direction
    // Dot product gives us the angle
    local dot = victimForward.Dot(toAttacker);
    local angle = acos(dot) * (180.0 / 3.14159); // Convert to degrees
    
    // Determine if attacker is to the left or right
    local cross = victimForward.Cross(toAttacker);
    local up = Vector(0, 0, 1);
    if (cross.Dot(up) < 0) {
        angle = 360 - angle; // Right side
    }
    
    return angle.tointeger();
}

// Hook into player damage events
// This function will be called when a player takes damage
function OnPlayerTakeDamage(damageTable) {
    local victim = damageTable.Victim;
    local attacker = damageTable.Attacker;
    local damage = damageTable.DamageDone;
    local damageType = damageTable.DamageType;
    
    if (!victim || !victim.IsValid()) return;
    
    // Only process player damage
    if (!victim.IsPlayer()) return;
    
    local victimName = GetEntityName(victim);
    local attackerName = "unknown";
    local damageTypeName = GetDamageTypeName(damageType);
    local angle = 0;
    
    if (attacker && attacker.IsValid()) {
        attackerName = GetEntityName(attacker);
        angle = GetDamageAngle(victim, attacker);
    }
    
    // Output damage event
    // Format: [L4D2Haptics] {PlayerHurt|damage|attacker|angle|damage_type|victim}
    WriteHapticEvent("PlayerHurt", {
        damage = damage.tointeger(),
        attacker = attackerName,
        angle = angle,
        damage_type = damageTypeName,
        victim = victimName
    });
}

// Hook into player death events
function OnPlayerDeath(victim, attacker, params) {
    if (!victim || !victim.IsValid() || !victim.IsPlayer()) return;
    
    local victimName = GetEntityName(victim);
    local attackerName = "unknown";
    local weapon = "unknown";
    
    if (attacker && attacker.IsValid()) {
        attackerName = GetEntityName(attacker);
        
        // Try to get weapon name
        if ("GetActiveWeapon" in attacker) {
            local weaponEnt = attacker.GetActiveWeapon();
            if (weaponEnt && weaponEnt.IsValid()) {
                weapon = GetEntityName(weaponEnt);
            }
        }
    }
    
    // Output death event
    // Format: [L4D2Haptics] {PlayerDeath|killer|weapon|victim}
    WriteHapticEvent("PlayerDeath", {
        killer = attackerName,
        weapon = weapon,
        victim = victimName
    });
}

// Hook into weapon fire events
function OnWeaponFire(player, weapon) {
    if (!player || !player.IsValid() || !player.IsPlayer()) return;
    
    local playerName = GetEntityName(player);
    local weaponName = "unknown";
    
    if (weapon && weapon.IsValid()) {
        weaponName = GetEntityName(weapon);
    }
    
    // Output weapon fire event
    // Format: [L4D2Haptics] {WeaponFire|weapon_name|player}
    WriteHapticEvent("WeaponFire", {
        weapon = weaponName,
        player = playerName
    });
}

// Hook into item pickup events
function OnItemPickup(player, item) {
    if (!player || !player.IsValid() || !player.IsPlayer()) return;
    if (!item || !item.IsValid()) return;
    
    local playerName = GetEntityName(player);
    local itemName = GetEntityName(item);
    local itemClass = item.GetClassname();
    
    // Check if it's a health item
    if (itemClass.find("weapon_first_aid_kit") != null || 
        itemClass.find("weapon_pain_pills") != null ||
        itemClass.find("weapon_adrenaline") != null) {
        
        // Output health pickup event
        // Format: [L4D2Haptics] {HealthPickup|item|player}
        WriteHapticEvent("HealthPickup", {
            item = itemName,
            player = playerName
        });
    }
    
    // Check if it's an ammo item
    if (itemClass.find("weapon_ammo") != null) {
        // Output ammo pickup event
        // Format: [L4D2Haptics] {AmmoPickup|player}
        WriteHapticEvent("AmmoPickup", {
            player = playerName
        });
    }
}

// Hook into infected hit events (when player hits infected)
function OnInfectedHit(infected, attacker, damage) {
    if (!infected || !infected.IsValid()) return;
    if (!attacker || !attacker.IsValid() || !attacker.IsPlayer()) return;
    
    local infectedName = GetEntityName(infected);
    local infectedClass = infected.GetClassname();
    local attackerName = GetEntityName(attacker);
    
    // Output infected hit event
    // Format: [L4D2Haptics] {InfectedHit|infected_type|damage|attacker}
    WriteHapticEvent("InfectedHit", {
        infected = infectedClass,
        damage = damage.tointeger(),
        attacker = attackerName
    });
}

// Hook into player heal events
function OnPlayerHealed(player, amount) {
    if (!player || !player.IsValid() || !player.IsPlayer()) return;
    
    local playerName = GetEntityName(player);
    
    // Output heal event
    // Format: [L4D2Haptics] {PlayerHealed|amount|player}
    WriteHapticEvent("PlayerHealed", {
        amount = amount.tointeger(),
        player = playerName
    });
}

// Initialize the mod
function InitializeHapticsMod() {
    print("[L4D2Haptics] Third Space Vest integration mod loaded!");
    print("[L4D2Haptics] Make sure you launched the game with -condebug flag");
    print("[L4D2Haptics] Events will be written to console.log");
    
    // Note: In L4D2, we need to hook into game events using ListenToGameEvent
    // The OnTakeDamage hook may need to be set up differently depending on L4D2's VScript API
    
    // Try to hook into game events
    if ("ListenToGameEvent" in this) {
        // Hook player_hurt event
        // Note: EntIndexToHScript may need to be GetPlayerFromUserID or similar depending on L4D2 version
        // If events don't work, check the L4D2 VScript API documentation
        ListenToGameEvent("player_hurt", function(event) {
            local victim = null;
            local attacker = null;
            
            // Try different methods to get entity from userid
            if ("EntIndexToHScript" in this) {
                victim = EntIndexToHScript(event.userid);
                attacker = EntIndexToHScript(event.attacker);
            } else if ("GetPlayerFromUserID" in this) {
                victim = GetPlayerFromUserID(event.userid);
                attacker = GetPlayerFromUserID(event.attacker);
            } else {
                // Fallback: try direct access
                victim = event.userid;
                attacker = event.attacker;
            }
            local damage = event.dmg_health;
            local damageType = event.type;
            
            if (victim && victim.IsValid() && victim.IsPlayer()) {
                local victimName = GetEntityName(victim);
                local attackerName = "unknown";
                local damageTypeName = GetDamageTypeName(damageType);
                local angle = 0;
                
                if (attacker && attacker.IsValid()) {
                    attackerName = GetEntityName(attacker);
                    angle = GetDamageAngle(victim, attacker);
                }
                
                WriteHapticEvent("PlayerHurt", {
                    damage = damage,
                    attacker = attackerName,
                    angle = angle,
                    damage_type = damageTypeName,
                    victim = victimName
                });
            }
        }, null);
        
        // Hook player_death event
        ListenToGameEvent("player_death", function(event) {
            local victim = null;
            local attacker = null;
            
            if ("EntIndexToHScript" in this) {
                victim = EntIndexToHScript(event.userid);
                attacker = EntIndexToHScript(event.attacker);
            } else if ("GetPlayerFromUserID" in this) {
                victim = GetPlayerFromUserID(event.userid);
                attacker = GetPlayerFromUserID(event.attacker);
            } else {
                victim = event.userid;
                attacker = event.attacker;
            }
            local weapon = event.weapon;
            
            if (victim && victim.IsValid() && victim.IsPlayer()) {
                local victimName = GetEntityName(victim);
                local attackerName = "unknown";
                
                if (attacker && attacker.IsValid()) {
                    attackerName = GetEntityName(attacker);
                }
                
                WriteHapticEvent("PlayerDeath", {
                    killer = attackerName,
                    weapon = weapon,
                    victim = victimName
                });
            }
        }, null);
        
        // Hook weapon_fire event
        ListenToGameEvent("weapon_fire", function(event) {
            local player = null;
            
            if ("EntIndexToHScript" in this) {
                player = EntIndexToHScript(event.userid);
            } else if ("GetPlayerFromUserID" in this) {
                player = GetPlayerFromUserID(event.userid);
            } else {
                player = event.userid;
            }
            local weapon = event.weapon;
            
            if (player && player.IsValid() && player.IsPlayer()) {
                local playerName = GetEntityName(player);
                WriteHapticEvent("WeaponFire", {
                    weapon = weapon,
                    player = playerName
                });
            }
        }, null);
        
        // Hook item_pickup event
        ListenToGameEvent("item_pickup", function(event) {
            local player = null;
            
            if ("EntIndexToHScript" in this) {
                player = EntIndexToHScript(event.userid);
            } else if ("GetPlayerFromUserID" in this) {
                player = GetPlayerFromUserID(event.userid);
            } else {
                player = event.userid;
            }
            local item = event.item;
            
            if (player && player.IsValid() && player.IsPlayer()) {
                local playerName = GetEntityName(player);
                
                // Check item type
                if (item.find("first_aid") != null || 
                    item.find("pain_pills") != null ||
                    item.find("adrenaline") != null) {
                    WriteHapticEvent("HealthPickup", {
                        item = item,
                        player = playerName
                    });
                } else if (item.find("ammo") != null) {
                    WriteHapticEvent("AmmoPickup", {
                        player = playerName
                    });
                }
            }
        }, null);
        
        // Hook infected_hit event (when player hits infected)
        ListenToGameEvent("infected_hit", function(event) {
            local attacker = null;
            local infected = null;
            
            if ("EntIndexToHScript" in this) {
                attacker = EntIndexToHScript(event.attacker);
                infected = EntIndexToHScript(event.entity);
            } else if ("GetPlayerFromUserID" in this) {
                attacker = GetPlayerFromUserID(event.attacker);
                infected = EntIndexToHScript(event.entity);  // Entity, not userid
            } else {
                attacker = event.attacker;
                infected = event.entity;
            }
            local damage = event.damage;
            
            if (attacker && attacker.IsValid() && attacker.IsPlayer()) {
                local attackerName = GetEntityName(attacker);
                local infectedName = "unknown";
                
                if (infected && infected.IsValid()) {
                    infectedName = GetEntityName(infected);
                }
                
                WriteHapticEvent("InfectedHit", {
                    infected = infectedName,
                    damage = damage,
                    attacker = attackerName
                });
            }
        }, null);
        
        print("[L4D2Haptics] Game event listeners registered successfully!");
    } else {
        print("[L4D2Haptics] WARNING: ListenToGameEvent not available in this L4D2 version.");
        print("[L4D2Haptics] The mod loaded but advanced event hooks are not working.");
        print("[L4D2Haptics] The integration will fall back to Phase 1 (basic console.log parsing).");
        print("[L4D2Haptics] This will still detect attack events and other basic game events.");
    }
}

// Auto-initialize when script loads
InitializeHapticsMod();

