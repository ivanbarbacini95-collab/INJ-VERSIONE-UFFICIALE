/* INJ Node Official - prevent browser/page zoom on every route.
   Keep ordinary scrolling, clicks, dragging and chart navigation intact. */
(() => {
  'use strict';
  if (window.__injPageZoomLock) return;
  window.__injPageZoomLock = true;

  const preventZoom = (event) => {
    if (event.cancelable) event.preventDefault();
  };

  // iOS Safari and standalone PWAs can ignore viewport user-scalable=no.
  for (const name of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(name, preventZoom, { capture: true, passive: false });
  }
  document.addEventListener('touchmove', (event) => {
    if (event.touches && event.touches.length > 1) preventZoom(event);
  }, { capture: true, passive: false });

  // Desktop trackpad pinch is delivered as a Ctrl-wheel gesture on Chromium.
  document.addEventListener('wheel', (event) => {
    if (event.ctrlKey || event.metaKey) preventZoom(event);
  }, { capture: true, passive: false });

  // Do not override unmodified wheel, touch panning or normal typing.
  document.addEventListener('keydown', (event) => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    if (['+', '=', '-', '_', '0'].includes(event.key) ||
        ['Equal', 'Minus', 'Digit0', 'NumpadAdd', 'NumpadSubtract', 'Numpad0'].includes(event.code)) {
      preventZoom(event);
    }
  }, { capture: true });
})();


/* Unified privacy preference on every INJ Node route.
   Home's existing toggle and Treasury's Cash Reserve toggle share one state. */
