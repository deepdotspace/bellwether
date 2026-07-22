# Bellwether

A daily brief on prediction markets — which way the odds are moving, what
swung overnight, and how your own forecasts stack up. For anyone who follows
politics, sports, and world events by watching where the money goes. Built on the
[DeepSpace SDK](https://deep.space).

**Live app:** https://bellwether.app.space

## What it does
- Publishes a daily brief of trending prediction markets, surfacing the biggest overnight odds swings as "top movers"
- Writes AI blurbs and an editorial Edition that explain what changed and why it matters
- Lets you log your own calls on any market and tracks your accuracy and streaks on a personal scorecard
- Includes an in-app AI assistant you can ask about the markets and your record

## How it's built
Market data comes from the `polymarket` integration through the DeepSpace
integrations proxy, and the brief's blurbs and daily editorial are generated via
the `anthropic` chat-completion integration. A CronRoom task (`daily-brief`)
runs every few hours to snapshot odds, diff for movers, resolve calls, and
publish the day's brief. App state — briefs, editions, user calls, streaks, and
follows — lives in RecordRooms with per-collection RBAC. The in-app assistant is
wired with the Vercel AI SDK over the DeepSpace proxy, giving it read/write tools
scoped by the signed-in user's role.

## Run your own

Deploy your own copy in three commands:

```sh
npm install
npx deepspace login     # one-time, opens a browser tab
npx deepspace deploy    # -> <name>.app.space
```

Auth, the database, real-time sync, and hosting all come from DeepSpace, so
there is nothing else to configure. Your subdomain is the `name` field in
`wrangler.toml`; change it for your own deployment.

Or build something new: apps like this are made by handing a prompt to a
coding agent — start at [deep.space/get-started](https://deep.space/get-started),
or scaffold from scratch: `npm create deepspace@latest my-app`.

---
*Bellwether was built end-to-end by an AI agent on the DeepSpace SDK.
DeepSpace is laying the foundation for rebuilding the Internet in an AI-native
way — [deep.space](https://deep.space) · [docs](https://docs.deep.space).*
