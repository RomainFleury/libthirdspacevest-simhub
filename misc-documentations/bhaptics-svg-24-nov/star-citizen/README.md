# Star Citizen Integration Research

## Game.log File

Star Citizen logs events primarily in the **Game.log** file located in the game's installation directory. This is the primary source of game events for haptic integration.

**Key Facts:**
- Location: `{StarCitizenInstallDir}/Game.log`
- New `Game.log` created on each game launch
- Old logs moved to `logbackups/` folder
- Log files can grow very large (need efficient tailing)
- Contains death/kill events with **directional damage information**

## Integration Approach: Log File Watching ⭐⭐⭐

**This is the recommended approach** - similar to HL:Alyx integration.

**How it works:**
1. Watch `Game.log` for new events
2. Parse death/kill events using regex (proven by VerseWatcher)
3. Extract direction vectors for directional haptics
4. Map events to vest cells
5. Send to daemon

**Advantages:**
- ✅ No mod required
- ✅ Real-time event detection
- ✅ Directional damage data available
- ✅ Proven by existing tools (VerseWatcher, citizenmon) 

## Star parse

## Killfeed monitor

 I have copied the content of the repo here: `./citizenmon`
CREATIVE
https://github.com/danieldeschain/citizenmon

Have you ever asked yourself what killed you or what happened to you?
Don't fret, since Star Citizen sadly doesn't really tell you yet, I created a small tool that reads the game.log file and extracts the kill events. It's nothing fancy but maybe some players enjoy it. You can check the code, it's open source and compile it yourself or just download the exe. It shouldn't need any privileges and definitely no internet connection (well, you'll need one to play Star Citizen though).

It has a small leaderboard and you can check your historic logs too from the first time the tool was used. Also you can click player names and it opens their spectrum page. If you encounter any bugs, let me know on github. This tool is a substitute until CIG adds something in game.

If this breaks any rules at CIG or whatever, let me know and I'll take it down. Anticheat should have no problem with it because it's basically a fancy notepad just reading a game.log file.

Posted it here, because nobody on Spectrum had positive feedback. If not, at least I got some more practice in writing code.

## [ Verse Watcher ]
- Star Citizen Event Tool -
http://www.versewatcher.com/
https://github.com/PINKgeekPDX/VerseWatcher

I downloaded and unpacked the full repo here: `./VerseWatcher-main`

A real-time game.log monitoring tool I've made for Star Citizen.

This is a very early WIP of this tool. This is basically using tech I've been developing for a bigger project still in development and I've decided to make a simpler tool that does some of the useful stuff of the bigger project, so this is what it has become.

I do plan to add more features to this tool in the future over time and keep it up to date with the latest changes in the game.



## Tobii opacked mod to integrate eye tracking (maybe not relevant)

https://developer.tobii.com/pc-gaming/develop/tobii-game-integration/

## Star Citizen LUA scripts

https://github.com/starcitizen-lug/lug-helper

The Linux User Group has used some Lua Scripts, maybe there is some things in there we can learn from integrating  in game things.

## Lua scripts for keyboards

https://www.reddit.com/r/starcitizen/comments/161nmo0/logitech_g600_ghub_lua_script/

I thought I'd share my Lua script file for the Logitech G600 mouse. Ghub has proven to be pretty unintuitive for me and most of what I'd like to accomplish didn't seem possible until I started looking into the Lua scripting function. While my assignments may not be to your particular tastes, I thought it may serve as a helpful example for someone else to create their own.
It includes a toggle to hold down the buttons for freelook, global chat, and local chat. I also included toggles for enabling/disabling and resetting head tracking and decoupled mode (which also pulls out a med pen outside of flight). Finally, I added a button for cycling through the various cameras and resetting the 3rd person camera to default (Please note that the reset camera script changes the camera to first person as well).

function OnEvent(event, arg)
    --OutputLogMessage("Event: "..event.." Arg: "..arg.."\n")
    --FREELOOK
    if event == "MOUSE_BUTTON_PRESSED" and arg == 12 then
        Toggle = not Toggle
        if Toggle then
            PressKey("z")
        else
            ReleaseKey("z")
        end
    end
    --GLOBAL CHAT
    if event == "MOUSE_BUTTON_PRESSED" and arg == 16 then
        Toggle = not Toggle
        if Toggle then
            PressKey("numplus")
        else
            ReleaseKey("numplus")
        end
    end
    --TEAM CHAT
    if event == "MOUSE_BUTTON_PRESSED" and arg == 17 then
        Toggle = not Toggle
        if Toggle then
            PressKey("lalt","numplus")
        else
            ReleaseKey("lalt","numplus")
        end
    end
    --RECENTER HEAD TRACKING
    if event == "MOUSE_BUTTON_PRESSED" and arg == 10 then
        PressAndReleaseKey("ralt","numslash")
    end
    --ENABLE-DISABLE HEAD TRACKING
    if event == "MOUSE_BUTTON_PRESSED" and arg == 11 then
        PressAndReleaseKey("numslash")
    end
    --CYCLE CAMERA
    if event == "MOUSE_BUTTON_PRESSED" and arg == 13 then
        PressAndReleaseKey("f4")
    end
    --RESET CAMERA
    if event == "MOUSE_BUTTON_PRESSED" and arg == 14 then
        PressKey("f4")
        PressAndReleaseKey("numperiod")
        ReleaseKey("f4")
    end
    --DECOUPLED MODE - MEDPEN
    if event == "MOUSE_BUTTON_PRESSED" and arg == 15 then
        PressAndReleaseKey("lalt","c")
    end