(() => {
  'use strict';
  if (window.INJPrivacy) return;
  const KEY = 'inj_monitor_privacy';
  const root = document.documentElement;
  const read = () => {
    try { return localStorage.getItem(KEY) === '1'; } catch (_) { return false; }
  };
  const updateButtons = (on) => {
    document.querySelectorAll('#privacyButton,#entryPrivacyButton,#cashPrivacy').forEach((button) => {
      button.classList.toggle('active', on);
      button.setAttribute('aria-pressed', String(on));
      button.setAttribute('title', on ? 'Mostra valori' : 'Nascondi valori');
    });
  };
  const sync = (enabled, persist = false) => {
    const on = !!enabled;
    const previous = root.dataset.injPrivacy === 'on';
    root.dataset.injPrivacy = on ? 'on' : 'off';
    if (document.body) document.body.classList.toggle('privacy-on', on);
    if (persist) {
      try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (_) {}
    }
    updateButtons(on);
    if (previous !== on) {
      window.dispatchEvent(new CustomEvent('inj:privacy', {detail: {active: on}}));
    }
  };
  root.dataset.injPrivacy = read() ? 'on' : 'off';
  window.INJPrivacy = Object.freeze({
    get active() { return root.dataset.injPrivacy === 'on'; },
    set(value) { sync(value, true); }
  });

  // CSS is loaded once on every route using the shared page shell.
  if (!document.querySelector('link[data-inj-unified-privacy]')) {
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = './inj-privacy-global-20261114.css?v=20261114a';
    stylesheet.dataset.injUnifiedPrivacy = '1';
    document.head.appendChild(stylesheet);
  }

  function mark(selector, kind) {
    document.querySelectorAll(selector).forEach((element) => {
      element.dataset.injPrivacyMask = kind;
    });
  }
  function markIds(ids, kind = 'value') {
    ids.split(/\s+/).filter(Boolean).forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.dataset.injPrivacyMask = kind;
    });
  }
  function markPageFields() {
    const page = root.dataset.injPage ||
      (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/,'');
    if (page === 'treasury') {
      markIds('treasuryTotalWorth treasuryTotalDisplay treasuryPnl24Value treasuryPnl24Pct treasuryOwnershipSummary treasuryWalletCount treasuryStakedPct treasuryAvailablePct treasuryRewardsPct treasuryAllocationStakedValue treasuryAllocationAvailableValue treasuryAllocationRewardsValue treasuryRewards treasuryRewardsWorth treasuryAvailable treasuryAvailableWorth treasuryStaked treasuryStakedWorth treasuryStakeRatio treasuryRewardHour treasuryRewardHourWorth treasuryRewardDay treasuryRewardDayWorth treasuryRewardMonth treasuryRewardMonthWorth treasuryRewardYear treasuryRewardYearWorth treasuryMilestoneTitle treasuryMilestonePct treasuryMilestoneCurrent treasuryMilestoneRemaining treasurySessionDelta treasuryGrowthCurrent treasuryGrowthChange treasuryGrowthChangePct treasuryGrowthAth treasuryWorthDelta treasuryNetWorthCurrent treasuryWorthChangeAbs treasuryWorthChangePct treasuryWorthMin treasuryWorthMax treasuryPerf24Inj treasuryPerf24Worth treasuryPerf7Inj treasuryPerf7Worth treasuryPerf30Inj treasuryPerf30Worth treasuryPerfAllInj treasuryPerfAllWorth treasuryBestDay treasuryWorstDay treasuryPerformanceAth treasuryPerformanceGrowth treasuryPerformanceGrowthPct cashTotal cashUsdc cashUsdcSol cashUsdtSol cashSolanaEarnDetail cashGoalTotal cashGoalProgress cashChartTotal cashChartPeriodInfo cashTokenCount');
      markIds('treasuryOwnershipTrack treasurySparkStage treasuryWorthStage cashInjectiveTokens cashSolanaTokens cashYieldList cashChartScroll', 'region');
      markIds('treasuryAllocationPie treasuryMilestoneBar cashProgressBar', 'graphic');
      markIds('cashGoalAmount', 'input');
      return;
    }
    if (page === 'live-rewards') {
      markIds('rewardsTotal rewardsTotalFiat rewardsTotalDay rewardsTotalStaked rewardsWalletStatus rewardsApr');
      markIds('rewardsList', 'region');
      markIds('rewardEditorAddress rewardEditorInput', 'input');
    } else if (page === 'reward-ladder') {
      markIds('ladderWalletName ladderRewardValue ladderRewardInj ladderStaked');
      markIds('ladderWalletPicker', 'input');
      mark('.ladder-goal-editor-row input', 'input');
    } else if (page === 'night-view') {
      markIds('nightStaked nightStakedFiat nightReward nightRewardFiat nightWalletScope');
    } else if (page === 'financial-freedom') {
      markIds('freedomWallet freedomCoverage freedomGoal freedomWorth freedomInj freedomDay freedomDayInj freedomMonth freedomSpendingTotal freedomStressCoverage freedomBudget freedomTargetInj freedomMissingInj freedomTier freedomSpendingSummaryCoverage');
      markIds('freedomTierTrack freedomLifestyle', 'region');
      markIds('freedomSpendingPrice', 'input');
    } else if (page === 'visualize-wealth') {
      markIds('wealthTotal wealthTotalDetail wealthStaked wealthStakedDetail wealthAllWorth wealthAllStake wealthAllStakeInj wealthGrowthPointSimpleDaily wealthGrowthPointSimpleTotal wealthGrowthPointCompoundDaily wealthGrowthPointCompoundTotal wealthGrowthSimpleValue wealthGrowthSimpleFiat wealthGrowthCompoundValue wealthGrowthCompoundFiat wealthGrowthExtra wealthGrowthFinal wealthGrowthDaily wealthGrowthStart');
      markIds('wealthGrowthPlot', 'region');
      markIds('wealthGrowthSimpleBar wealthGrowthCompoundBar', 'graphic');
    } else if (page === 'comparison') {
      markIds('capBarSourceValue capBarTargetValue capWalletName capWalletInj capWalletNow capWalletFuture');
      markIds('capManualValues', 'region');
    } else if (page === 'command-center') {
      markIds('ccWalletName ccWalletAddress ccNetWorth ccTotalInj ccTotalPnl ccTotalPnlPct ccDailyReward ccDailyRewardUsd ccAvailable ccStaked ccStakeRatio ccDailyPnl ccDailyPnlPct ccAvgPrice ccRewards ccWalletState ccValidatorCount');
      markIds('ccValidatorList', 'region');
      mark('.cc-rows .private, .cc-wallet-head .private', 'value');
    } else if (page === 'all-transactions') {
      markIds('atMask atCount');
      markIds('atRows atOverviewGrid', 'region');
      markIds('atWallet atSearch', 'input');
    } else if (page === 'validators') {
      markIds('walletResult savedWalletStatus myRank');
      markIds('delegatorList', 'region');
      markIds('walletAddress', 'input');
    } else if (page === 'workspace') {
      markIds('wsSpecificWallet wsPromptValue');
      mark('.ws-card .private', 'value');
    }
  }

  const boot = () => {
    markPageFields();
    sync(read());
    const body = document.body;
    if (body) {
      // The original Home UI changes body.privacy-on; mirror that change.
      new MutationObserver(() => {
        const on = body.classList.contains('privacy-on');
        if (on !== (root.dataset.injPrivacy === 'on')) sync(on, true);
      }).observe(body, {attributes: true, attributeFilter: ['class']});
    }
    window.addEventListener('storage', (event) => {
      if (event.key === KEY || event.key === null) sync(read());
    });
    window.addEventListener('pageshow', () => sync(read()));
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, {once: true});
  } else {
    boot();
  }
})();
