/* INJ Node · Luxury Fintech Iconography | Style B.
 * 15 reduced-complexity, theme-linked vector glyphs with one quiet animated detail.
 * Decorative-only: never change click handlers, wallet data, navigation or Home layout.
 */
(() => {
  'use strict';
  const artwork = {
  "entryDashboardButton": "<rect class=\"pi-panel\" x=\"16\" y=\"12\" width=\"88\" height=\"44\" rx=\"7\"/><path class=\"pi-detail\" d=\"M27 24h27M27 31h18M27 39h22\"/><path class=\"pi-strong\" d=\"m63 43 9-9 7 5 12-17\"/><circle class=\"pi-motion\" cx=\"91\" cy=\"22\" r=\"2.5\"/>",
  "entryLiveButton": "<rect class=\"pi-panel\" x=\"16\" y=\"12\" width=\"88\" height=\"44\" rx=\"7\"/><path class=\"pi-hair\" d=\"M25 45h70\"/><path class=\"pi-strong pi-motion\" d=\"M23 35h17l8-13 11 24 11-20 8 9h19\"/><circle class=\"pi-led\" cx=\"78\" cy=\"35\" r=\"2\"/>",
  "entryLiveChartsButton": "<path class=\"pi-hair\" d=\"M19 53h82M19 17v36\"/><path class=\"pi-detail\" d=\"M39 24v22M53 19v24M67 23v22M81 14v28\"/><rect class=\"pi-panel\" x=\"35\" y=\"31\" width=\"8\" height=\"12\" rx=\"1.5\"/><rect class=\"pi-panel\" x=\"49\" y=\"24\" width=\"8\" height=\"13\" rx=\"1.5\"/><rect class=\"pi-panel\" x=\"63\" y=\"29\" width=\"8\" height=\"10\" rx=\"1.5\"/><rect class=\"pi-panel pi-motion\" x=\"77\" y=\"21\" width=\"8\" height=\"13\" rx=\"1.5\"/>",
  "entryOrderBookButton": "<rect class=\"pi-panel\" x=\"18\" y=\"13\" width=\"84\" height=\"42\" rx=\"7\"/><path class=\"pi-hair\" d=\"M60 18v31\"/><path class=\"pi-detail\" d=\"M28 24h23M35 30h16M28 37h20M31 43h20M69 24h22M69 30h16M69 37h23M69 43h16\"/><path class=\"pi-motion pi-strong\" d=\"M50 51h20\"/>",
  "entryPerformanceButton": "<path class=\"pi-hair\" d=\"M20 52h80\"/><rect class=\"pi-panel\" x=\"26\" y=\"33\" width=\"10\" height=\"19\" rx=\"2\"/><rect class=\"pi-panel\" x=\"44\" y=\"24\" width=\"10\" height=\"28\" rx=\"2\"/><rect class=\"pi-panel\" x=\"62\" y=\"30\" width=\"10\" height=\"22\" rx=\"2\"/><rect class=\"pi-panel\" x=\"80\" y=\"18\" width=\"10\" height=\"34\" rx=\"2\"/><path class=\"pi-strong pi-motion\" d=\"m25 29 23-12 19 8 19-15\"/>",
  "entryConverterButton": "<circle class=\"pi-panel\" cx=\"42\" cy=\"34\" r=\"17\"/><circle class=\"pi-panel\" cx=\"78\" cy=\"34\" r=\"17\"/><path class=\"pi-strong\" d=\"M33 34h18M43 27v14M69 30h17M69 38h17\"/><path class=\"pi-detail pi-motion\" d=\"M49 15q16-9 29-2m-5-4 5 4-7 3M71 53q-16 9-29 2m5 4-5-4 7-3\"/>",
  "entryMarketButton": "<rect class=\"pi-panel\" x=\"20\" y=\"13\" width=\"34\" height=\"19\" rx=\"3\"/><rect class=\"pi-panel\" x=\"66\" y=\"13\" width=\"34\" height=\"19\" rx=\"3\"/><rect class=\"pi-panel\" x=\"20\" y=\"36\" width=\"34\" height=\"19\" rx=\"3\"/><rect class=\"pi-panel pi-motion\" x=\"66\" y=\"36\" width=\"34\" height=\"19\" rx=\"3\"/><path class=\"pi-detail\" d=\"m26 26 7-6 6 4 8-6M73 23h20M27 48h18M73 46h20\"/>",
  "entryLiveRewardsButton": "<path class=\"pi-hair\" d=\"M19 51h82\"/><path class=\"pi-detail\" d=\"M33 51V38M53 51V33M73 51V26M93 51V18\"/><path class=\"pi-strong\" d=\"m24 43 19-6 20-8 26-17\"/><circle class=\"pi-motion\" cx=\"89\" cy=\"12\" r=\"3\"/><circle class=\"pi-panel\" cx=\"33\" cy=\"38\" r=\"5\"/><circle class=\"pi-panel\" cx=\"73\" cy=\"26\" r=\"5\"/>",
  "entryCommandCenterButton": "<rect class=\"pi-panel\" x=\"17\" y=\"12\" width=\"86\" height=\"44\" rx=\"7\"/><path class=\"pi-hair\" d=\"M46 18v32M75 18v32\"/><path class=\"pi-detail\" d=\"M25 42h13M25 47h10M82 24h13M82 30h11M82 43h13\"/><path class=\"pi-strong pi-motion\" d=\"M23 32h6l4-9 5 12 4-6\"/><circle class=\"pi-led\" cx=\"61\" cy=\"34\" r=\"5\"/>",
  "entryComparisonButton": "<path class=\"pi-hair\" d=\"M20 52h80\"/><rect class=\"pi-panel\" x=\"27\" y=\"30\" width=\"21\" height=\"22\" rx=\"4\"/><rect class=\"pi-panel\" x=\"70\" y=\"17\" width=\"21\" height=\"35\" rx=\"4\"/><path class=\"pi-detail\" d=\"M38 44V36M81 43V24\"/><path class=\"pi-strong pi-motion\" d=\"M54 34h11m-4-4 4 4-4 4\"/>",
  "entryVisualizeWealthButton": "<path class=\"pi-panel\" d=\"M38 18h44l14 16-36 23-36-23z\"/><path class=\"pi-detail\" d=\"M24 34h72M38 18l12 16 10 23 10-23 12-16\"/><path class=\"pi-strong pi-motion\" d=\"M49 34h22\"/><circle class=\"pi-led\" cx=\"60\" cy=\"34\" r=\"2\"/>",
  "entryRewardLadderButton": "<path class=\"pi-hair\" d=\"M22 53h77\"/><path class=\"pi-panel\" d=\"M26 43h15v10H26zM45 34h15v19H45zM64 25h15v28H64zM83 16h13v37H83z\"/><path class=\"pi-strong pi-motion\" d=\"m33 36 20-9 19-10 18-8\"/>",
  "entryInjcEtfButton": "<rect class=\"pi-panel\" x=\"26\" y=\"11\" width=\"62\" height=\"46\" rx=\"7\"/><text class=\"pi-type\" x=\"36\" y=\"38\">ETF</text><path class=\"pi-detail\" d=\"M36 20h28M36 46h26\"/><circle class=\"pi-panel pi-motion\" cx=\"86\" cy=\"45\" r=\"12\"/><path class=\"pi-strong\" d=\"m80 47 5-5 3 3 5-7\"/>",
  "entryWorkspaceButton": "<rect class=\"pi-panel\" x=\"22\" y=\"13\" width=\"33\" height=\"19\" rx=\"4\"/><rect class=\"pi-panel\" x=\"63\" y=\"13\" width=\"35\" height=\"19\" rx=\"4\"/><rect class=\"pi-panel\" x=\"22\" y=\"38\" width=\"33\" height=\"17\" rx=\"4\"/><rect class=\"pi-panel pi-motion\" x=\"63\" y=\"38\" width=\"35\" height=\"17\" rx=\"4\"/><path class=\"pi-detail\" d=\"M30 22h17M70 22h20M30 47h15\"/><path class=\"pi-strong\" d=\"M80 42v9m-5-4.5h10\"/>",
  "entryTreasuryButton": "<circle class=\"pi-panel\" cx=\"60\" cy=\"34\" r=\"26\"/><circle class=\"pi-detail pi-motion\" cx=\"60\" cy=\"34\" r=\"19\"/><path class=\"pi-strong\" d=\"m50 35 7 7 14-17\"/><path class=\"pi-hair\" d=\"M60 3v6m0 50v6M29 34h-6m74 0h-6\"/>"
};
  const frame = ''; // No miniature trading-panel surround or arcade ornaments.
  function upgrade() {
    const home = document.querySelector('#entryGate .entry-actions.entry-flat-v44');
    if (!home) return;
    for (const [id, content] of Object.entries(artwork)) {
      const tile = document.getElementById(id);
      if (!tile || !home.contains(tile)) continue;
      let holder = tile.querySelector(':scope > .inj-tile-scene');
      if (!holder) {
        holder = document.createElement('span');
        holder.className = 'inj-tile-scene';
        tile.appendChild(holder);
      }
      if (holder.dataset.premiumArtwork === 'luxury-b') continue;
      holder.setAttribute('aria-hidden', 'true');
      holder.classList.add('inj-precision-icon', 'inj-luxury-icon');
      holder.innerHTML = '<svg viewBox="0 0 120 68" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">' + frame + content + '</svg>';
      holder.dataset.premiumArtwork = 'luxury-b';
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', upgrade, { once:true });
  else upgrade();
})();
