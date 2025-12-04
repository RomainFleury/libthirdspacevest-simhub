--[[
    Third Space Vest Integration for Kingdom Come: Deliverance 2
    
    This script logs game events for haptic feedback.
    Events are written to the game log in format:
    [ThirdSpace] {EventType|param1=value1|param2=value2}
    
    The Python integration reads these events and triggers vest haptics.
]]

-- =============================================================================
-- Configuration
-- =============================================================================

ThirdSpace = {
    -- Mod version
    VERSION = "1.0.0",
    
    -- Log prefix (must match Python parser)
    LOG_PREFIX = "[ThirdSpace]",
    
    -- Polling interval in seconds (0.1 = 100ms)
    POLL_INTERVAL = 0.1,
    
    -- State tracking
    isInitialized = false,
    lastPollTime = 0,
    lastHealth = -1,
    lastStamina = -1,
    lastInCombat = false,
    
    -- Player reference (cached)
    player = nil,
}

-- =============================================================================
-- Logging Functions
-- =============================================================================

--- Log an event in our custom format
-- @param eventType string The type of event
-- @param params table Optional key-value parameters
function ThirdSpace:LogEvent(eventType, params)
    local message = self.LOG_PREFIX .. " {" .. eventType
    
    if params then
        for key, value in pairs(params) do
            message = message .. "|" .. tostring(key) .. "=" .. tostring(value)
        end
    end
    
    message = message .. "}"
    System.LogAlways(message)
end

--- Log a debug message (only in dev mode)
function ThirdSpace:LogDebug(message)
    if System.IsDevMode and System.IsDevMode() then
        System.LogAlways(self.LOG_PREFIX .. " [DEBUG] " .. message)
    end
end

-- =============================================================================
-- Player State Access (KCD2-Specific)
-- =============================================================================

--- Get the player entity
-- @return entity|nil The player entity or nil
function ThirdSpace:GetPlayer()
    if self.player and self.player.id then
        return self.player
    end
    
    -- In KCD2, the player is typically called "dude" or accessed via System
    self.player = System.GetEntityByName("dude")
    
    if not self.player then
        -- Fallback: try to get from player manager
        if Player and Player.GetPlayer then
            self.player = Player.GetPlayer()
        end
    end
    
    return self.player
end

--- Get current player health
-- @return number Current health (0-100) or -1 if unavailable
function ThirdSpace:GetPlayerHealth()
    local player = self:GetPlayer()
    if not player then return -1 end
    
    -- Try different methods to get health
    if player.GetHealth then
        return player:GetHealth()
    elseif player.actor and player.actor.GetHealth then
        return player.actor:GetHealth()
    elseif player.soul and player.soul.GetHealth then
        return player.soul:GetHealth()
    elseif player.health then
        return player.health
    end
    
    return -1
end

--- Get current player stamina
-- @return number Current stamina (0-100) or -1 if unavailable
function ThirdSpace:GetPlayerStamina()
    local player = self:GetPlayer()
    if not player then return -1 end
    
    if player.GetStamina then
        return player:GetStamina()
    elseif player.actor and player.actor.GetStamina then
        return player.actor:GetStamina()
    elseif player.stamina then
        return player.stamina
    end
    
    return -1
end

--- Check if player is in combat
-- @return boolean True if in combat
function ThirdSpace:IsPlayerInCombat()
    local player = self:GetPlayer()
    if not player then return false end
    
    if player.IsInCombat then
        return player:IsInCombat()
    elseif player.actor and player.actor.IsInCombat then
        return player.actor:IsInCombat()
    end
    
    return false
end

--- Get the direction of damage relative to player facing
-- @param hitInfo table The hit information from OnHit
-- @return string Direction as "front", "back", "left", or "right"
function ThirdSpace:GetDamageDirection(hitInfo)
    local player = self:GetPlayer()
    if not player or not hitInfo or not hitInfo.pos then
        return "front"  -- Default to front
    end
    
    -- Get player position and forward direction
    local playerPos = player:GetWorldPos()
    local playerDir = player:GetDirectionVector(0)  -- Forward vector
    
    if not playerPos or not playerDir then
        return "front"
    end
    
    -- Calculate direction to damage source
    local toSource = {
        x = hitInfo.pos.x - playerPos.x,
        y = hitInfo.pos.y - playerPos.y,
        z = 0  -- Ignore vertical for direction
    }
    
    -- Normalize
    local len = math.sqrt(toSource.x * toSource.x + toSource.y * toSource.y)
    if len > 0.001 then
        toSource.x = toSource.x / len
        toSource.y = toSource.y / len
    end
    
    -- Dot product with forward (0 = perpendicular, 1 = front, -1 = back)
    local dot = playerDir.x * toSource.x + playerDir.y * toSource.y
    
    -- Cross product z-component (determines left/right)
    local cross = playerDir.x * toSource.y - playerDir.y * toSource.x
    
    if dot > 0.5 then
        return "front"
    elseif dot < -0.5 then
        return "back"
    elseif cross > 0 then
        return "left"
    else
        return "right"
    end
