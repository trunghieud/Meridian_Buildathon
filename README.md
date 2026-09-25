# Nansen Meridian Buildathon: The BONER Boardroom

An animated, satirical shareholder meeting and Morning Wood Report powered by Nansen token-flow analytics.

GitHub repository: `trunghieud/Meridian_Buildathon`.

## Local development

Node.js 22 or later, pnpm. Run `pnpm install --frozen-lockfile`, then `pnpm dev`.
Production: `pnpm build`, then `pnpm start`.

## Vercel deployment

Import this repository into Vercel as a Next.js project. The root is the repository root. Build command: `pnpm build`. No custom output directory. Public deployment requested by the owner. No Vercel deployment has been completed for this version.

After the project exists, set `NANSEN_API_KEY` as a sensitive server-side environment variable for Production and Preview and redeploy. Never prefix it with NEXT_PUBLIC_, commit it, or put it in browser code. No key is needed to build or view the clearly dated initial snapshot.

## Branding and voice

- User-supplied BONER sunglasses/laurel face is the official logo reference, used in the header, favicon, public-figure avatar and PNG card.
- The boardroom star is replaced with the BONER marble character.
- The gold framed portrait is a keyboard-accessible link to https://boneronlong.xyz/ and opens in a new tab.
- The chairman selects a recognized English male system voice (Daniel/Guy/George preferred), with slower, lower delivery. Web Speech does not expose a standard gender property; names are matched conservatively. If no recognized male voice exists, the app explains how to enable one rather than falling back to an arbitrary voice. Audio is never autoplayed. Voice identity and timbre depend on the device.
- All source photos were provided by the owner. Generated adaptations preserve their intended branding. The scene includes subtle interface motion rather than independently rigged character animation.

## Data

BONER / Robinhood Chain: `0x98096d17e191b3da1d5f99a6d7b3584351b11e18`.

Initial observations are dated September 25, 2026 at 16:13 UTC. 24h Smart Trader net flow: approximately +$73.7K across 4 active wallets. 7d: Smart Traders +$143.9K (27 wallets), Public Figures +$167.6K (5 wallets). Whale summaries reported no significant net flow. Missing and unquantified data are never fabricated as zero. Cohorts may overlap; flow is not equivalent to a DEX purchase. The separate trading panel is a fixed, explicitly dated launch snapshot.

`GET /api/meeting?period=1h|1d|7d` uses the Nansen Flow Intelligence API when a key is present. Responses use 15-minute Vercel CDN caching, warm-instance caching and in-flight deduplication. These are cost controls, not a durable global budget. No unattended collection or automatic social posting is enabled. API errors fall back visibly to the dated snapshot. The authenticated API path remains unverified until the owner configures a key.

The share card is generated on demand and always uses 24h data. It includes observation timestamp and attribution. Daily scheduling and persistent archives are not implemented.

## Buildathon remaining work

1. Publish the prepared source to the existing `trunghieud/Meridian_Buildathon` repository.
2. Deploy the public Vercel project.
3. Configure and verify the API key.
4. Add durable usage counting and a collection budget; verify 1,000 qualifying API calls.
5. Record a 30–60 second demo and submit by September 27, 2026 at 23:59 UTC, per the supplied announcement.

Research connector calls are not assumed to count toward eligibility. Follow Nansen's redistribution guidelines; this version uses aggregate flow data with attribution, not restricted individual Smart Money wallet lists or the raw Address Labels endpoint.
