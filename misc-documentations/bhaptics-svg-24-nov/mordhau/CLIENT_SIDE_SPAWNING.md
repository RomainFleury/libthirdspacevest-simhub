# Client-Side Actor Spawning for Mordhau Mods

## The Problem

`SpawnServerActorsOnMapLoad` in `Game.ini` only works on the **server**, not on clients joining multiplayer servers. This means your mod won't work when you join someone else's server.

## The Solution: Spawn from Player Controller or Game Instance

For client-side mods, you need to spawn the Actor from code that runs on **both** client and server. The best approach is to hook into the Player Controller or Game Instance.

## Method 1: Spawn from Component (If Component is Attached to Player)

If you can attach your Component to the Player Character or Player Controller:

1. **In `BP_TurdLogsComponent` Begin Play:**
   ```
   Event Begin Play
     → Delay (1.0 seconds) - Wait for world to be ready
     → Get World
     → Spawn Actor from Class
       Class: BP_TurdLogsActor
       Transform: (0, 0, 0) or use Get Actor Transform
     → Print String: "Spawned Actor from Component!"
       Print to Log: ✅ Checked
   ```

2. **Attach Component to Player Character:**
   - This requires modifying the Player Character Blueprint (if MSDK allows)
   - Or use a Player Controller hook

## Method 2: Use Player Controller Hook (Recommended if MSDK Allows)

If MSDK allows you to modify or extend the Player Controller:

1. **Create or modify Player Controller Blueprint**
2. **In Begin Play:**
   ```
   Event Begin Play
     → Delay (1.0 seconds)
     → Get World
     → Spawn Actor from Class
       Class: BP_TurdLogsActor
       Transform: (0, 0, 0)
   ```

## Method 3: Use Game Instance Hook (If MSDK Allows)

If MSDK allows you to modify the Game Instance:

1. **Create or modify Game Instance Blueprint**
2. **In Init:**
   ```
   Event Init
     → Delay (2.0 seconds) - Wait for world to load
     → Get World
     → Is Valid?
       → TRUE:
         → Spawn Actor from Class
           Class: BP_TurdLogsActor
           Transform: (0, 0, 0)
   ```

## Method 4: Make Actor Spawn Itself (Requires Initial Spawn)

If you can get the Actor to spawn at least once (e.g., via Game.ini when hosting), you can make it spawn additional copies on clients:

1. **In `BP_TurdLogsActor` Begin Play:**
   ```
   Event Begin Play
     → Get Net Mode
     → Switch on Net Mode
       → NM_Client:
         → Print String: "Running on client!"
           Print to Log: ✅ Checked
         → (Your component logic here)
       → NM_Standalone:
         → Print String: "Running standalone!"
           Print to Log: ✅ Checked
         → (Your component logic here)
       → NM_DedicatedServer:
         → Print String: "Running on server!"
           Print to Log: ✅ Checked
   ```

## Method 5: Use a Level Blueprint Hook (If Available)

If MSDK allows you to modify level Blueprints:

1. **Open the level Blueprint**
2. **In Event Begin Play:**
   ```
   Event Begin Play
     → Spawn Actor from Class
       Class: BP_TurdLogsActor
       Transform: (0, 0, 0)
   ```

## Testing

After implementing any of these methods:

1. **Package and install the mod**
2. **Join a multiplayer server** (not one you're hosting)
3. **Check the log** for your print statements
4. **Verify the Actor spawns** and the Component runs

## Current Status for TurdLogsMod

Since `SpawnServerActorsOnMapLoad` isn't working on clients, you need to implement one of the methods above. The easiest is **Method 1** if you can attach the Component to the Player Character, or **Method 2** if MSDK allows Player Controller modification.

## Next Steps

1. Check if MSDK allows Player Controller or Game Instance modification
2. If yes, use Method 2 or 3
3. If no, try Method 1 (attach Component to Player Character)
4. Test on a multiplayer server you don't own

