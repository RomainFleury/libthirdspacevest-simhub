// ThirdSpaceWeaponHandler.c
// Hooks into weapon events and sends them to the Third Space Vest daemon

// Modded weapon component to intercept fire events
modded class SCR_WeaponComponent
{
    //------------------------------------------------------------------------------------------------
    // Override weapon fire event
    //------------------------------------------------------------------------------------------------
    override void OnWeaponFire()
    {
        super.OnWeaponFire();
        
        // Only process for local player
        if (!IsLocalPlayerWeapon())
            return;
        
        // Determine weapon type and send appropriate event
        string eventType = GetWeaponEventType();
        
        // Send weapon fire event (angle 0 = front, no damage)
        ThirdSpaceVest_SendEvent(eventType, 0, 0);
    }
    
    //------------------------------------------------------------------------------------------------
    // Get the event type based on weapon classification
    //------------------------------------------------------------------------------------------------
    private string GetWeaponEventType()
    {
        // Get weapon info
        BaseWeaponComponent weapon = BaseWeaponComponent.Cast(this);
        if (!weapon)
            return "weapon_fire_rifle"; // Default
        
        // Check weapon type by classification
        // NOTE: Actual implementation depends on Arma Reforger's weapon classification system
        
        // Get weapon entity and check for specific types
        IEntity weaponEntity = GetOwner();
        if (!weaponEntity)
            return "weapon_fire_rifle";
        
        string weaponName = weaponEntity.GetName().ToLower();
        
        // Check for machine guns
        if (weaponName.Contains("mg") || weaponName.Contains("m60") || 
            weaponName.Contains("m240") || weaponName.Contains("pkm"))
        {
            return "weapon_fire_mg";
        }
        
        // Check for pistols
        if (weaponName.Contains("pistol") || weaponName.Contains("m9") || 
            weaponName.Contains("glock") || weaponName.Contains("makarov"))
        {
            return "weapon_fire_pistol";
        }
        
        // Check for launchers
        if (weaponName.Contains("rpg") || weaponName.Contains("launcher") || 
            weaponName.Contains("carl") || weaponName.Contains("at4"))
        {
            return "weapon_fire_launcher";
        }
        
        // Default to rifle
        return "weapon_fire_rifle";
    }
    
    //------------------------------------------------------------------------------------------------
    // Check if this weapon belongs to the local player
    //------------------------------------------------------------------------------------------------
    private bool IsLocalPlayerWeapon()
    {
        IEntity owner = GetOwner();
        if (!owner)
            return false;
        
        // Walk up the hierarchy to find the character
        IEntity character = owner.GetParent();
        while (character)
        {
            // Check if this is the local player's character
            PlayerController playerController = GetGame().GetPlayerController();
            if (playerController)
            {
                IEntity controlledEntity = playerController.GetControlledEntity();
                if (controlledEntity == character)
                    return true;
            }
            character = character.GetParent();
        }
        
        return false;
    }
}

// Handle reload events
modded class SCR_WeaponComponent
{
    //------------------------------------------------------------------------------------------------
    // Override reload event
    //------------------------------------------------------------------------------------------------
    override void OnReloadComplete()
    {
        super.OnReloadComplete();
        
        if (!IsLocalPlayerWeapon())
            return;
        
        // Send reload event
        ThirdSpaceVest_SendEvent("weapon_reload", 0, 0);
    }
}

// Handle grenade throws
modded class SCR_GrenadeComponent
{
    //------------------------------------------------------------------------------------------------
    // Override throw event
    //------------------------------------------------------------------------------------------------
    override void OnThrow()
    {
        super.OnThrow();
        
        // Only process for local player
        if (!IsLocalPlayerGrenade())
            return;
        
        // Send grenade throw event
        ThirdSpaceVest_SendEvent("grenade_throw", 0, 0);
    }
    
    //------------------------------------------------------------------------------------------------
    private bool IsLocalPlayerGrenade()
    {
        IEntity owner = GetOwner();
        if (!owner)
            return false;
        
        IEntity thrower = owner.GetParent();
        if (!thrower)
            return false;
        
        PlayerController playerController = GetGame().GetPlayerController();
        if (!playerController)
            return false;
        
        return (playerController.GetControlledEntity() == thrower);
    }
}