end

-- =============================================================================
-- Event Handlers
-- =============================================================================

--- Initialize the integration
function ThirdSpace:Init()
    if self.isInitialized then
        return
    end
    
    self:LogEvent("Init", {
        version = self.VERSION,
        game = "KCD2"
    })
    
    -- Try to get player reference
    local player = self:GetPlayer()
    if player then
        self.lastHealth = self:GetPlayerHealth()
        self:LogEvent("PlayerFound", {
            health = self.lastHealth
        })
    else
        self:LogEvent("Warning", {
            msg = "Player not found yet"
        })
    end
    
    self.isInitialized = true
    
    -- Register for game events (if available in KCD2)
    self:RegisterEventListeners()
end

--- Register for game events
function ThirdSpace:RegisterEventListeners()
    -- Note: The exact event registration may vary in KCD2
    -- This is based on CryEngine patterns
    
    if UIAction and UIAction.RegisterActionListener then
        UIAction.RegisterActionListener(self, "", "", "OnUIAction")
    end
    
    -- Try to hook into player damage events
    local player = self:GetPlayer()
    if player then
        -- Store original OnHit if it exists
        if player.OnHit then
            player._OriginalOnHit = player.OnHit
            player.OnHit = function(entity, hitInfo)
                ThirdSpace:OnPlayerHit(hitInfo)
                if entity._OriginalOnHit then
                    entity._OriginalOnHit(entity, hitInfo)
                end
            end
        end
    end
end

--- Called when player is hit
function ThirdSpace:OnPlayerHit(hitInfo)
    local damage = hitInfo.damage or 0
    local direction = self:GetDamageDirection(hitInfo)
    local currentHealth = self:GetPlayerHealth()
    
    -- Determine body part from hit zone (if available)
    local bodyPart = "torso"  -- Default
    if hitInfo.partId then
        -- KCD2 might use specific part IDs for body parts
        -- This mapping may need adjustment based on actual game values
        local partMapping = {
            [0] = "head",
            [1] = "torso",
            [2] = "left_arm",
            [3] = "right_arm",
            [4] = "left_leg",
            [5] = "right_leg",
        }
        bodyPart = partMapping[hitInfo.partId] or "torso"
    end
    
    self:LogEvent("PlayerDamage", {
        damage = math.floor(damage),
        health = math.floor(currentHealth),
        direction = direction,
        bodyPart = bodyPart,
        weaponType = hitInfo.weapon or "unknown"
    })
    
    -- Check for death
    if currentHealth <= 0 then
        self:LogEvent("PlayerDeath", {
            lastHealth = math.floor(self.lastHealth),
            cause = hitInfo.type or "combat"
        })
    elseif currentHealth < 20 then
        self:LogEvent("CriticalHealth", {
            health = math.floor(currentHealth)
        })
    end
    
    self.lastHealth = currentHealth
end

--- Called every game frame
function ThirdSpace:OnUpdate(frameTime)
    -- Initialize if not done
    if not self.isInitialized then
        self:Init()
        return
    end
    
    -- Throttle polling
    self.lastPollTime = self.lastPollTime + frameTime
    if self.lastPollTime < self.POLL_INTERVAL then
        return
    end
    self.lastPollTime = 0
    
    -- Check for player if we don't have reference
    if not self.player then
        self.player = self:GetPlayer()
        if self.player then
            self.lastHealth = self:GetPlayerHealth()
            self:LogEvent("PlayerFound", {
                health = self.lastHealth
            })
        end
        return
    end
    
    -- Poll for state changes
    self:CheckHealthChanges()
    self:CheckCombatState()
    self:CheckStaminaChanges()
end

--- Check for health changes (polling fallback)
function ThirdSpace:CheckHealthChanges()
    local currentHealth = self:GetPlayerHealth()
    
    if currentHealth < 0 or self.lastHealth < 0 then
        self.lastHealth = currentHealth
        return
    end
    
    local healthDiff = currentHealth - self.lastHealth
    
    if healthDiff < -1 then  -- Significant damage (threshold to avoid noise)
        -- Damage detected via polling (event handler may have missed it)
        self:LogEvent("PlayerDamage", {
            damage = math.abs(math.floor(healthDiff)),
            health = math.floor(currentHealth),
            previous = math.floor(self.lastHealth),
            direction = "front",  -- Unknown direction for polled damage
            source = "polling"
        })
        
        if currentHealth <= 0 then
            self:LogEvent("PlayerDeath", {
                lastHealth = math.floor(self.lastHealth)
            })
        elseif currentHealth < 20 then
            self:LogEvent("CriticalHealth", {
                health = math.floor(currentHealth)
            })
        end
        
    elseif healthDiff > 1 then  -- Healing
        self:LogEvent("PlayerHeal", {
            amount = math.floor(healthDiff),
            health = math.floor(currentHealth)
        })
    end
    
    self.lastHealth = currentHealth
