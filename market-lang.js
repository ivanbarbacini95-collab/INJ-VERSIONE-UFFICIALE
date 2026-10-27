/* v6 — market view language and in-app return, independent from wallet app. */
(() => {
  'use strict';
  const labels = {
    home: ['Torna alla Home', 'Back to Home'],
    heading: ['Mercato', 'Market'],
    subheading: ['Mercato crypto', 'Crypto Market'],
    globalCap: ['MARKET CAP GLOBALE', 'GLOBAL MARKET CAP'],
    globalVolume: ['VOLUME 24H GLOBALE', 'GLOBAL 24H VOLUME'],
    volumeScopeHint: ['Volume di scambio delle criptovalute nelle ultime 24 ore, dalla panoramica globale CoinGecko.', 'Cryptocurrency trading volume over 24 hours from CoinGecko global market statistics.'],
    dominance: ['DOMINANZA BTC', 'BTC DOMINANCE'],
    tickerGlobalCap: ['CAP CRYPTO','CRYPTO CAP'],
    tickerCapChange: ['CAP 24H','CAP 24H'],
    tickerGlobalVolume: ['VOLUME 24H','24H VOLUME'],
    tickerBtcDominance: ['BTC DOM','BTC DOM'],
    tickerEthDominance: ['ETH DOM','ETH DOM'],
    tickerActive: ['CRYPTO ATTIVE','ACTIVE CRYPTOS'],
    tickerBreadth: ['TOP 200 IN RIALZO','TOP 200 UP'],
    tickerTopVolume: ['VOLUME TOP 200','TOP 200 VOLUME'],
    volumeGlobalNote: ['Tutte le criptovalute monitorate dalla fonte','All cryptos covered by the source'],
    cap24Note: ['Variazione capitalizzazione · 24H','Market cap change · 24H'],
    dominanceEthNote: ['DOMINANZA ETH','ETH DOMINANCE'],
    overview: ['Panoramica mercato', 'Market overview'],
    search: ['Cerca nome o simbolo', 'Search name or symbol'],
    show: ['Mostra criptovalute', 'Show cryptocurrencies'],
    direction: ['Filtra andamento', 'Filter performance'],
    all: ['Tutte', 'All'],
    up: ['In rialzo 24H', 'Up 24H'],
    down: ['In ribasso 24H', 'Down 24H'],
    currency: ['Cambia valuta', 'Change currency'],
    refresh: ['Aggiorna', 'Refresh'],
    chart: ['Grafico', 'Chart'],
    chartTime: ['Periodo grafico', 'Chart period'],
    asset: ['Asset', 'Asset'],
    price: ['Prezzo', 'Price'],
    marketcap: ['Market Cap', 'Market Cap'],
    volume: ['Volume 24H', '24H Volume'],
    graphNote7: ['Grafici 7D sulla lista · clicca una crypto per i dettagli', '7D charts in the list · tap a crypto for details'],
    graphNoteOther: ['Per {periodo} apri una crypto per il grafico storico', 'Open a crypto for the {periodo} historical chart'],
    noResults: ['Nessun risultato', 'No results'],
    noMarket: ['Mercato non disponibile. Riprova tra poco.', 'Market unavailable. Try again shortly.'],
    loading: ['Caricamento dati di mercato…', 'Loading market data…'],
    connecting: ['Connessione mercato…', 'Connecting to market…'],
    connectingCg: ['Connessione CoinGecko…', 'Connecting to CoinGecko…'],
    updating: ['Aggiornamento…', 'Updating…'],
    retry: ['riprova', 'retry'],
    timeout: ['Timeout API', 'API timeout'],
    limit: ['Limite richieste API raggiunto', 'API rate limit reached'],
    empty: ['Risposta vuota', 'Empty response'],
    chartOpen: ['Apri grafico ', 'Open chart for '],
    open: ['Apri ↗', 'Open ↗'],
    rising: ['Crypto in rialzo / ribasso nelle Top 200', 'Rising / falling coins in Top 200'],
    updated: ['CoinGecko · ultimo aggiornamento ', 'CoinGecko · last updated '],
    nontick: [' · non tick-by-tick', ' · not tick-by-tick'],
    realtime: ['● LIVE prezzi (', '● LIVE prices ('],
    streamSuffix: [' asset) · altri CoinGecko ', ' assets) · others via CoinGecko '],
    connectingStream: [' · connessione streaming in corso', ' · connecting to price stream'],
    details: ['Chiudi dettagli', 'Close details'],
    chartLoading: ['Caricamento grafico ', 'Loading chart '],
    chartUnavailable: ['Grafico storico non disponibile', 'Historical chart unavailable'],
    historical: ['Storico ', 'History '],
    historicalTail: [' · CoinGecko · frequenza definita dalla fonte', ' · CoinGecko · source-defined update rate'],
    apiLimits: [' (possibili limitazioni del piano gratuito)', ' (free tier limits may apply)'],
    provider: ['Dati di mercato forniti da CoinGecko', 'Market data provided by CoinGecko']
  };
  let current = 'it';
  function t(key, vars) {
    let raw = labels[key]?.[current === 'en' ? 1 : 0] || key;
    if (vars) for (const [name, value] of Object.entries(vars)) raw = raw.replaceAll('{' + name + '}', value);
    return raw;
  }
  function apply(l) {
    current = l === 'en' ? 'en' : 'it';
    document.documentElement.lang = current;
    document.title = 'INJ NODE | ' + t('heading');
    const byId = (id, prop, text) => { const el = document.getElementById(id); if (el) el[prop] = text; };
    byId('marketTitle','textContent',t('heading'));
    byId('globalVolume','title',t('volumeScopeHint'));
    byId('marketHeading','textContent',t('subheading'));
    byId('marketBack','title',t('home'));
    byId('marketBack','ariaLabel',t('home'));
    byId('search','placeholder',t('search'));
    byId('search','ariaLabel',t('search'));
    byId('scope','ariaLabel',t('show'));
    byId('direction','ariaLabel',t('direction'));
    byId('currency','title',t('currency'));
    byId('refresh','title',t('refresh'));
    byId('ranges','ariaLabel',t('chartTime'));
    byId('closeDetail','ariaLabel',t('details'));
    const overview = document.querySelector('.overview');
    if (overview) overview.setAttribute('aria-label',t('overview'));
    const cards = Array.from(document.querySelectorAll('.overview article small'));
    [t('globalCap'),t('globalVolume'),t('dominance'),'TOP 200 · 24H'].forEach((v,i)=>{if(cards[i])cards[i].textContent=v;});
    const opts = document.querySelectorAll('#direction option');
    [t('all'),t('up'),t('down')].forEach((v,i)=>{if(opts[i])opts[i].textContent=v;});
    const graph = document.querySelector('.graphbar>span'); if (graph) graph.textContent=t('chart');
    const th = document.querySelectorAll('thead th');
    if(th[1]?.querySelector('button'))th[1].querySelector('button').textContent=t('asset');
    if(th[2]?.querySelector('button'))th[2].querySelector('button').textContent=t('price');
    if(th[8]?.querySelector('button'))th[8].querySelector('button').textContent=t('volume');
    if(th[9]?.firstChild)th[9].firstChild.nodeValue=t('chart')+' ';
    const placeholder=document.querySelector('#rows .empty');if(placeholder)placeholder.textContent=t('loading');
    const status=document.getElementById('status');if(status && !window.marketOnLanguageChange)status.textContent=t('connecting');
    const foot=document.getElementById('foot');if(foot && !window.marketOnLanguageChange)foot.textContent=t('provider');
    if (typeof window.marketOnLanguageChange === 'function') window.marketOnLanguageChange();
  }
  window.MARKET_I18N = {t,apply,getLanguage:()=>current};
  const init = () => {
    document.documentElement.classList.toggle('market-embedded', window.parent !== window);
    let saved;try{saved = localStorage.getItem('inj_node_language_v1')}catch(_){}
    apply(new URLSearchParams(location.search).get('lang') || saved);
    const back = document.getElementById('marketBack');
    back?.addEventListener('click', () => {
      if (window.parent !== window) {
        try {
          window.parent.postMessage({type:'injnode:market:home'},location.origin==='null'?'*':location.origin);
          return;
        } catch(_) { /* use standalone fallback */ }
      }
      location.replace('./index.html');
    });
    window.addEventListener('message',event=>{
      if(event.source !== window.parent) return;
      if(location.origin !== 'null' && event.origin !== location.origin) return;
      if(event.data?.type === 'injnode:market:language') apply(event.data.language);
    });
    window.addEventListener('storage',event=>{
      if(event.key==='inj_node_language_v1') apply(event.newValue);
    });
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
