# bHaptics Tactsuit Integration for Half-Life Alyx

INFORMATION COMES FROM THIS SITE:
[NEXUS MOD HALF LIKE ALYX BHAPTICS]<https://www.nexusmods.com/halflifealyx/mods/6?tab=description>

High-fidelity haptic feedback covering the vest, arms, and face for Half-Life Alyx. The mod listens for in-game events and fires matching bHaptics effects so every firefight, explosion, or interaction has a tactile counterpart.

## Feature Highlights

### When the player is attacked

- Directional feedback so hits land on the correct side of your body.
- Fourteen unique reactions for unarmed enemy attacks to the head or vest.
- Barnacle grabs, enemy gunfire, and grenade blasts (per grenade type).
- Distinct death effects for blast, burn, shock, radiation, poison, and more.
- Additional explosion and environmental reactions.

### When the player is attacking

- Weapon fire and grenade-launch sensations on the arms (four weapon profiles).
- Vest fallbacks when no arm devices are detected (three variations).
- Shoulder kickback cues for different weapon classes.

### Special effects

- Low-health heartbeat pulses (two stages).
- Health pen and station interactions on vest/arms.
- Weapon reloads, ejects, and casing actions on the arms.
- Backpack clip/resin store and retrieve on both shoulders (four variants per side).
- Item holder interactions on the arms.
- Device key insertion shocks, gravity glove lock/pull/catch events, and coughing feedback.

## Workshop Support

Use the scripts from version 1.2.2 or later. If a workshop map lacks haptics:

- Enable the `bHaptics` addon in the in-game addons list.
- Ensure the **Scalable Init Support** workshop dependency is active.

These steps are required only for workshop maps, not the base campaign.

## Requirements

- Add `-condebug` to your Half-Life Alyx launch options so the mod can read `console.log`.
- bHaptics Tactsuit hardware: Tactot (vest), Tactosy (arms), and Tactal (face) where applicable.

## Installation

1. **Scripts** – Extract the Scripts archive into `Steam/steamapps/common/Half-Life Alyx/` so that `game/hlvr/scripts/vscripts` exists.
2. **Application** – Extract the Application archive anywhere, run `TactsuitAlyx.exe`, point it to your Half-Life Alyx install, then press **Start** with bHaptics Player running. Adjust options in the Settings panel.
3. **Verify logging** – After launching with `-condebug`, you should see `console.log` under `Half-Life Alyx/game/hlvr/`. If it is missing, verify the game files via Steam before retrying.

_Visual aid: see the original GUIDE IMAGE (placeholder)._

## Configuration

Use the application's Settings window to tune intensity and duration per effect. You can also trigger test pulses by clicking each effect label for quick calibration.

## Effect Configuration

- Effects use `.tact` files created with bHaptics Designer and shipped under the app's `bHaptics` folder.
- File names match their effect (for example, `Combine_1.tact` fires when a Combine shoots the player). Add more variants like `Combine_2.tact`; anything starting with `Combine_` is picked at random when the event triggers.
- Share your custom `.tact` files with the community so they can be added as optional downloads.

## Compatibility

- Supports the base game plus mods that reuse the same assets.
- The installer adds a line to `game/hlvr/cfg/skill_manifest.cfg`. If another mod edits that file, merge the changes manually and ensure the following block remains:

  ```
  exec skill.cfg
  exec skill_episodic.cfg
  exec skill_hlvr.cfg

  script_reload_code tactsuit.lua
  ```

- For workshop missions, enable both the `bHaptics` addon and Scalable Init Support before launching the map.

## Future Plans

- Add workshop tools/SDK support.
- Improve detection accuracy and expand the effect catalog. Suggestions are welcome.

## Where to Buy

- bHaptics hardware storefront: https://www.bhaptics.com/shop

## Other bHaptics Mods by the Author

- bHaptics Tactsuit – SkyrimVR Integration
- bHaptics Tactsuit – Fallout VR Integration
- bHaptics Tactsuit – Blade & Sorcery Integration
- bHaptics Tactsuit – Boneworks Integration
