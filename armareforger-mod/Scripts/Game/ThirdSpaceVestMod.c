// ThirdSpaceVestMod.c
// Main entry point for Third Space Vest haptic feedback integration
// This mod sends game events to the Third Space Vest daemon via TCP

class ThirdSpaceVestModClass: GenericEntity
{
    // Configuration
    static const string DAEMON_HOST = "127.0.0.1";
    static const int DAEMON_PORT = 5050;
    
    // Singleton instance
    private static ThirdSpaceVestModClass s_Instance;
    
    //------------------------------------------------------------------------------------------------
    static ThirdSpaceVestModClass GetInstance()
    {
        return s_Instance;
    }
    
    //------------------------------------------------------------------------------------------------
    void ThirdSpaceVestModClass(IEntitySource src, IEntity parent)
    {
        s_Instance = this;
        Print("[ThirdSpaceVest] Mod initialized");
    }
    
    //------------------------------------------------------------------------------------------------
    void ~ThirdSpaceVestModClass()
    {
        s_Instance = null;
        Print("[ThirdSpaceVest] Mod shutdown");
    }
}

// Global helper function to send events
void ThirdSpaceVest_SendEvent(string eventType, float angle = 0, int damage = 0, float intensity = 0)
{
    ThirdSpaceTcpClient.SendEvent(eventType, angle, damage, intensity);
}
