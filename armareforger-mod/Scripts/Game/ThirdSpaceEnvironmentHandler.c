// ThirdSpaceEnvironmentHandler.c
// Hooks into environmental events (explosions, nearby impacts) and sends them to the daemon

// Handler for nearby explosions
modded class SCR_ExplosionDamageManagerComponent
{
    //------------------------------------------------------------------------------------------------
    // Override explosion event
    //------------------------------------------------------------------------------------------------
    override void OnExplosion(vector explosionPos, float explosionRadius, float explosionDamage)
    {
        super.OnExplosion(explosionPos, explosionRadius, explosionDamage);
        
        // Get local player position
        PlayerController playerController = GetGame().GetPlayerController();
        if (!playerController)
            return;
        
        IEntity playerEntity = playerController.GetControlledEntity();
        if (!playerEntity)
            return;
        
        vector playerPos = playerEntity.GetOrigin();
        
        // Calculate distance to explosion
        float distance = vector.Distance(explosionPos, playerPos);
        
        // Only process if within reasonable range (e.g., 50 meters)
        if (distance > 50)
            return;
        
        // Calculate intensity based on distance
        float intensity = Math.Clamp(10 - (distance / 5), 1, 10);
        
        // Calculate direction to explosion
        float angle = CalculateAngleToPosition(playerEntity, explosionPos);
        
        // Send explosion event
        ThirdSpaceVest_SendEvent("explosion_nearby", angle, 0, intensity);
    }
    
    //------------------------------------------------------------------------------------------------
    private float CalculateAngleToPosition(IEntity player, vector targetPos)
    {
        vector playerPos = player.GetOrigin();
        vector playerForward = player.GetYawPitchRoll();
        
        vector toTarget = targetPos - playerPos;
        toTarget[1] = 0;
        toTarget.Normalize();
        
        float playerYaw = playerForward[0];
        vector playerDir = Vector(Math.Sin(playerYaw * Math.DEG2RAD), 0, Math.Cos(playerYaw * Math.DEG2RAD));
        
        float dot = vector.Dot(playerDir, toTarget);
        float cross = playerDir[0] * toTarget[2] - playerDir[2] * toTarget[0];
        
        float angle = Math.Atan2(cross, dot) * Math.RAD2DEG;
        
        if (angle < 0)
            angle += 360;
        
        return angle;
    }
}

// Handler for nearby bullet impacts (suppression)
modded class SCR_AISuppressionComponent
{
    private float m_fLastSuppressionFeedbackTime = 0;
    private const float SUPPRESSION_FEEDBACK_INTERVAL = 0.5;
    
    //------------------------------------------------------------------------------------------------
    // Override suppression update
    //------------------------------------------------------------------------------------------------
    override void OnSuppressionUpdate(float suppressionAmount, vector suppressionSource)
    {
        super.OnSuppressionUpdate(suppressionAmount, suppressionSource);
        
        // Only process for local player
        if (!IsLocalPlayer())
            return;
        
        // Skip if suppression is negligible
        if (suppressionAmount < 0.1)
            return;
        
        // Apply interval to prevent spam
        float currentTime = GetGame().GetTime();
        if (currentTime - m_fLastSuppressionFeedbackTime < SUPPRESSION_FEEDBACK_INTERVAL)
            return;
        
        m_fLastSuppressionFeedbackTime = currentTime;
        
        // Calculate direction to suppression source
        IEntity owner = GetOwner();
        if (!owner)
            return;
        
        float angle = CalculateAngleToSource(owner, suppressionSource);
        
        // Intensity based on suppression amount
        float intensity = Math.Clamp(suppressionAmount * 10, 1, 10);
        
        // Send suppression event
        ThirdSpaceVest_SendEvent("player_suppressed", angle, 0, intensity);
    }
    
    //------------------------------------------------------------------------------------------------
    private float CalculateAngleToSource(IEntity player, vector sourcePos)
    {
        vector playerPos = player.GetOrigin();
        vector playerForward = player.GetYawPitchRoll();
        
        vector toSource = sourcePos - playerPos;
        toSource[1] = 0;
        toSource.Normalize();
        
        float playerYaw = playerForward[0];
        vector playerDir = Vector(Math.Sin(playerYaw * Math.DEG2RAD), 0, Math.Cos(playerYaw * Math.DEG2RAD));
        
        float dot = vector.Dot(playerDir, toSource);
        float cross = playerDir[0] * toSource[2] - playerDir[2] * toSource[0];
        
        float angle = Math.Atan2(cross, dot) * Math.RAD2DEG;
        
        if (angle < 0)
            angle += 360;
        
        return angle;
    }
    
    //------------------------------------------------------------------------------------------------
    private bool IsLocalPlayer()
    {
        IEntity owner = GetOwner();
        if (!owner)
            return false;
        
        PlayerController playerController = GetGame().GetPlayerController();
        if (!playerController)
            return false;
        
        return (playerController.GetControlledEntity() == owner);
    }
}

// Handler for bullet impacts near player
modded class SCR_ProjectileComponent
{
    //------------------------------------------------------------------------------------------------
    // Override impact event
    //------------------------------------------------------------------------------------------------
    override void OnImpact(IEntity target, vector impactPos, vector impactNormal)
    {
        super.OnImpact(target, impactPos, impactNormal);
        
        // Get local player
        PlayerController playerController = GetGame().GetPlayerController();
        if (!playerController)
            return;
        
        IEntity playerEntity = playerController.GetControlledEntity();
        if (!playerEntity)
            return;
        
        // Don't trigger if the player is the target (handled by damage system)
        if (target == playerEntity)
            return;
        
        vector playerPos = playerEntity.GetOrigin();
        
        // Calculate distance to impact
        float distance = vector.Distance(impactPos, playerPos);
        
        // Only process if within close range (e.g., 5 meters)
        if (distance > 5)
            return;
        
        // Calculate intensity based on distance
        float intensity = Math.Clamp(5 - distance, 1, 5);
        
        // Calculate direction to impact
        float angle = CalculateAngleToImpact(playerEntity, impactPos);
        
        // Send bullet impact event
        ThirdSpaceVest_SendEvent("bullet_impact_near", angle, 0, intensity);
    }
    
    //------------------------------------------------------------------------------------------------
    private float CalculateAngleToImpact(IEntity player, vector impactPos)
    {
        vector playerPos = player.GetOrigin();
        vector playerForward = player.GetYawPitchRoll();
        
        vector toImpact = impactPos - playerPos;
        toImpact[1] = 0;
        toImpact.Normalize();
        
        float playerYaw = playerForward[0];
        vector playerDir = Vector(Math.Sin(playerYaw * Math.DEG2RAD), 0, Math.Cos(playerYaw * Math.DEG2RAD));
        
        float dot = vector.Dot(playerDir, toImpact);
        float cross = playerDir[0] * toImpact[2] - playerDir[2] * toImpact[0];
        
        float angle = Math.Atan2(cross, dot) * Math.RAD2DEG;
        
        if (angle < 0)
            angle += 360;
        
        return angle;
    }
}
