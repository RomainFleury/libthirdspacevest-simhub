// ThirdSpaceVehicleHandler.c
// Hooks into vehicle events and sends them to the Third Space Vest daemon

// Modded vehicle damage manager
modded class SCR_VehicleDamageManagerComponent
{
    //------------------------------------------------------------------------------------------------
    // Override vehicle damage event
    //------------------------------------------------------------------------------------------------
    override void OnDamage(
        BaseDamageContext damageContext,
        int damage,
        EDamageType type,
        vector hitPosition
    )
    {
        super.OnDamage(damageContext, damage, type, hitPosition);
        
        // Only process if local player is in this vehicle
        if (!IsLocalPlayerInVehicle())
            return;
        
        // Skip negligible damage
        if (damage <= 0)
            return;
        
        // Calculate hit direction
        float angle = CalculateHitAngle(hitPosition);
        
        // Send vehicle damage event
        ThirdSpaceVest_SendEvent("vehicle_damage", angle, damage);
        
        // Check for vehicle destruction
        if (GetHealthScaled() <= 0)
        {
            ThirdSpaceVest_SendEvent("vehicle_explosion", angle, 100);
        }
    }
    
    //------------------------------------------------------------------------------------------------
    // Calculate hit angle relative to vehicle
    //------------------------------------------------------------------------------------------------
    private float CalculateHitAngle(vector hitPosition)
    {
        IEntity owner = GetOwner();
        if (!owner)
            return 0;
        
        vector vehiclePos = owner.GetOrigin();
        vector vehicleForward = owner.GetYawPitchRoll();
        
        vector toHit = hitPosition - vehiclePos;
        toHit[1] = 0;
        toHit.Normalize();
        
        float vehicleYaw = vehicleForward[0];
        vector vehicleDir = Vector(Math.Sin(vehicleYaw * Math.DEG2RAD), 0, Math.Cos(vehicleYaw * Math.DEG2RAD));
        
        float dot = vector.Dot(vehicleDir, toHit);
        float cross = vehicleDir[0] * toHit[2] - vehicleDir[2] * toHit[0];
        
        float angle = Math.Atan2(cross, dot) * Math.RAD2DEG;
        
        if (angle < 0)
            angle += 360;
        
        return angle;
    }
    
    //------------------------------------------------------------------------------------------------
    // Check if local player is in this vehicle
    //------------------------------------------------------------------------------------------------
    private bool IsLocalPlayerInVehicle()
    {
        IEntity owner = GetOwner();
        if (!owner)
            return false;
        
        PlayerController playerController = GetGame().GetPlayerController();
        if (!playerController)
            return false;
        
        IEntity controlledEntity = playerController.GetControlledEntity();
        if (!controlledEntity)
            return false;
        
        // Check if player is in this vehicle
        CompartmentAccessComponent compartment = CompartmentAccessComponent.Cast(controlledEntity.FindComponent(CompartmentAccessComponent));
        if (!compartment)
            return false;
        
        IEntity vehicleEntity = compartment.GetVehicle();
        return (vehicleEntity == owner);
    }
}