end

## Another LUA script

https://www.reddit.com/r/starcitizen/comments/306aq1/i_made_a_g13_script_for_confirmed_ejection/

https://gist.github.com/Jaroneko/dbb7363f131d56f46637

I made a G13 script for confirmed ejection
I reconfigured my Obutto a bit last weekend and this gave me the possibility of using my Logitech G13 for extra controls while flying (with my X-55). This of course meant I needed to finally create a G13 profile for Star Citizen.

I dedicated one page to infantry (FPS) and one for HUD, shield ans power controls for flying and have one left over for now. Having additional flight controls on the G13 made me want to move the eject button over from the stick, so I can have a confirmation function.

I ended up writing a LUA script that requires you to hold down the G20 key, while pressing the G7 key three times with less than one second between keypresses. The first press displays "Eject?" on the screen, the second "Press again to confirm" and the third performs the ejection, displays "!!!EJECT!!!" on the screen for two seconds and flips the G13 over to the infantry mode page. Releasing the G20 key at any point before the third press resets the counter and cancels the action (clearing the screen) as does waiting over one second between keypresses. I can still use the G7 and G20 keys for regular binds and the ejction logic is only active on the third mode page. This I'm sure to not trigger it by accident, but am able to trigger it within half a second using just one hand.

Should you be interested in the script, it can be found as a gist here. It's made for the G13 but can be easily adapted for other scriptable G-series devices. I will be working on it over time and will try and remember to update the gist to suit.

I can also share my G13 profile if anyone's interested, but only the Infantry page is usable alone, whereas the Flight page is made to compliment my HOTAS setup.

After I'm a bit further along with my whole controller setup, I'll be happy to share a bit more info if someone want's to see a slightly unorthodox control scheme (with Fanatec Clubsport racing pedals controlling forward and rear thrusters and the brake), but I need to tweak things a bit more before I feel I know where I want things.




-- Logitech G13 script for Star Citizen 1.1.0 profile
--
-- author: Markus "Jaroneko" Räty <jaroneko at gmail dot com>
-- Copyright (c) 2015, Markus "Jaroneko" Räty
-- This code is in the Public Domain, or the BSD (3 clause) license if Public Domain does not apply
-- in your country.
--
-- ver. 20150323

eject_try_counter = 0;
eject_try = 0;

function OnEvent(event, arg, family)
  OutputLogMessage("event = %s, arg = %s, family = %s\n", event, arg, family)
  mkey = GetMKeyState("lhc")
  if (event == "G_PRESSED" and mkey == 3) then
    if (arg == 20) then
      G20_down = 1;
    end
    if (arg == 7) and (G20_down == 1) then
      if (GetRunningTime() - eject_try <= 1000) then
        if (eject_try_counter == 2) then
          PressKey("ralt","l");
          Sleep(5);
          ReleaseKey("l");
          Sleep(5);
          ReleaseKey("ralt");
          ClearLCD ();
          OutputLCDMessage("   \n                 !!!EJECT!!!    \n", 2000);
          Sleep(2000);
          SetMKeyState(1, "lhc");
          eject_try_counter = 0;
        else
          eject_try_counter = eject_try_counter + 1;
          ClearLCD();
          OutputLCDMessage("   \n        Press again to confirm    \n", 1000);
        end
      else
        eject_try_counter = 1;
        ClearLCD();
        OutputLCDMessage("   \n                     Eject?    \n", 1000);
      end
      eject_try = GetRunningTime()
    end
  end
  if (event == "G_RELEASED" and mkey == 3) then
    if (arg == 20) then
      G20_down = 0;
      eject_try_counter = 0;
      ClearLCD();
      OutputLCDMessage("",1);
    end
  end
  if (event == "M_RELEASED" and mkey == 1) then
    ClearLCD ();
    OutputLCDMessage("   \n                    Infantry    \n", 2000);
  end
  if (event == "M_RELEASED" and mkey == 2) then
    ClearLCD ();
    OutputLCDMessage("   \n                  <unused>    \n", 2000);
  end
  if (event == "M_RELEASED" and mkey == 3) then
    ClearLCD ();
    OutputLCDMessage("   \n         Flight - HUD & Power      \n", 2000);
  end
end