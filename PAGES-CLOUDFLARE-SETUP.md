# INJ Node · GitHub Pages + Cloudflare D1

Architecture: **INJNODE** stays a static PWA published by GitHub Pages, while the private repository [INJ-NODE-INSIGHTS](https://github.com/ivanbarbacini95-collab/INJ-NODE-INSIGHTS) contains the Cloudflare Worker and D1 migrations.

## Publish the existing UI with GitHub Pages

1. In the **public INJNODE repository**, open **Settings → Pages**.
2. Under **Build and deployment** select **Deploy from a branch**, then **main** and **/(root)**. Save.
3. After GitHub reports a successful deployment, open the actual GitHub Pages URL in Settings. For a project repository it normally has the form `https://ivanbarbacini95-collab.github.io/INJNODE/`. Do not treat the URL as live until GitHub says so.
4. Verify Dashboard, INJ Workspace and **Menu hamburger → Avanzate → Admin Insights**.
5. **Leave the custom domain injectiveportfolio.com and its current DNS unchanged** while testing. Switch the Pages custom domain and DNS only after all tests pass.

## Connect Cloudflare Workers + D1

All backend setup steps and the schema are in the *private* Insights repo, at [cloudflare/README.md](https://github.com/ivanbarbacini95-collab/INJ-NODE-INSIGHTS/blob/main/cloudflare/README.md).

After Cloudflare gives you the **real deployed Worker URL**, update this repo's [inj-node-insights-config.js](./inj-node-insights-config.js) with its full `/api/ingest` address.

The same public URL is reused to derive the Admin report API URL; **no secret, password, or access token belongs in that configuration file**. Admin credentials are stored as Cloudflare Worker secrets and used through a short-lived, signed bearer token in page memory.

Until Cloudflare deploy, the endpoint stays empty, telemetry sends **no** events, and the Admin section shows an explicit setup notice rather than fabricated statistics.

The old `api/inj-node-insights.mjs` is legacy Vercel code and is **not needed for the GitHub Pages / Cloudflare runtime**.