end

--- Check for combat state changes
function ThirdSpace:CheckCombatState()
    local inCombat = self:IsPlayerInCombat()
    
    if inCombat and not self.lastInCombat then
        self:LogEvent("CombatStart", {})
    elseif not inCombat and self.lastInCombat then
        self:LogEvent("CombatEnd", {})
    end
    
    self.lastInCombat = inCombat
end

--- Check for stamina changes (for heavy exertion feedback)
function ThirdSpace:CheckStaminaChanges()
    local currentStamina = self:GetPlayerStamina()
    
    if currentStamina < 0 then return end
    
    if currentStamina < 15 and self.lastStamina >= 15 then
        self:LogEvent("LowStamina", {
            stamina = math.floor(currentStamina)
        })
    end
    
    self.lastStamina = currentStamina
end

-- =============================================================================
-- Combat Event Hooks (extend as needed for KCD2)
-- =============================================================================

--- Called when player attacks
function ThirdSpace:OnPlayerAttack(attackInfo)
    local weaponType = "melee"
    if attackInfo and attackInfo.weapon then
        weaponType = attackInfo.weapon
    end
    
    self:LogEvent("PlayerAttack", {
        weapon = weaponType,
        type = attackInfo and attackInfo.attackType or "swing"
    })
end

--- Called when player blocks
function ThirdSpace:OnPlayerBlock(blockInfo)
    local success = blockInfo and blockInfo.success or false
    
    self:LogEvent("PlayerBlock", {
        success = success and "true" or "false",
        direction = blockInfo and blockInfo.direction or "front",
        perfect = blockInfo and blockInfo.perfectBlock and "true" or "false"
    })
end

--- Called when player's attack hits an enemy
function ThirdSpace:OnPlayerHitEnemy(hitInfo)
    self:LogEvent("PlayerHitEnemy", {
        damage = hitInfo and math.floor(hitInfo.damage or 0) or 0,
        enemyType = hitInfo and hitInfo.targetType or "human",
        weapon = hitInfo and hitInfo.weapon or "melee"
    })
end

--- Called when player falls
function ThirdSpace:OnPlayerFall(fallInfo)
    local damage = fallInfo and fallInfo.damage or 0
    
    self:LogEvent("PlayerFall", {
        damage = math.floor(damage),
        height = fallInfo and math.floor(fallInfo.height or 0) or 0
    })
end

-- =============================================================================
-- Update Loop Registration
-- =============================================================================

-- Register the update function
-- The exact method depends on KCD2's scripting API

if Script and Script.SetTimer then
    -- Use repeating timer
    Script.SetTimer(100, function()
        ThirdSpace:OnUpdate(0.1)
        Script.SetTimer(100, function()
            ThirdSpace:OnUpdate(0.1)
        end)
    end)
elseif Game and Game.RegisterUpdateCallback then
    -- Use game update callback
    Game.RegisterUpdateCallback(function(dt)
        ThirdSpace:OnUpdate(dt)
    end)
else
    -- Fallback: Register console commands for manual testing
    System.AddCCommand("ts_init", "ThirdSpace:Init()", "Initialize ThirdSpace integration")
    System.AddCCommand("ts_status", "ThirdSpace:LogEvent('Status', {health=ThirdSpace:GetPlayerHealth(), stamina=ThirdSpace:GetPlayerStamina()})", "Log current status")
    System.AddCCommand("ts_test_damage", "ThirdSpace:LogEvent('PlayerDamage', {damage=25, health=75, direction='front', bodyPart='torso'})", "Test damage event")
    System.AddCCommand("ts_test_death", "ThirdSpace:LogEvent('PlayerDeath', {lastHealth=10, cause='combat'})", "Test death event")
    System.AddCCommand("ts_test_heal", "ThirdSpace:LogEvent('PlayerHeal', {amount=20, health=80})", "Test heal event")
    
    System.LogAlways("[ThirdSpace] Console commands registered: ts_init, ts_status, ts_test_damage, ts_test_death, ts_test_heal")
end

-- Auto-initialize when script loads
ThirdSpace:Init()

System.LogAlways("[ThirdSpace] KCD2 Integration v" .. ThirdSpace.VERSION .. " loaded")
