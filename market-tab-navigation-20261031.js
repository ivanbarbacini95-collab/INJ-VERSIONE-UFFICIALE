/* INJ Node · Market direct tab with a horizontally scrollable destination rail.
   The existing Market, Events, Live Charts, Order Book and Performance engines
   remain authoritative. No new market feed, chart engine or wallet state. */
(()=>{
  'use strict';
  const root=document.documentElement;
  const gate=document.getElementById('entryGate');
  const dock=document.getElementById('injPrimaryBottomNav');
  if(!gate||!dock||document.getElementById('injMarketTabPanel'))return;

  const destinations=[
    {id:'crypto',it:'Global Crypto',en:'Global Crypto',entry:'crypto'},
    {id:'events',it:'Market Event',en:'Market Events',launcher:'entryMacroCalendarButton'},
    {id:'charts',it:'Live Charts',en:'Live Charts',page:'./live-charts.html'},
    {id:'book',it:'Order Book',en:'Order Book',page:'./order-book.html'},
    {id:'performance',it:'Performance',en:'Performance',launcher:'entryPerformanceButton'},
    {id:'world',it:'Global Market',en:'Global Market',entry:'world'}
  ];
  // Opaque sibling below the Market content shields the retained Home,
  // including transparent chart frames and the rail's safe-area margins.
  const backdrop=document.createElement('div');
  backdrop.id='injMarketTabBackdrop';
  backdrop.hidden=true;
  backdrop.setAttribute('aria-hidden','true');
  const panel=document.createElement('section');
  panel.id='injMarketTabPanel';
  panel.className='inj-market-tab-panel';
  panel.hidden=true;
  panel.setAttribute('aria-label','Market');
  const head=document.createElement('header');
  head.className='inj-market-tab-head';
  head.id='injMarketTabHead';
  head.hidden=true;
  const kicker=document.createElement('span');
  kicker.className='inj-market-tab-kicker';
  kicker.textContent='INJ NODE / MARKET';
  const rail=document.createElement('nav');
  rail.className='inj-market-tab-rail';
  rail.setAttribute('aria-label','Sezioni Market');
  const buttons=new Map();
  let quoteFallbackTimer=0;
  let dailyQuoteTimer=0,quoteBusy=false,lastQuoteAt=0;
  let lastApiPrice=NaN,lastLivePrice=NaN,lastLivePriceAt=0,dayChange=NaN;
  const formatUsd=value=>{
    if(!(Number.isFinite(value)&&value>0))return '—';
    const digits=value<10?4:value<100?3:2;
    return '$'+value.toLocaleString('en-US',{minimumFractionDigits:digits,maximumFractionDigits:digits});
  };
  function renderMarketQuote(price,day=dayChange){
    if(Number.isFinite(day))dayChange=day;
    if(Number.isFinite(price)&&price>0){
      quoteValue.textContent=formatUsd(price);
    }
    if(Number.isFinite(dayChange)){
      const tone=dayChange>0?'up':dayChange<0?'down':'neutral';
      const change=(dayChange>0?'+':'')+dayChange.toFixed(2)+'%';
      quoteDock.dataset.tone=tone;
      quoteDay.textContent='24H '+change;
      quoteDock.setAttribute('aria-label','INJ USD '+quoteValue.textContent+' 24H '+change);
    }
  }
  async function getDailySnapshot(){
    const urls=[
      'https://data-api.binance.vision/api/v3/ticker/24hr?symbol=INJUSDT',
      'https://api.binance.com/api/v3/ticker/24hr?symbol=INJUSDT',
      'https://api.coingecko.com/api/v3/simple/price?ids=injective-protocol&vs_currencies=usd&include_24hr_change=true'
    ];
    for(const url of urls){
      const controller=new AbortController();
      const timeout=window.setTimeout(()=>controller.abort(),4500);
      try{
        const response=await fetch(url,{cache:'no-store',signal:controller.signal});
        if(!response.ok)continue;
        const data=await response.json();
        let value,change;
        if(url.includes('coingecko')){
          value=Number(data?.['injective-protocol']?.usd);
          change=Number(data?.['injective-protocol']?.usd_24h_change);
        }else{
          value=Number(data?.lastPrice);
          change=Number(data?.priceChangePercent);
        }
        if(Number.isFinite(value)&&value>0&&Number.isFinite(change))
          return {price:value,change};
      }catch(_){}
      finally{clearTimeout(timeout);}
    }
    return null;
  }
  async function refreshDailyQuote(){
    if(!isMarket()||document.hidden||quoteBusy)return;
    quoteBusy=true;
    try{
      const snapshot=await getDailySnapshot();
      if(!snapshot||!isMarket())return;
      lastApiPrice=snapshot.price;
      lastQuoteAt=Date.now();
      const freshestPrice=selected==='charts'&&Date.now()-lastLivePriceAt<2500?lastLivePrice:lastApiPrice;
      renderMarketQuote(freshestPrice,snapshot.change);
      quoteDock.removeAttribute('data-stale');
    }finally{quoteBusy=false;}
  }
  function startDailyQuote(){
    clearInterval(dailyQuoteTimer);
    void refreshDailyQuote();
    dailyQuoteTimer=window.setInterval(()=>{
      if(!isMarket()||document.hidden)return;
      if(lastQuoteAt&&Date.now()-lastQuoteAt>120000)quoteDock.dataset.stale='true';
      void refreshDailyQuote();
    },15000);
  }
  function stopDailyQuote(){
    clearInterval(dailyQuoteTimer);
    dailyQuoteTimer=0;
  }
  const english=()=>{try{return root.lang==='en'||localStorage.getItem('inj_node_language_v1')==='en'}catch(_){return root.lang==='en'}};
  for(const item of destinations){
    const button=document.createElement('button');
    button.type='button';
    button.className='inj-market-tab-link';
    button.dataset.marketDestination=item.id;
    if(item.entry||item.page)button.setAttribute('aria-controls','injMarketTabFrame');
    const label=document.createElement('span');
    label.className='inj-market-tab-label';
    label.textContent=english()?item.en:item.it;
    button.appendChild(label);
    button.addEventListener('click',()=>navigate(item.id,true));
    rail.appendChild(button);
    buttons.set(item.id,button);
  }
  // The only route back to Home while Market is open. Keep it pinned
  // beside the horizontal destination rail, not inside its scroll surface.
  const homeLink=document.createElement('button');
  homeLink.type='button';
  homeLink.id='injMarketHomeLink';
  homeLink.className='inj-market-home-link';
  homeLink.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="m3.5 10 8.5-7 8.5 7v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V10"/><path d="M9 21v-8h6v8"/></svg>';
  homeLink.addEventListener('click',()=>{
    if(!isMarket())return;
    if(modalOpen())dismissNativeView();
    window.INJ_BOTTOM_NAV?.select('home');
  });
  const topRow=document.createElement('div');
  topRow.className='inj-market-tab-row';
  topRow.append(homeLink,rail);
  // The quote is pinned above the scrollable rail, so it never scrolls away
  // when a different Market destination is selected.
  const kickerRow=document.createElement('div');
  kickerRow.className='inj-market-kicker-row';
  const quoteDock=document.createElement('div');
  quoteDock.id='injMarketPersistentQuote';
  quoteDock.className='inj-market-persistent-quote';
  quoteDock.dataset.tone='neutral';
  quoteDock.setAttribute('aria-label','INJ USD 24H');
  quoteDock.innerHTML='<span class="inj-quote-symbol">INJ</span><strong class="inj-quote-value">—</strong><span class="inj-quote-day">24H —</span>';
  const quoteValue=quoteDock.querySelector('.inj-quote-value');
  const quoteDay=quoteDock.querySelector('.inj-quote-day');
  kickerRow.append(kicker,quoteDock);
  head.append(kickerRow,topRow);
  const content=document.createElement('div');
  content.className='inj-market-tab-content';
  const loading=document.createElement('div');
  loading.className='inj-market-tab-loading';
  loading.textContent='INJ NODE';
  const frame=document.createElement('iframe');
  frame.id='injMarketTabFrame';
  frame.className='inj-market-tab-frame';
  frame.title='Global Crypto';
  frame.setAttribute('loading','eager');
  frame.setAttribute('referrerpolicy','same-origin');
  content.append(loading,frame);
  panel.append(content);
  document.body.append(backdrop,head,panel);

  let selected='crypto',lastMarketEntry='crypto',currentUrl='',wasMarket=false;
  let modalPending=false,modalWasOpened=false;

  /* Market's upper rail remains permanently visible; no idle hide. */
  let resizeTimer=0;
  const scheduleLayoutUpdate=()=>{
    const update=()=>{
      if(!isMarket())return;
      window.dispatchEvent(new Event('resize'));
      try{frame.contentWindow?.dispatchEvent(new Event('resize'))}catch(_){}
    };
    requestAnimationFrame(update);
    clearTimeout(resizeTimer);
    resizeTimer=window.setTimeout(update,390);
  };
  function registerActivity(){
    if(!isMarket()||root.dataset.injMarketChrome==='shown')return;
    root.dataset.injMarketChrome='shown';
    scheduleLayoutUpdate();
  }

  const isMarket=()=>root.dataset.injHomeTab==='mercato';
  const modalOpen=()=>document.body.classList.contains('inj-section-open')||
    !document.getElementById('injMarketEventsOverlay')?.hidden||
    !document.getElementById('performanceTimelineView')?.hidden;
  function refreshLanguage(){
    const en=english();
    rail.setAttribute('aria-label',en?'Market sections':'Sezioni Market');
    homeLink.setAttribute('aria-label',en?'Return to Home':'Torna alla Home');
    homeLink.setAttribute('title',en?'Home':'Home');
    panel.setAttribute('aria-label',en?'Market':'Mercato');
    for(const item of destinations){
      const label=buttons.get(item.id)?.querySelector('.inj-market-tab-label');
      if(label)label.textContent=en?item.en:item.it;
    }
    if(currentUrl && frame.contentWindow){
      try{
        frame.contentWindow.postMessage({type:'injnode:market:language',language:en?'en':'it'},location.origin);
        frame.contentWindow.postMessage({type:'injnode:languagechange',language:en?'en':'it'},location.origin);
      }catch(_){}
    }
  }
  function updateSelection(id,scrollButton){
    selected=id;
    for(const [key,button] of buttons){
      const active=key===id;
      button.classList.toggle('is-active',active);
      button.setAttribute('aria-pressed',String(active));
      if(active)button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    }
    if(scrollButton){
      buttons.get(id)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'nearest',inline:'center'});
    }
  }
  function showPage(item){
    clearInterval(quoteFallbackTimer);
    quoteFallbackTimer=0;
    lastMarketEntry=item.id;
    const en=english();
    const url=new URL(item.entry?'./market.html':item.page,document.baseURI);
    url.searchParams.set('embed','market');
    if(item.entry){
      url.searchParams.set('entry',item.entry);
      url.searchParams.set('lang',en?'en':'it');
      url.searchParams.set('v','20261031marketcompact7');
    }else url.searchParams.set('v','20261031marketcompact7');
    const source=url.href;
    if(source!==currentUrl){
      currentUrl=source;
      content.classList.remove('is-ready');
      frame.title=en?item.en:item.it;
      frame.src=source;
    }
  }
  function dismissNativeView(){
    const events=document.getElementById('injMarketEventsOverlay');
    if(events&&!events.hidden){
      if(!document.getElementById('injEventsResultBackdrop')?.hidden)
        document.getElementById('injEventsResultClose')?.click();
      document.getElementById('injEventsClose')?.click();
    }
    const performance=document.getElementById('performanceTimelineView');
    if(performance&&!performance.hidden)
      document.getElementById('closePerformanceTimelineButton')?.click();
  }
  function navigate(id,scrollButton=false){
    if(!isMarket())return;
    const item=destinations.find(x=>x.id===id);
    if(!item)return;
    if(modalPending&&modalOpen()){
      if(id!==selected){
        dismissNativeView();
        window.setTimeout(()=>{if(isMarket())navigate(id,scrollButton)},240);
      }
      return;
    }
    updateSelection(id,scrollButton);
    registerActivity();
    if(item.entry||item.page){
      modalPending=false;
      content.hidden=false;
      showPage(item);
      return;
    }
    // Use the original launchers, keeping all wallet, market and event logic.
    // After closing their immersive view, the Market rail restores the
    // previously displayed Global Market or Global Crypto without reloading.
    modalPending=true;
    modalWasOpened=false;
    const launcher=document.getElementById(item.launcher);
    if(item.id==='events')launcher?.click();
    else window.INJ_MARKET_OPEN_NATIVE?.(item.id);
    requestAnimationFrame(()=>{
      if(!modalPending)return;
      if(modalOpen())modalWasOpened=true;
      else{
        modalPending=false;
        updateSelection(lastMarketEntry,false);
      }
    });
  }
  frame.addEventListener('load',()=>{
    if(!currentUrl)return;
    try{
      if(frame.contentWindow.location.pathname!==new URL(currentUrl).pathname)return;
      if(frame.src!==currentUrl)return;
    }catch(_){return}
    // These are embedded destinations inside Market, not independent
    // standalone screens: remove only their legacy Home/Back button.
    try{
      const inner=frame.contentDocument;
      if(inner&&!inner.getElementById('injMarketEmbeddedNoBack')){
        const style=inner.createElement('style');
        style.id='injMarketEmbeddedNoBack';
        style.textContent='#marketBack,#liveChartsBack,#bookBack{display:none!important;visibility:hidden!important;pointer-events:none!important}';
        (inner.head||inner.documentElement).appendChild(style);
      }
    }catch(_){}
    content.classList.add('is-ready');
    // Embedded charts keep the indicator/focus actions inside the timeframe rail.
    try{
      const inner=frame.contentDocument;
      if(inner?.documentElement.dataset.injPage==='live-charts'){
        inner.documentElement.dataset.injMarketEmbedded='true';
        const bar=inner.getElementById('timeframeBar');
        if(bar&&!bar.querySelector('.market-embedded-chart-actions')){
          const actions=inner.createElement('span');
          actions.className='market-embedded-chart-actions';
          for(const id of ['indicatorToggle','focusToggle']){
            const control=inner.getElementById(id);
            if(control)actions.appendChild(control);
          }
          bar.appendChild(actions);
        }
      }
    }catch(_){}
    // Fallback for suspended iOS WebViews that temporarily miss quote events.
    clearInterval(quoteFallbackTimer);
    quoteFallbackTimer=0;
    if(selected==='charts'){
      const syncQuote=()=>{
        if(!isMarket()||selected!=='charts'||frame.contentDocument?.documentElement.dataset.injPage!=='live-charts')return;
        try{
          const txt=frame.contentDocument?.getElementById('headerLivePrice')?.textContent||'';
          const value=Number(txt.replace(/[^\d.]/g,''));
          if(value>0){
            lastLivePrice=value;
            lastLivePriceAt=Date.now();
            renderMarketQuote(value);
          }
        }catch(_){}
      };
      syncQuote();
      quoteFallbackTimer=window.setInterval(syncQuote,1500);
    }
    scheduleLayoutUpdate();
    // Standalone charts and book already have a Home control; keep its click
    // inside the parent tab instead of following iframe history/back.
    for(const id of ['liveChartsBack','bookBack']){
      frame.contentDocument?.getElementById(id)?.addEventListener('click',event=>{
        event.preventDefault();event.stopImmediatePropagation();
        window.INJ_BOTTOM_NAV?.select('home');
      },true);
    }
    refreshLanguage();
  });
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==frame.contentWindow)return;
    if(event.data?.type==='injnode:market:chart-price'&&selected==='charts'){
      const value=Number(event.data.value);
      if(Number.isFinite(value)&&value>0){
        lastLivePrice=value;
        lastLivePriceAt=Date.now();
        renderMarketQuote(value);
      }
      return;
    }
    if(['injnode:market:home','injnode:section:home'].includes(event.data?.type))
      window.INJ_BOTTOM_NAV?.select('home');
  });
  function syncTab(){
    const now=isMarket();
    backdrop.hidden=!now;
    panel.hidden=!now;
    head.hidden=!now;
    panel.setAttribute('aria-hidden',String(!now));
    if(now&&!wasMarket){
      root.dataset.injMarketChrome='shown';
      startDailyQuote();
      lastMarketEntry='crypto';
      modalPending=false;
      updateSelection('crypto',false);
      showPage(destinations[0]);
    }else if(!now&&wasMarket){
      clearInterval(quoteFallbackTimer);
      quoteFallbackTimer=0;
      stopDailyQuote();
      root.removeAttribute('data-inj-market-chrome');
      modalPending=false;
      content.classList.remove('is-ready');
      currentUrl='';
      frame.removeAttribute('src'); // release market polling while outside Market
    }
    wasMarket=now;
  }
  // Switching bottom destinations changes only the tab and not browser
  // history. Re-entering Market opens the first destination every time.
  const rootObserver=new MutationObserver(syncTab);
  rootObserver.observe(root,{attributes:true,attributeFilter:['data-inj-home-tab']});
  const modalObserver=new MutationObserver(()=>{
    if(!modalPending)return;
    if(modalOpen()){modalWasOpened=true;return}
    if(modalWasOpened){
      modalPending=false;
      modalWasOpened=false;
      updateSelection(lastMarketEntry,false);
    }
  });
  modalObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
  for(const id of ['injMarketEventsOverlay','performanceTimelineView']){
    const element=document.getElementById(id);
    if(element)modalObserver.observe(element,{attributes:true,attributeFilter:['hidden','class']});
  }
  // Changing one of the five primary destinations must also close native
  // Market overlays, otherwise Performance could remain painted above Home.
  dock.addEventListener('click',event=>{
    const tab=event.target.closest('[data-inj-tab]');
    if(!tab||!isMarket())return;
    if(tab.dataset.injTab!=='mercato'){
      if(modalOpen())dismissNativeView();

    }else if(!modalOpen())navigate('crypto',false);
  },true);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)return;
    if(isMarket())void refreshDailyQuote();
  });
  window.addEventListener('injnode:languagechange',refreshLanguage);
  window.addEventListener('storage',event=>{if(event.key==='inj_node_language_v1')refreshLanguage()});
  window.addEventListener('pageshow',()=>{refreshLanguage();syncTab()});
  window.INJ_MARKET_TAB={select:navigate,active:()=>selected};
  refreshLanguage();
  syncTab();
})();