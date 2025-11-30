# A new design for the page games integrations


Today, there are discepancies between games visual box on the games page:
- cs2 has config folder selection and port (configuration), then start and installation buttons, then logs
- hl alix has setup guide, then launch button and start button, and logs
- super hot has events count, mod info and logs
- pistol whip has things also


The content for each game also can be potentially quite big with the helpers and how to install.

Ideally, it would be better to have a dedicated page for each game integration.
On the main page, we would have one button by game, in alpha order, and with a text search filter.

For each game page, we want to always have all sections, but the non relevant ones would be hidden on this specific page, what I want you to do is a skeleton that we can reuse for any new game.

So we would like for each game:
- title
- status
- start button
- launch game button (if possible, especialy for steam games <3)
- configuration (folder selector?)
- setup guide, if available and with download buttons when relevant (I reeally like the one already existing for Alyx)
- live events log