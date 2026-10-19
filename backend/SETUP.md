# Telegram leaderboard backend — setup

The fishing game on GitHub Pages is playable. This folder contains a **backend scaffold**, not yet a functioning competitive leaderboard.

## Cloudflare setup
1. Create a Cloudflare account and a Worker named `pcr-fishing-api`.
2. Create a D1 database named `pcr-fishing-db`, and run `schema.sql` in its console.
3. Bind the D1 database to the Worker as `DB`.
4. Set Worker secret `BOT_TOKEN` using the token from BotFather. **Never commit it or paste it into chat.**
5. Set Worker variable `GROUP_ID` to the numeric Telegram group chat ID. Keep the group ID server-side.
6. Deploy `worker.js` to the Worker.
7. Configure the Telegram bot's Mini App button with `https://jojotaytay.github.io/pcr-fishing-arcade/`.

## Security and completion status
- `worker.js` validates Telegram Mini App initData using Telegram's HMAC mechanism and rejects stale data.
- `/start` creates a timed session and `/leaderboard` reads stored rounds.
- `/finish` deliberately **rejects** score submissions until a server-verifiable scoring mechanic is built. Accepting arbitrary client-submitted scores would let anyone cheat.
- The front end has **not yet been connected** to the Worker API. No real shared leaderboard is active yet.
- To bind rankings to an actual Telegram group, the bot should verify group membership server-side; a client-provided group ID must not be trusted.
