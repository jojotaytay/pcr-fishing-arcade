# PCR Fishing Arcade 🎣

A playable 60-second fishing game for PCR reminders.

## Launch on GitHub Pages
Go to Settings → Pages → Build and deployment → Deploy from a branch. Select main and / (root), then Save. The published URL should be https://jojotaytay.github.io/pcr-fishing-arcade/ once deployment finishes.

## Features
- Pastel fishing pond, casting animation, five collectible catches
- 60-second rounds and point scoring
- Local practice high scores saved on the current device
- Telegram Web App SDK for in-app opening

## Important: leaderboard not yet connected
The current scores are **local practice scores**, not shared group scores.

A shared group leaderboard requires a secure backend to verify Telegram initData, identify players, store scores, and validate gameplay server-side. Never place the bot token in this public repository. The bot must also be configured to open the hosted Mini App.
