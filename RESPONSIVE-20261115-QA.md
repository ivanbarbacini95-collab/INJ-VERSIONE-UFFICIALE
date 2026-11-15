# INJ Node – full-screen responsive audit (15 November 2026)

Scope: all 20 user-facing HTML screens. `setup.html` is a standalone redirect/config page, not a UI surface.

## Shared corrections
- All user-facing pages load `inj-carbon-gold-unified-20261113.css`, which now imports `inj-portrait-clarity-20261115.css` and `inj-responsive-fullscreen-20261115.css` across every theme (not just Carbon Gold).
- Removes fixed outer maximum widths on All Transaction, Network Status, Validators, Admin Insights, Live View, Market, ETF, Cloud Sync, Comparison, Financial Freedom, Visualize Wealth.
- Height uses dynamic viewport units when available; content-heavy pages retain scrolling and safe areas.
- Keeps the non-scrolling Home and existing Dashboard portrait gap fix; Live Charts, Treasury, My Reward, Order Book, Command Center and Workspace retain existing scroll ownership and saved layout.
- Multi Charts retains mobile swipe pages and existing 2×4 portrait / 4×2 large-landscape layouts.

## Manual visual QA (not claimed automatically verified)
Test each app view as a standalone page and when opened via the Home navigation:
- 390×844 and 844×390 mobile; 768×1024 and 1024×768 tablet.
- 1080×1920 and 1440×2560 portrait monitors; 1920×1080, 2560×1440, 3440×1440, 3840×2160 landscape.
- Zoom locked as intended; rotate while Live View or chart tool is open.
- No horizontal document scrolling; no controls behind the fixed bottom dock; safe-area insets respected.
- Price/reward numerals readable without forced transform scaling or cut-off.
- Scrolling remains available for long tables, transaction lists, validators and detailed ETF history.
- Visual chart viewport resizes without changing candle/timeframe data or manual Workspace positions.
- Home remains stationary and the three shortcut buttons stay above navigation.