// Handle vehicle collisions
modded class VehicleWheeledSimulation
{
    private float m_fLastCollisionTime = 0;
    private const float COLLISION_COOLDOWN = 0.5; // Minimum time between collision events
    
    //------------------------------------------------------------------------------------------------
    // Override collision event
    //------------------------------------------------------------------------------------------------
    override void OnContact(IEntity owner, IEntity other, Contact contact)
    {
        super.OnContact(owner, other, contact);
        
        // Only process if local player is in this vehicle
        if (!IsLocalPlayerInVehicle(owner))
            return;
        
        // Apply cooldown to prevent spam
        float currentTime = GetGame().GetTime();
        if (currentTime - m_fLastCollisionTime < COLLISION_COOLDOWN)
            return;
        
        m_fLastCollisionTime = currentTime;
        
        // Calculate collision intensity based on impact velocity
        float impactSpeed = contact.GetRelativeNormalVelocityAfter();
        float intensity = Math.Clamp(Math.Abs(impactSpeed) / 10.0, 1, 10);
        
        // Calculate impact direction
        vector impactDir = contact.GetNormal();
        float angle = CalculateImpactAngle(owner, impactDir);
        
        // Send collision event
        ThirdSpaceVest_SendEvent("vehicle_collision", angle, 0, intensity);
    }
    
    //------------------------------------------------------------------------------------------------
    private float CalculateImpactAngle(IEntity vehicle, vector impactDir)
    {
        vector vehicleForward = vehicle.GetYawPitchRoll();
        float vehicleYaw = vehicleForward[0];
        vector vehicleDir = Vector(Math.Sin(vehicleYaw * Math.DEG2RAD), 0, Math.Cos(vehicleYaw * Math.DEG2RAD));
        
        impactDir[1] = 0;
        impactDir.Normalize();
        
        float dot = vector.Dot(vehicleDir, impactDir);
        float cross = vehicleDir[0] * impactDir[2] - vehicleDir[2] * impactDir[0];
        
        float angle = Math.Atan2(cross, dot) * Math.RAD2DEG;
        
        if (angle < 0)
            angle += 360;
        
        return angle;
    }
    
    //------------------------------------------------------------------------------------------------
    private bool IsLocalPlayerInVehicle(IEntity vehicleEntity)
    {
        PlayerController playerController = GetGame().GetPlayerController();
        if (!playerController)
            return false;
        
        IEntity controlledEntity = playerController.GetControlledEntity();
        if (!controlledEntity)
            return false;
        
        CompartmentAccessComponent compartment = CompartmentAccessComponent.Cast(controlledEntity.FindComponent(CompartmentAccessComponent));
        if (!compartment)
            return false;
        
        return (compartment.GetVehicle() == vehicleEntity);
    }
}

// Handle helicopter rotor feedback
modded class SCR_HelicopterControllerComponent
{
    private float m_fLastRotorFeedbackTime = 0;
    private const float ROTOR_FEEDBACK_INTERVAL = 0.2; // Interval for rotor feedback
    
    //------------------------------------------------------------------------------------------------
    // Override update to add rotor feedback
    //------------------------------------------------------------------------------------------------
    override void OnUpdate(float timeSlice)
    {
        super.OnUpdate(timeSlice);
        
        // Only process if local player is piloting
        if (!IsLocalPlayerPilot())
            return;
        
        // Check if engine is running
        if (!IsEngineOn())
            return;
        
        // Apply interval to prevent spam
        float currentTime = GetGame().GetTime();
        if (currentTime - m_fLastRotorFeedbackTime < ROTOR_FEEDBACK_INTERVAL)
            return;
        
        m_fLastRotorFeedbackTime = currentTime;
        
        // Send rotor feedback - subtle vibration on back cells
        // Intensity based on rotor RPM (if available)
        float intensity = GetRotorIntensity();
        ThirdSpaceVest_SendEvent("helicopter_rotor", 180, 0, intensity); // 180 = back
    }
    
    //------------------------------------------------------------------------------------------------
    private float GetRotorIntensity()
    {
        // TODO: Get actual rotor RPM and scale intensity
        // For now, return a moderate value
        return 3;
    }
    
    //------------------------------------------------------------------------------------------------
    private bool IsLocalPlayerPilot()
    {
        IEntity owner = GetOwner();
        if (!owner)
            return false;
        
        PlayerController playerController = GetGame().GetPlayerController();
        if (!playerController)
            return false;
        
        IEntity controlledEntity = playerController.GetControlledEntity();
        if (!controlledEntity)
            return false;
        
        // Check if player is pilot
        CompartmentAccessComponent compartment = CompartmentAccessComponent.Cast(controlledEntity.FindComponent(CompartmentAccessComponent));
        if (!compartment)
            return false;
        
        // Check if in pilot seat of this helicopter
        BaseCompartmentSlot slot = compartment.GetCompartment();
        if (!slot)
            return false;
        
        return slot.GetType() == ECompartmentType.PILOT;
    }
}
