// ThirdSpacePlayerDamageHandler.c
// Hooks into player damage events and sends them to the Third Space Vest daemon

// Modded damage manager to intercept damage events
modded class SCR_CharacterDamageManagerComponent
{
    //------------------------------------------------------------------------------------------------
    // Override OnDamage to capture damage events
    //------------------------------------------------------------------------------------------------
    override void OnDamage(
        BaseDamageContext damageContext,
        int damage,
        EDamageType type,
        vector hitPosition
    )
    {
        // Call parent implementation first
        super.OnDamage(damageContext, damage, type, hitPosition);
        
        // Only process for local player
        if (!IsLocalPlayer())
            return;
        
        // Skip if damage is negligible
        if (damage <= 0)
            return;
        
        // Calculate damage direction relative to player
        float angle = CalculateDamageAngle(hitPosition);
        
        // Send damage event to vest daemon
        ThirdSpaceVest_SendEvent("player_damage", angle, damage);
        
        // Check for death
        if (GetHealthScaled() <= 0)
        {
            ThirdSpaceVest_SendEvent("player_death", angle, damage);
        }
    }
    
    //------------------------------------------------------------------------------------------------
    // Calculate the angle of incoming damage relative to player facing direction
    // Returns: angle in degrees (0 = front, 90 = left, 180 = back, 270 = right)
    //------------------------------------------------------------------------------------------------
    private float CalculateDamageAngle(vector hitPosition)
    {
        // Get owner entity (the character)
        IEntity owner = GetOwner();
        if (!owner)
            return 0;
        
        // Get player position and facing direction
        vector playerPos = owner.GetOrigin();
        vector playerForward = owner.GetYawPitchRoll();
        
        // Calculate direction to hit position
        vector toHit = hitPosition - playerPos;
        toHit[1] = 0; // Ignore vertical component
        toHit.Normalize();
        
        // Get player's forward direction (ignoring pitch and roll)
        float playerYaw = playerForward[0];
        vector playerDir = Vector(Math.Sin(playerYaw * Math.DEG2RAD), 0, Math.Cos(playerYaw * Math.DEG2RAD));
        
        // Calculate angle between player forward and hit direction
        float dot = vector.Dot(playerDir, toHit);
        float cross = playerDir[0] * toHit[2] - playerDir[2] * toHit[0];
        
        float angle = Math.Atan2(cross, dot) * Math.RAD2DEG;
        
        // Normalize to 0-360 range
        if (angle < 0)
            angle += 360;
        
        return angle;
    }
    
    //------------------------------------------------------------------------------------------------
    // Check if this is the local player's character
    //------------------------------------------------------------------------------------------------
    private bool IsLocalPlayer()
    {
        IEntity owner = GetOwner();
        if (!owner)
            return false;
        
        // Get the player controller
        PlayerController playerController = GetGame().GetPlayerController();
        if (!playerController)
            return false;
        
        // Check if this entity belongs to the local player
        IEntity controlledEntity = playerController.GetControlledEntity();
        return (controlledEntity == owner);
    }
}

// Handle player healing events
modded class SCR_CharacterDamageManagerComponent
{
    //------------------------------------------------------------------------------------------------
    // Override healing to capture heal events
    //------------------------------------------------------------------------------------------------
    override void OnHeal(float healAmount)
    {
        super.OnHeal(healAmount);
        
        // Only process for local player
        if (!IsLocalPlayer())
            return;
        
        // Send heal event (no direction, just intensity based on heal amount)
        float intensity = Math.Clamp(healAmount / 10.0, 1, 10);
        ThirdSpaceVest_SendEvent("player_heal", 0, 0, intensity);
    }
}
