# Nansen Meridian Buildathon: The BONER Boardroom

An animated, satirical shareholder meeting and Morning Wood Report powered by Nansen token-flow analytics.

GitHub repository: `trunghieud/Meridian_Buildathon`.

## Local development

Node.js 22 or later, pnpm. Run `pnpm install --frozen-lockfile`, then `pnpm dev`.
Production: `pnpm build`, then `pnpm start`.

## Vercel deployment

The public Next.js deployment is at https://meridian-buildathon.vercel.app. The root is the repository root. Build command: `pnpm build`. No custom output directory.

For live data, create a key at https://app.nansen.ai/api and set `NANSEN_API_KEY` as a sensitive server-side Vercel environment variable for Production (and Preview if needed). Never prefix it with NEXT_PUBLIC_, commit it, or put it in browser code. Connect Upstash Redis to this Vercel project for Production: the integration-injected `UPSTASH_REDIS_REST_KV_REST_API_URL` and `UPSTASH_REDIS_REST_KV_REST_API_TOKEN` are accepted automatically. The shorter `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` also work when set manually. Set `NANSEN_MAX_API_CALLS` to a positive hard limit; the site deliberately stays on its dated snapshot until both the key and durable budget are present. Set a separate random `NANSEN_USAGE_ADMIN_TOKEN` to read the private usage report. Redeploy after changing environment variables.

### Scheduled collection

The GitHub Actions workflow in `.github/workflows/collect-flow-history.yml` visits the public meeting endpoint for its 1-hour, 24-hour and 7-day windows every five minutes until September 27, 2026 at 23:59 UTC. Each fresh, usable Nansen response is archived in Upstash (up to 1,200 observations per window), and `/api/history?period=1h` exposes the latest 72 for the dashboard trend. The server caches each period for four minutes; Vercel's Hobby cron cannot run every five minutes. GitHub scheduled workflows can run late or be skipped, so check the Actions run log and Nansen usage analytics; this schedule cannot guarantee a target number of calls. No GitHub secret is needed because the meeting endpoint is already public. The atomic Redis reservation stops outbound requests at `NANSEN_MAX_API_CALLS`, including manual dashboard requests. The workflow can also be started with **Run workflow** for a three-window smoke test after deployment.

Verify with `GET /api/meeting?period=1d`: `source: "api"` and a current `asOf` mean a live Nansen response was parsed. `source: "snapshot"` plus `warning` explains why live refresh is unavailable. Check the guarded counter with `curl -H 'Authorization: Bearer <YOUR_ADMIN_TOKEN>' https://meridian-buildathon.vercel.app/api/usage`. `requests` counts actual outbound attempts reserved before dispatch; `succeeded` counts 2xx replies; `usable` counts 2xx replies with at least one measured cohort; `reportedCredits` sums the optional Nansen cost response header. Public responses and the browser's 15-minute cache do not increment these counters. Nansen's own usage analytics at https://app.nansen.ai/api?tab=usage-analytics is authoritative for eligibility and billing.

## Branding and voice

- User-supplied BONER sunglasses/laurel face is the official logo reference, used in the header, favicon, public-figure avatar and PNG card.
- The boardroom star is replaced with the BONER marble character.
- The gold framed portrait is a keyboard-accessible link to https://boneronlong.xyz/ and opens in a new tab.
- The chairman selects a recognized English male system voice (Daniel/Guy/George preferred), with slower, lower delivery. Web Speech does not expose a standard gender property; names are matched conservatively. If no recognized male voice exists, the app explains how to enable one rather than falling back to an arbitrary voice. Audio is never autoplayed. Voice identity and timbre depend on the device.
- All source photos were provided by the owner. Generated adaptations preserve their intended branding. The scene includes subtle interface motion rather than independently rigged character animation.

## Data

BONER / Robinhood Chain: `0x98096d17e191b3da1d5f99a6d7b3584351b11e18`.

Initial observations are dated September 25, 2026 at 16:13 UTC. 24h Smart Trader net flow: approximately +$73.7K across 4 active wallets. 7d: Smart Traders +$143.9K (27 wallets), Public Figures +$167.6K (5 wallets). Whale summaries reported no significant net flow. Missing and unquantified data are never fabricated as zero. Cohorts may overlap; flow is not equivalent to a DEX purchase. The separate trading panel is a fixed, explicitly dated launch snapshot.

`GET /api/meeting?period=1h|1d|7d` uses the Nansen Flow Intelligence API when a key and durable budget are present. Upstash atomically reserves one outbound request before each Nansen fetch across all Vercel instances. A missing or unreachable counter fails closed. Responses also use 15-minute Vercel CDN caching, warm-instance caching and in-flight deduplication. API errors fall back visibly to the dated snapshot. No unattended collection or automatic social posting is enabled. The authenticated API path remains unverified until the owner configures a key.

The share card is generated on demand and always uses 24h data. It includes observation timestamp and attribution. Daily scheduling and persistent archives are not implemented.

## Buildathon remaining work

1. Configure and verify the API key, Upstash Redis, and call budget as above.
2. Check actual qualifying calls in Nansen usage analytics. The campaign page says 1,000 calls, while Nansen's help article says 100+. Use the stricter target until Nansen resolves the conflict; local counters alone are not proof of qualification. Claim the buildathon's available API credits before running any collection.
3. Record a 30–60 second silent-friendly demo showing live Nansen data, post it on X tagging `@nansen_ai` and linking this public repository, then submit email, X post URL, and GitHub URL in the official entry form by September 27, 2026 at 23:59 UTC.

Research connector calls are not assumed to count toward eligibility. Follow Nansen's redistribution guidelines; this version uses aggregate flow data with attribution, not restricted individual Smart Money wallet lists or the raw Address Labels endpoint.
