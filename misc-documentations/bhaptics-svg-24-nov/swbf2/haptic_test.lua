-- Third Space Vest Haptic Integration Test Script
-- For Star Wars Battlefront 2 (2005)
-- 
-- This is a TEST script to verify:
-- 1. Event registration works
-- 2. File I/O works (or console output)
-- 3. Events are triggered correctly
--
-- Place this in: GameData\Addon\YourMod\Scripts\haptic_test.lua
-- Or: GameData\Common\Scripts\haptic_test.lua
-- (Exact location needs to be determined)

-- Configuration
local LOG_FILE = "haptic_events.log"
local USE_FILE_IO = true  -- Set to false to use console output instead

-- Initialize
function ScriptInit()
    print("=== Third Space Vest Haptic Test Script Loaded ===")
    
    -- Try to determine log file path
    -- This may need adjustment based on SWBF2's file system
    local log_path = LOG_FILE
    
    -- Test file I/O
    if USE_FILE_IO then
        local test_file = io.open(log_path, "w")
        if test_file then
            test_file:write("-- Haptic Events Log Started\n")
            test_file:close()
            print("File I/O: SUCCESS - Writing to " .. log_path)
        else
            print("File I/O: FAILED - Will use console output instead")
            USE_FILE_IO = false
        end
    end
end

-- Helper function to write events
function WriteEvent(event_type, params)
    local timestamp = os.time() or "unknown"
    local event_line = string.format("%s|%s|%s\n", timestamp, event_type, params or "")
    
    if USE_FILE_IO then
        local file = io.open(LOG_FILE, "a")
        if file then
            file:write(event_line)
            file:close()
        else
            -- Fallback to console
            print("[HapticEvent] " .. event_line)
        end
    else
        -- Use console output (can be captured with -log flag)
        print("[HapticEvent] " .. event_line)
    end
end

-- Register Character Death Event
OnCharacterDeath(function(player, killer)
    local player_name = GetEntityName(player) or "unknown"
    local killer_name = GetEntityName(killer) or "unknown"
    
    WriteEvent("DEATH", player_name .. "|" .. killer_name)
    print("Haptic Event: DEATH - " .. player_name .. " killed by " .. killer_name)
end)

-- Register Character Spawn Event
OnCharacterSpawn(function(player)
    local player_name = GetEntityName(player) or "unknown"
    
    WriteEvent("SPAWN", player_name)
    print("Haptic Event: SPAWN - " .. player_name)
end)

-- Register Health Change Event (for damage)
OnHealthChange(function(object, health)
    -- Check if it's a character
    if IsCharacter(object) then
        local player = GetCharacterPlayer(object)
        if player then
            local player_name = GetEntityName(object) or "unknown"
            WriteEvent("DAMAGE", player_name .. "|" .. tostring(health))
            print("Haptic Event: DAMAGE - " .. player_name .. " health: " .. tostring(health))
        end
    end
end)

-- Register Shield Change Event
OnShieldChange(function(object, shield)
    if IsCharacter(object) then
        local player = GetCharacterPlayer(object)
        if player then
            local player_name = GetEntityName(object) or "unknown"
            WriteEvent("SHIELD", player_name .. "|" .. tostring(shield))
            print("Haptic Event: SHIELD - " .. player_name .. " shield: " .. tostring(shield))
        end
    end
end)

-- Register Vehicle Entry Event
OnCharacterEnterVehicle(function(player, vehicle)
    local player_name = GetEntityName(player) or "unknown"
    local vehicle_name = GetEntityName(vehicle) or "unknown"
    
    WriteEvent("VEHICLE_ENTER", player_name .. "|" .. vehicle_name)
    print("Haptic Event: VEHICLE_ENTER - " .. player_name .. " entered " .. vehicle_name)
end)

print("Haptic event callbacks registered successfully!")

