-- thirdspace_haptics.lua
-- Third Space Vest Integration for Kingdom Come: Deliverance
-- Logs game events for haptic feedback

ThirdSpace = {
    -- Configuration
    LOG_PREFIX = "[ThirdSpace]",
    POLL_INTERVAL = 0.1,  -- Poll every 100ms
    
    -- State tracking
    lastHealth = -1,
    lastStamina = -1,
    isInitialized = false,
    lastPollTime = 0,
    
    -- Player reference
    player = nil,
}

-- Log an event in our custom format
function ThirdSpace:LogEvent(eventType, params)
    local message = self.LOG_PREFIX .. " {" .. eventType
    if params then
        for key, value in pairs(params) do
            message = message .. "|" .. key .. "=" .. tostring(value)
        end
    end
    message = message .. "}"
    System.LogAlways(message)
end

-- Initialize the integration
function ThirdSpace:Init()
    if self.isInitialized then
        return
    end
    
    self:LogEvent("Init", {version = "1.0.0"})
    self.isInitialized = true
    
    -- Try to get player reference
    self.player = System.GetEntityByName("dude")
    if self.player then
        self.lastHealth = self:GetPlayerHealth()
        self:LogEvent("PlayerFound", {health = self.lastHealth})
    else
        self:LogEvent("Warning", {msg = "Player not found"})
    end
end

-- Get current player health (implement based on KCD version)
function ThirdSpace:GetPlayerHealth()
    if not self.player then
        return -1
    end
    
    -- Try different methods to get health
    if self.player.GetHealth then
        return self.player:GetHealth()
    elseif self.player.actor and self.player.actor.health then
        return self.player.actor.health
    elseif self.player.health then
        return self.player.health
    end
    
    return -1
end

-- Main update function - called every frame
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
        self.player = System.GetEntityByName("dude")
        if self.player then
            self.lastHealth = self:GetPlayerHealth()
            self:LogEvent("PlayerFound", {health = self.lastHealth})
        end
        return
    end
    
    -- Poll health changes
    self:CheckHealth()
end

-- Check for health changes
function ThirdSpace:CheckHealth()
    local currentHealth = self:GetPlayerHealth()
    
    if currentHealth < 0 then
        return  -- Couldn't get health
    end
    
    if self.lastHealth < 0 then
        self.lastHealth = currentHealth
        return
    end
    
    local healthDiff = currentHealth - self.lastHealth
    
    if healthDiff < 0 then
        -- Player took damage
        self:LogEvent("PlayerDamage", {
            damage = math.abs(healthDiff),
            health = currentHealth,
            previous = self.lastHealth
        })
        
        -- Check for death
        if currentHealth <= 0 then
            self:LogEvent("PlayerDeath", {
                lastHealth = self.lastHealth
            })
        -- Check for critical health
        elseif currentHealth < 20 then
            self:LogEvent("CriticalHealth", {
                health = currentHealth
            })
        end
        
    elseif healthDiff > 0 then
        -- Player healed
        self:LogEvent("PlayerHeal", {
            amount = healthDiff,
            health = currentHealth
        })
    end
    
    self.lastHealth = currentHealth
end

-- Register the update callback
-- This approach may vary between KCD versions
if Script and Script.SetTimer then
    Script.SetTimer(100, function()
        ThirdSpace:OnUpdate(0.1)
    end)
elseif Game and Game.RegisterUpdateCallback then
    Game.RegisterUpdateCallback(function(dt)
        ThirdSpace:OnUpdate(dt)
    end)
else
    -- Fallback: register as a console command for manual testing
    System.AddCCommand("ts_update", "ThirdSpace:OnUpdate(0.1)", "Manual ThirdSpace update")
    System.AddCCommand("ts_init", "ThirdSpace:Init()", "Initialize ThirdSpace")
    System.AddCCommand("ts_status", "ThirdSpace:LogEvent('Status', {health=ThirdSpace:GetPlayerHealth()})", "Log current status")
end

-- Auto-initialize when script loads
ThirdSpace:Init()

System.LogAlways("[ThirdSpace] Script loaded. Use console commands ts_init, ts_update, ts_status for testing.")
