# INJ Node — Supply Mono font rollout

The global stylesheet `supply-mono.css` is loaded last on every main HTML page.
It uses the **real Supply Mono** when that family is already installed on the
client system, otherwise **IBM Plex Mono** (Google Fonts) or the operating
system's monospace font. The fallback is not Supply Mono.

**Supply Mono is a commercial Pangram Pangram typeface.** This repository does
not contain it, and trial fonts must not be redistributed in the public app.
For deployment to the public, purchase a license suitable for the site's
usage (the foundry distinguishes websites and webapps) before embedding it.

To activate a legitimately licensed copy for all visitors:

1. Add the authorized WOFF2 files, for example
   `fonts/SupplyMono-Regular.woff2`, `fonts/SupplyMono-Medium.woff2`
   and `fonts/SupplyMono-Semibold.woff2` (only if your license allows
   repository distribution and web embedding).
2. **Before** the `:root` rule in `supply-mono.css`, add:

   ```css
   @font-face {
     font-family: "Supply Mono";
     src: url("./fonts/SupplyMono-Regular.woff2") format("woff2");
     font-style: normal;
     font-weight: 400;
     font-display: swap;
   }
   @font-face {
     font-family: "Supply Mono";
     src: url("./fonts/SupplyMono-Medium.woff2") format("woff2");
     font-style: normal;
     font-weight: 500;
     font-display: swap;
   }
   @font-face {
     font-family: "Supply Mono";
     src: url("./fonts/SupplyMono-Semibold.woff2") format("woff2");
     font-style: normal;
     font-weight: 600 900;
     font-display: swap;
   }
   ```

3. Update the stylesheet URL's version in HTML pages and the PWA cache
   version in `sw.js` so existing installations pick up the new assets.
4. Test on iPhone Safari/PWA, iPad, and desktop, especially narrow order
   book columns, Workspace cards, and live-changing numerical values.

No trading, wallet, animation or layout code is modified by this rollout.
