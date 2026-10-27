/* INJ Node Home Vitality — decorative scenes only.
   No wallet fetches, event interception, scrolling, fixed layers or backdrop blur. */
(() => {
  'use strict';
  const scene = {
    entryDashboardButton: '<rect x="7" y="12" width="46" height="17" rx="4" class="wash"/><rect x="65" y="12" width="46" height="17" rx="4" class="wash"/><rect x="7" y="40" width="46" height="17" rx="4" class="wash"/><rect x="65" y="40" width="46" height="17" rx="4" class="wash"/><path d="M15 23h18m-18 24h24m34-24h25m-25 24h17" class="soft"/><circle cx="43" cy="21" r="3" class="solid motion-pulse"/><path d="m79 20 6-5 6 4 9-8" class="motion-stroke"/>',
    entryLiveButton: '<path d="M2 35h17l9-15 12 30 14-29 8 14h16l8-8 7 8h25" class="motion-stroke"/><path d="M2 52h116M2 17h116" class="soft"/><circle cx="88" cy="27" r="4" class="solid motion-pulse"/>',
    entryLiveChartsButton: '<path d="M6 6v55h109M6 20h109M6 39h109" class="soft"/><path d="M10 55 29 42 45 49 60 28 78 36 93 17 112 9" class="motion-stroke"/><circle cx="112" cy="9" r="4" class="solid motion-pulse"/>',
    entryOrderBookButton: '<path d="M58 7v54" class="soft"/><path d="M6 13h38M18 24h26M11 35h33M24 46h20M17 57h27" class="motion-bars"/><path d="M76 13h31M76 24h19M76 35h38M76 46h25M76 57h36" class="motion-pulse"/><path d="M56 35h6" class="soft"/>',
    entryPerformanceButton: '<path d="M10 37v22m0-17h7v9h-7zM33 9v38m0-26h8v17h-8zM56 26v37m0-25h8v15h-8zM81 4v45m0-37h8v25h-8zM105 17v42m0-27h8v13h-8z" class="motion-pulse"/><path d="M4 60h114" class="soft"/>',
    entryConverterButton: '<path d="M14 26c8-15 26-20 42-14 5 2 10 5 14 9M60 17l10 4-3-11" class="motion-stroke"/><path d="M107 41c-9 15-27 20-42 14-5-2-10-5-14-9M61 51l-10-5 4 12" class="motion-stroke"/><circle cx="60" cy="34" r="16" class="wash"/><path d="M55 29h10m-10 5h10m-10 5h10" class="soft"/>',
    entryMarketButton: '<path d="M4 61h114M4 11v50" class="soft"/><rect x="14" y="45" width="13" height="16" rx="2" class="wash motion-bars"/><rect x="35" y="32" width="13" height="29" rx="2" class="wash motion-bars b2"/><rect x="56" y="37" width="13" height="24" rx="2" class="wash motion-bars b3"/><rect x="77" y="21" width="13" height="40" rx="2" class="wash motion-bars b4"/><path d="m10 32 27-12 21 4 25-16 18 4" class="motion-stroke"/><path d="m95 7 6 5-8 4" class="motion-stroke"/>',
    entryLiveRewardsButton: '<path d="M10 57h102" class="soft"/><circle cx="25" cy="45" r="6" class="wash motion-float"/><circle cx="47" cy="24" r="4" class="solid motion-pulse"/><circle cx="74" cy="44" r="8" class="wash motion-float"/><circle cx="100" cy="16" r="5" class="solid motion-pulse"/><path d="m40 51 8-8 8 8m30-23 8-8 8 8" class="motion-stroke"/><path d="M19 12v10m-5-5h10M84 7v8m-4-4h8" class="soft"/>',
    entryTreasuryButton: '<circle cx="60" cy="34" r="27" class="motion-ring"/><circle cx="60" cy="34" r="17" class="motion-ring reverse"/><circle cx="60" cy="34" r="7" class="wash"/><path d="M25 34H9m86 0h16M60 1v9m0 47v10" class="soft"/><path d="m57 34 3 4 5-8" class="motion-pulse"/>',
    entryInjcEtfButton: '<path d="M5 60h110M5 8v52" class="soft"/><rect x="16" y="38" width="18" height="22" rx="2" class="wash"/><rect x="42" y="25" width="18" height="35" rx="2" class="wash"/><rect x="68" y="14" width="18" height="46" rx="2" class="wash"/><path d="m12 48 29-22 24 9 38-27" class="motion-stroke"/><path d="m91 7 12 1-2 12" class="soft"/><circle cx="65" cy="35" r="4" class="solid motion-pulse"/>',
    entryRewardLadderButton: '<path d="M5 61h110" class="soft"/><path d="M13 51h21v10H13zM38 39h21v22H38zM63 26h21v35H63zM88 12h21v49H88z" class="wash motion-bars"/><path d="M12 54h24l14-12 21-1 16-19 18-9" class="motion-stroke"/><circle cx="50" cy="42" r="3" class="solid motion-pulse"/><circle cx="105" cy="13" r="4" class="solid motion-pulse"/>',
    entryCommandCenterButton: '<rect x="5" y="10" width="110" height="48" rx="6" class="wash"/><path d="M43 10v48M82 10v48M5 35h110" class="soft"/><path d="M10 26h7l5-9 6 17 6-8h8" class="motion-stroke"/><circle cx="62" cy="34" r="14" class="motion-ring"/><circle cx="62" cy="34" r="4" class="solid motion-pulse"/><path d="M89 22h20M89 29h15M89 43h19M89 50h12" class="motion-bars"/>',
    entryNetworkRadarButton: '<circle cx="60" cy="34" r="25" class="motion-ring"/><circle cx="60" cy="34" r="15" class="motion-ring reverse"/><circle cx="60" cy="34" r="5" class="solid motion-pulse"/><path d="M60 34 81 17M10 34h20M90 34h20M60 3v10m0 42v10" class="soft"/><circle cx="82" cy="17" r="3" class="motion-pulse"/>',
    entryStrategyLabButton: '<path d="M5 61h110M5 8v53" class="soft"/><path d="M8 48 23 45 38 52 55 33 72 40 89 20 111 8" class="motion-stroke"/><path d="M8 54 23 48 38 54 55 46 72 52 89 41 111 30" class="motion-pulse"/><path d="M8 44 23 38 38 40 55 28 72 31 89 16 111 6" class="soft"/><circle cx="89" cy="20" r="4" class="solid motion-pulse"/>',
    entryVisualizeWealthButton: '<path d="M32 17h56l16 18-44 29L16 35z" class="wash motion-float"/><path d="M16 35h88L60 64 16 35ZM32 17h56l16 18H16zM46 17 35 35l25 29 25-29-11-18M35 35h50" class="soft"/><path d="m46 17 14 18 14-18M60 35v29" class="motion-pulse"/><path d="M12 13v12m-6-6h12M110 7v12m-6-6h12M109 50v10m-5-5h10" class="motion-pulse"/>',
    entryComparisonButton: '<path d="M3 61h114" class="soft"/><rect x="18" y="30" width="30" height="31" rx="4" class="wash motion-bars"/><rect x="69" y="10" width="30" height="51" rx="4" class="wash motion-bars b2"/><path d="M34 24h15m-5-5 5 5-5 5M77 6h19" class="motion-stroke"/><path d="m104 21 7-7 6 5" class="motion-pulse"/>'
  };
  function mount() {
    const root = document.querySelector('.entry-actions.entry-flat-v44');
    if (!root) return;
    for (const [id, artwork] of Object.entries(scene)) {
      const tile = document.getElementById(id);
      if (!tile || !root.contains(tile) || tile.querySelector('.inj-tile-scene')) continue;
      const decoration = document.createElement('span');
      decoration.className = 'inj-tile-scene';
      decoration.setAttribute('aria-hidden', 'true');
      decoration.innerHTML = '<svg viewBox="0 0 120 68" xmlns="http://www.w3.org/2000/svg" focusable="false">' + artwork + '</svg>';
      tile.appendChild(decoration);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
})();
