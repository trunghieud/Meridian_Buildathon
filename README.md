# The BONER Boardroom

A satirical shareholder meeting for BONER on Robinhood Chain. The dashboard compares Nansen's Smart Trader, Whale, and Public Figure net flows across 1-hour, 24-hour, and 7-day windows. It includes a flow-history chart, an on-demand PNG briefing, and optional spoken commentary.

[View the original demo](https://meridian-buildathon.vercel.app) · [Nansen Flow Intelligence documentation](https://docs.nansen.ai/api/token-god-mode/flow-intelligence)

This project was built for the 2026 Meridian Buildathon but was **not submitted**. It is available to fork and develop further.

## Run a fork locally

Requires Node.js 22.13+ and pnpm 11. Click **Fork** on this repository in GitHub, then clone your fork:

```bash
git clone https://github.com/YOUR_USERNAME/Meridian_Buildathon.git
cd Meridian_Buildathon
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000`. Without credentials, the meeting displays a **dated September 25, 2026 snapshot**, so you can explore the UI immediately. The separate trading-floor statistics are also a fixed, dated snapshot. They do not refresh with the API.

## Enable live Nansen data

1. Get a Nansen API key from [Nansen](https://app.nansen.ai/api). Create an Upstash Redis database, either directly or through the Vercel integration. Each fork should use its own Redis database so its usage budget and history are independent.
2. Copy `.env.example` to `.env.local` and fill in the server-side values:

   | Variable | Purpose |
   | --- | --- |
   | `NANSEN_API_KEY` | Your private Nansen API key. |
   | `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` | REST endpoint and token for your Upstash database. The Vercel integration's `UPSTASH_REDIS_REST_KV_REST_API_URL` and `UPSTASH_REDIS_REST_KV_REST_API_TOKEN` are accepted instead. |
   | `NANSEN_MAX_API_CALLS` | Positive integer: maximum **outbound attempts** across all app instances and deployments sharing that Redis database. Start with a small amount you are willing to consume. Unset or `0` disables live calls. |
   | `NANSEN_USAGE_ADMIN_TOKEN` | Optional private token for `/api/usage`. Generate one with `openssl rand -hex 32`. |

3. Restart `pnpm dev`. Never commit `.env.local`, place credentials in client code, or use a `NEXT_PUBLIC_` prefix for these values.

The app reserves a call in Redis *before* contacting Nansen. If the budget is exhausted or Redis is unavailable, it falls back to the dated snapshot. A reservation still counts when the upstream request fails or times out. Responses are cached per window, so refreshing a page does not necessarily spend a call. History is stored in Redis only for usable API responses; a new database starts with an empty chart.

### Check your setup

With the app running, visit `http://localhost:3000/api/meeting?period=1d`. A response with `"source":"api"` and a recent `asOf` is a live observation. `"source":"snapshot"` and `warning` explain a fallback. Check `http://localhost:3000/api/history?period=1d` for collected history. If you configured the admin token, read usage privately:

```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:3000/api/usage
```

`requests` counts reserved outbound attempts; `succeeded` counts successful HTTP replies; `usable` counts replies containing at least one measured cohort. `reportedCredits` sums the optional Nansen response header. Your Nansen account's usage page is the authority for actual credits or billing. Do not put the admin token in a public URL or issue report.

## Deploy your fork on Vercel

1. Import **your fork** as a new Vercel project. Use the repository root, Next.js framework, `pnpm build`, and the default Next.js output setting.
2. Add `NANSEN_API_KEY`, your Upstash REST credentials, and a modest `NANSEN_MAX_API_CALLS` in Vercel's **Production** environment variables. Add `NANSEN_USAGE_ADMIN_TOKEN` if you want the private usage report. Configure Preview separately if you intend to use live data there; shared Redis means Preview calls consume the same budget.
3. Deploy or redeploy after saving variables. Visit your deployment's `/api/meeting?period=1d` to verify the `source`, `asOf`, and any `warning` as described above. The original demo's Vercel settings and secrets do **not** transfer to a fork.

## About the old collector workflow

`.github/workflows/collect-flow-history.yml` is an **archived buildathon collector**. It hard-codes the original demo URL and a cutoff of September 27, 2026 at 23:59 UTC. It will not collect useful observations after that date, even if GitHub runs it. **Do not point it at your deployment unchanged.** For ongoing collection, replace its URL and cutoff, choose a schedule and budget suitable for your account, and inspect the Actions logs plus `/api/usage`. The app itself can collect observations from normal dashboard visits without this workflow.

## What to customize

- `lib/boardroom.ts` contains the BONER token address (`0x98096d17e191b3da1d5f99a6d7b3584351b11e18`), snapshot, labels, and meeting copy. If you change the token, replace the snapshot and other dated copy as well.
- `app/page.tsx` contains the dashboard, the fixed trading-floor panel, and the briefing PNG. `lib/artwork.ts` and `app/api/art/[name]/route.ts` serve the embedded branded art. Replace the branding and check your rights before reusing it in a new project.
- `app/api/meeting/route.ts` handles Nansen calls and caching. `lib/nansen-usage.ts` handles the Redis budget, audit counters, and history. `app/api/history/route.ts` exposes chart points; `app/api/usage/route.ts` requires the admin token.

Net flows are transfers, not confirmed buys; cohorts may overlap. Missing values are not zero. The briefing is downloaded on demand and never posted automatically. Spoken commentary uses the browser's available English male system voices and may be unavailable on some devices.
