/* INJ Node · native Global Markets v2.
 * In-house heatmap and world map UI. Quotes via same-origin /api/global-markets.
 * No TradingView scripts/elements/iframes, no fabricated prices or percentages.
 */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const root=$('injWorldMarket');if(!root)return;
const en=()=>document.documentElement.lang==='en';
const tr=(it,english)=>en()?english:it;
const ids=['indices','sectors','stocks','etf','forex','commodities','bonds','crypto'];
const fallbackCatalog={
 indices:[['sp500','S&P 500','^GSPC'],['nasdaq','NASDAQ','^IXIC'],['dow','Dow Jones','^DJI'],['russell','Russell 2000','^RUT'],['stoxx','Euro Stoxx 50','^STOXX50E'],['dax','DAX','^GDAXI'],['cac','CAC 40','^FCHI'],['ftse','FTSE 100','^FTSE'],['nikkei','Nikkei 225','^N225'],['hangseng','Hang Seng','^HSI'],['nifty','Nifty 50','^NSEI'],['asx','ASX 200','^AXJO'],['bovespa','Ibovespa','^BVSP'],["ndx","Nasdaq 100","^NDX"],["vix","VIX Volatilità","^VIX"],["ibex","IBEX 35","^IBEX"],["smi","Swiss Market Index","^SSMI"],["shanghai","Shanghai Composite","000001.SS"]],
 sectors:[['technology','Tecnologia','XLK'],['finance','Finanza','XLF'],['energy','Energia','XLE'],['healthcare','Sanità','XLV'],['industrial','Industria','XLI'],['consumer','Consumi discrezionali','XLY'],['staples','Beni essenziali','XLP'],['utilities','Utilities','XLU'],['realestate','Immobiliare','XLRE'],['materials','Materiali','XLB'],['communications','Comunicazioni','XLC'],["semis","Semiconduttori","SMH"],["biotech","Biotecnologie","XBI"],["cleanenergy","Energia pulita","ICLN"],["aerospace","Difesa e aerospazio","ITA"],["banks","Banche regionali","KRE"]],
 stocks:[['aapl','Apple','AAPL'],['msft','Microsoft','MSFT'],['nvda','NVIDIA','NVDA'],['jpm','JPMorgan','JPM'],['bac','Bank of America','BAC'],['xom','ExxonMobil','XOM'],['cvx','Chevron','CVX'],['lly','Eli Lilly','LLY'],['jnj','Johnson & Johnson','JNJ'],['cat','Caterpillar','CAT'],['ge','GE Aerospace','GE'],['amzn','Amazon','AMZN'],['tsla','Tesla','TSLA'],['wmt','Walmart','WMT'],['cost','Costco','COST'],['nee','NextEra Energy','NEE'],['duk','Duke Energy','DUK'],['googl','Alphabet','GOOGL'],['meta','Meta','META'],['amt','American Tower','AMT'],['lin','Linde','LIN'],['fcx','Freeport-McMoRan','FCX'],["adbe","Adobe","ADBE"],["crm","Salesforce","CRM"],["gs","Goldman Sachs","GS"],["v","Visa","V"],["slb","SLB","SLB"],["abbv","AbbVie","ABBV"],["de","Deere","DE"],["hd","Home Depot","HD"],["pg","Procter & Gamble","PG"],["pld","Prologis","PLD"],["nue","Nucor","NUE"],["nflx","Netflix","NFLX"],["orcl","Oracle","ORCL"],["avgo","Broadcom","AVGO"],["ms","Morgan Stanley","MS"],["blk","BlackRock","BLK"],["cop","ConocoPhillips","COP"],["eog","EOG Resources","EOG"],["mrk","Merck","MRK"],["unh","UnitedHealth","UNH"],["hon","Honeywell","HON"],["ups","UPS","UPS"],["mcd","McDonald's","MCD"],["nke","Nike","NKE"],["ko","Coca-Cola","KO"],["pep","PepsiCo","PEP"],["so","Southern Company","SO"],["exc","Exelon","EXC"],["eqix","Equinix","EQIX"],["o","Realty Income","O"],["shw","Sherwin-Williams","SHW"],["apd","Air Products","APD"],["dis","Walt Disney","DIS"],["t","AT&T","T"],["tmus","T-Mobile US","TMUS"]],
 etf:[['spy','S&P 500 ETF','SPY'],['qqq','Nasdaq 100 ETF','QQQ'],['iwm','Small Caps ETF','IWM'],['efa','Developed Markets','EFA'],['eem','Emerging Markets','EEM'],['tlt','Long Treasury','TLT'],['gld','Gold ETF','GLD'],['vnq','Real Estate ETF','VNQ'],["voo","S&P 500 Vanguard","VOO"],["vti","Total Stock Market","VTI"],["dia","Dow Jones ETF","DIA"],["schd","Dividend Equity","SCHD"],["hyg","High Yield ETF","HYG"],["iau","Gold Trust","IAU"]],
 forex:[['eurusd','EUR / USD','EURUSD=X'],['gbpusd','GBP / USD','GBPUSD=X'],['usdjpy','USD / JPY','JPY=X'],['usdchf','USD / CHF','CHF=X'],['audusd','AUD / USD','AUDUSD=X'],['usdcny','USD / CNY','CNY=X'],['usdinr','USD / INR','INR=X'],["eurgbp","EUR / GBP","EURGBP=X"],["eurjpy","EUR / JPY","EURJPY=X"],["nzdusd","NZD / USD","NZDUSD=X"],["usdcad","USD / CAD","CAD=X"],["usdsek","USD / SEK","SEK=X"]],
 commodities:[['gold','Oro','GC=F'],['silver','Argento','SI=F'],['wti','Petrolio WTI','CL=F'],['brent','Petrolio Brent','BZ=F'],['gas','Gas naturale','NG=F'],['copper','Rame','HG=F'],['corn','Mais','ZC=F'],["platinum","Platino","PL=F"],["palladium","Palladio","PA=F"],["wheat","Grano","ZW=F"],["soybeans","Soia","ZS=F"],["sugar","Zucchero","SB=F"]],
 bonds:[['us10y','USA 10Y rendimento','^TNX'],['us30y','USA 30Y rendimento','^TYX'],['bnd','Bond aggregate ETF','BND'],['ief','Treasury 7-10Y ETF','IEF'],['shy','Treasury 1-3Y ETF','SHY'],['lqd','Corporate IG ETF','LQD'],['hyg','High Yield ETF','HYG'],['tip','Inflation-linked ETF','TIP'],["us5y","USA 5Y rendimento","^FVX"],["us13w","USA 13 settimane","^IRX"],["agg","US Aggregate Bond","AGG"],["emb","Emerging Market Bond","EMB"],["mub","Municipal Bond","MUB"]]
};

const titles={
 indices:['Mercati mondiali','World markets'],sectors:['Settori azionari','Stock market sectors'],
 stocks:['Azioni per settore','Stocks by sector'],etf:['ETF e asset class','ETFs & asset classes'],
 forex:['Valute globali','Global currencies'],commodities:['Materie prime','Commodities'],
 bonds:['Obbligazioni e tassi','Bonds & rates'],crypto:['Criptovalute','Cryptocurrencies']
};
const navNames={
 indices:['Mondo','World'],sectors:['Settori','Sectors'],stocks:['Azioni','Stocks'],
 etf:['ETF','ETFs'],forex:['Forex','Forex'],commodities:['Materie','Commodities'],
 bonds:['Bond','Bonds'],crypto:['Crypto','Crypto']
};
const hints={
 indices:['Indici rappresentativi delle principali borse mondiali','Representative indices of major global exchanges'],
 sectors:['11 settori S&P 500 e 5 ETF tematici','11 S&P 500 sectors and 5 thematic ETFs'],
 stocks:['Società raggruppate per attività economica','Companies grouped by economic activity'],
 etf:['Esposizioni a indici, aree geografiche e asset class','Index, geographical and asset-class exposures'],
 forex:['Coppie valutarie principali','Major currency pairs'],
 commodities:['Contratti futures rappresentativi','Representative futures contracts'],
 bonds:['Rendimenti Treasury USA e ETF obbligazionari','US Treasury yields and bond ETFs'],
 crypto:['Prezzi dal mercato crypto già utilizzato da INJ Node','Prices from INJ Node’s existing crypto market feed']
};
const sectors=[
 ['technology','Tecnologia','Technology',['aapl','msft','nvda','adbe','crm','orcl','avgo']],
 ['finance','Finanza','Financials',['jpm','bac','gs','v','ms','blk']],
 ['energy','Energia','Energy',['xom','cvx','slb','cop','eog']],
 ['healthcare','Sanità','Healthcare',['lly','jnj','abbv','mrk','unh']],
 ['industrial','Industria','Industrials',['cat','ge','de','hon','ups']],
 ['consumer','Consumi discrezionali','Consumer discretionary',['amzn','tsla','hd','mcd','nke']],
 ['staples','Beni essenziali','Consumer staples',['wmt','cost','pg','ko','pep']],
 ['utilities','Servizi pubblici','Utilities',['nee','duk','so','exc']],
 ['realestate','Immobiliare','Real estate',['amt','pld','eqix','o']],
 ['materials','Materiali','Materials',['lin','fcx','nue','shw','apd']],
 ['communications','Comunicazioni','Communication services',['googl','meta','nflx','dis','t','tmus']]
];
const thematicSectors=[
 ['semis','Semiconduttori','Semiconductors'],
 ['biotech','Biotecnologie','Biotechnology'],
 ['cleanenergy','Energia pulita','Clean energy'],
 ['aerospace','Aerospazio e difesa','Aerospace & defense'],
 ['banks','Banche regionali','Regional banks']
];
const regions=[
 ['America',['sp500','nasdaq','ndx','dow','russell','vix','bovespa']],
 ['Europa / Europe',['stoxx','dax','cac','ftse','ibex','smi']],
 ['Asia / Pacifico',['nikkei','hangseng','nifty','shanghai','asx']]
];
const hotspot=[['sp500',38,-97],['bovespa',-14,-51],['stoxx',51,8],['nifty',23,78],['hangseng',23,114],['nikkei',37,139],['asx',-25,134]];
const quotes=new Map(),updated=new Map(),pending=new Set(),observed=new Set();
const offlineKey='inj_world_quotes_cache_v2';
function definitions(group){
 if(group==='crypto')return [
  ['bitcoin','Bitcoin','BTC'],['ethereum','Ethereum','ETH'],['solana','Solana','SOL'],
  ['binancecoin','BNB','BNB'],['ripple','XRP','XRP'],['hyperliquid','Hyperliquid','HYPE'],
  ['injective-protocol','Injective','INJ'],['avalanche-2','Avalanche','AVAX'],
  ['chainlink','Chainlink','LINK'],['polkadot','Polkadot','DOT'],
  ['cardano','Cardano','ADA'],['dogecoin','Dogecoin','DOGE'],['tron','TRON','TRX'],
  ['sui','Sui','SUI'],['litecoin','Litecoin','LTC'],['stellar','Stellar','XLM'],
  ['monero','Monero','XMR'],['aptos','Aptos','APT']
 ].map(([id,name,symbol])=>({id,name,symbol,price:null,change:null,time:null,currency:'USD'}));
 return (fallbackCatalog[group]||[]).map(([id,name,symbol])=>({id,name,symbol,price:null,change:null,time:null,currency:null}));
}
function restoreQuotes(){
 try{
  const saved=JSON.parse(localStorage.getItem(offlineKey)||'{}');
  for(const group of ids){
   const arr=saved[group]?.quotes;
   if(Array.isArray(arr)&&arr.length&&arr.some(q=>Number.isFinite(q.price)))quotes.set(group,arr);
  }
 }catch(_){}
}
function saveQuotes(){
 const data={};
 for(const [group,arr] of quotes)if(arr.some(q=>Number.isFinite(q.price)))data[group]={quotes:arr,at:Date.now()};
 try{localStorage.setItem(offlineKey,JSON.stringify(data))}catch(_){}
}
restoreQuotes();
let active=false,initialized=false,observer=null,geometryStarted=false,geoReady=false;
let worldPage='indices';
const MAX_AGE=90*1000;
const fmtPercent=n=>Number.isFinite(n)?(n>0?'+':'')+new Intl.NumberFormat(en()?'en-US':'it-IT',{maximumFractionDigits:2,minimumFractionDigits:2}).format(n)+'%':'—';
const fmtValue=(v,currency)=>{
 if(!Number.isFinite(v)||v<=0)return '—';
 const precision=v<1?4:2;
 const formatted=new Intl.NumberFormat(en()?'en-US':'it-IT',{minimumFractionDigits:precision,maximumFractionDigits:precision}).format(v);
 return currency==='USD'?'$'+formatted:currency==='EUR'?'€'+formatted:formatted+(currency?' '+currency:'');
};
const byId=(arr)=>new Map((Array.isArray(arr)?arr:[]).map(x=>[x.id,x]));
const englishNames={
 indices:{vix:'VIX Volatility',ndx:'Nasdaq 100',ibex:'IBEX 35',smi:'Swiss Market Index',shanghai:'Shanghai Composite'},
 commodities:{gold:'Gold',silver:'Silver',wti:'WTI Crude',brent:'Brent Crude',gas:'Natural gas',copper:'Copper',corn:'Corn',platinum:'Platinum',palladium:'Palladium',wheat:'Wheat',soybeans:'Soybeans',sugar:'Sugar'},
 bonds:{us10y:'US Treasury 10Y yield',us30y:'US Treasury 30Y yield',us5y:'US Treasury 5Y yield',us13w:'US Treasury 13-week yield'},
 forex:{},etf:{}
};
const quotedName=(group,q)=>en()?(englishNames[group]?.[q.id]||q.name):q.name;
const stamp=t=>{
 if(!Number.isFinite(t)||t<=0)return '';
 const date=new Date(t*1000);
 if(!Number.isFinite(date.getTime()))return '';
 return date.toLocaleString(en()?'en-GB':'it-IT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Rome'});
};
const state=x=>!Number.isFinite(x?.change)?'neutral':x.change>0?'up':x.change<0?'down':'neutral';
function el(tag,cls,text){
 const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;
}
function quoteTile(q,compact=false){
 const tile=el('article','inj-wm-tile '+state(q)+(compact?' compact':''));
 if(Number.isFinite(q.change))tile.style.setProperty('--inj-wm-strength',Math.max(8,Math.min(55,8+Math.abs(q.change)*8)).toFixed(1)+'%');
 const head=el('div','inj-wm-tile-head');
 const ticker=el('strong','inj-wm-symbol',q.symbol||q.name||'—');
 const change=el('strong','inj-wm-change',fmtPercent(q.change));
 // Keep the 24H percent beside the ticker rather than at the far edge.
 head.append(ticker,change);
 const value=el('div','inj-wm-tile-values');
 value.append(el('span','inj-wm-price',fmtValue(q.price,q.currency)));
 tile.append(head,value);
 // Full name, source and timestamp remain available on long press.
 tile.title=[q.name||q.symbol||'',
  q.time?tr('Ultima quotazione: ','Last quote: ')+stamp(q.time):'',
  q.source?tr('Fonte: ','Source: ')+q.source:''].filter(Boolean).join(' · ');
 return tile;
}
const validQuote=q=>Number.isFinite(q?.price)&&q.price>0;
const statsOf=arr=>{
 const available=arr.filter(x=>Number.isFinite(x.change));
 const up=available.filter(x=>x.change>0).length;
 return {total:available.length,up,down:available.filter(x=>x.change<0).length};
};
function renderSummary(group,arr){
 const status=$('injWorld'+group+'Status');if(!status)return;
 const good=arr.filter(validQuote),missing=arr.filter(q=>!validQuote(q)).map(q=>q.symbol||q.name||q.id);
 const n=statsOf(good),count=good.length+'/'+arr.length+' '+tr('quotazioni','quotes');
 const latest=Math.max(0,...good.map(q=>Number(q.time)||0));
 status.title=missing.length?tr('Non disponibili: ','Unavailable: ')+missing.join(', '):'';
 status.textContent=count+' · '+n.up+' '+tr('in rialzo','up')+' · '+n.down+' '+tr('in ribasso','down')+
  ' · '+tr('ultimo dato ','last quote ')+(latest?stamp(latest):tr('in attesa','pending'));
}
/* The U.S. trading-session clock is independent of last-quote timestamps.
   America/New_York handles the 1-2 week U.S./European DST mismatches. */
const usFullHolidays=new Set([
 '2026-01-01','2026-01-19','2026-02-16','2026-04-03','2026-05-25',
 '2026-06-19','2026-07-03','2026-09-07','2026-11-26','2026-12-25',
 '2027-01-01','2027-01-18','2027-02-15','2027-03-26','2027-05-31',
 '2027-06-18','2027-07-05','2027-09-06','2027-11-25','2027-12-24'
]);
const usEarlyClose=new Set(['2026-11-27','2026-12-24','2027-11-26']);
const nyClock=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',
 year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',
 hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
function usStockSession(date=new Date()){
 const data=Object.fromEntries(nyClock.formatToParts(date).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 const day=data.year+'-'+data.month+'-'+data.day;
 const minutes=Number(data.hour)*60+Number(data.minute);
 const closed=data.weekday==='Sat'||data.weekday==='Sun'||usFullHolidays.has(day);
 const end=usEarlyClose.has(day)?13*60:16*60;
 const kind=closed?'closed':minutes>=570&&minutes<end?'open':
  minutes<570&&minutes>=240?'pre':minutes>=end&&minutes<1200?'after':'closed';
 return {kind,day,time:data.hour+':'+data.minute,early:usEarlyClose.has(day)};
}
function marketDateLabel(seconds){
 if(!Number.isFinite(seconds)||seconds<=0)return '';
 return stamp(seconds);
}
function ensureUsSessionHeader(){
 const hero=$('injWorldMarket')?.querySelector('.inj-wm-hero');
 if(!hero)return;
 let line=$('injWorldUsSessionLine');
 if(!line){
  line=el('div','inj-wm-live-session-line');
  line.id='injWorldUsSessionLine';
  const badge=el('span','inj-wm-us-session-badge');
  badge.id='injWorldUsSessionBadge';
  const quote=el('small','inj-wm-us-quote-age');
  quote.id='injWorldUsQuoteAge';
  line.append(badge,quote);
  hero.append(line);
 }
}
function updateUsSessionUI(){
 if(!initialized)return;
 ensureUsSessionHeader();
 const us=usStockSession();
 const label=us.kind==='open'?tr('USA · APERTO','US · OPEN'):
  us.kind==='pre'?tr('USA · PRE-MARKET','US · PRE-MARKET'):
  us.kind==='after'?tr('USA · POST-MARKET','US · AFTER HOURS'):
  tr('USA · CHIUSO','US · CLOSED');
 const badge=$('injWorldUsSessionBadge');
 if(badge){
  badge.textContent=label;
  badge.dataset.session=us.kind;
  badge.title=tr('Sessione ordinaria NYSE/Nasdaq: 09:30–','NYSE/Nasdaq regular session: 09:30–')+(us.early?'13:00':'16:00')+' ET · '+us.time+' ET';
 }
 const stocks=quotes.get('stocks')||[];
 const indices=quotes.get('indices')||[];
 const source=stocks.length?stocks:indices.filter(x=>['sp500','nasdaq','dow','russell'].includes(x.id));
 const latest=Math.max(0,...source.filter(x=>Number.isFinite(x.price)&&x.price>0).map(x=>Number(x.time)||0));
 const age=Math.max(0,Date.now()/1000-latest);
 const ageLabel=$('injWorldUsQuoteAge');
 if(ageLabel){
  ageLabel.textContent=latest?
   (age>1200?tr('Quotazioni USA ritardate · ','US quotes delayed · '):tr('Ultima quotazione USA · ','Last US quote · '))+marketDateLabel(latest):
   tr('Quotazioni USA in attesa della fonte','Awaiting US price source');
  ageLabel.dataset.stale=String(!latest||age>1200);
 }
 for(const region of root.querySelectorAll('[data-us-session-region]')){
  region.textContent=label;
  region.dataset.session=us.kind;
 }
 updateExchangeBadges();
}


/* Trading hours: exchange-local regular sessions, independent of quote age
   or solar lighting. Local holidays outside the explicit calendars may vary. */
const exchangeSettings={
 us:{tz:'America/New_York',slots:[[570,960]]},
 eu:{tz:'Europe/Paris',slots:[[540,1050]]},
 uk:{tz:'Europe/London',slots:[[480,990]]},
 ch:{tz:'Europe/Zurich',slots:[[540,1050]]},
 br:{tz:'America/Sao_Paulo',slots:[[600,1020]]},
 in:{tz:'Asia/Kolkata',slots:[[555,930]]},
 hk:{tz:'Asia/Hong_Kong',slots:[[570,720],[780,960]]},
 jp:{tz:'Asia/Tokyo',slots:[[540,690],[750,930]]},
 au:{tz:'Australia/Sydney',slots:[[600,960]]},
 cn:{tz:'Asia/Shanghai',slots:[[570,690],[780,900]]},
 fx:{tz:'America/New_York',slots:[]},
 futures:{tz:'America/New_York',slots:[]},
 crypto:{tz:'Etc/UTC',slots:[]}
};
const sessionFmt=new Map(),sessionCache=new Map();
const supportedHolidays={
 jp:new Set(['2026-11-03','2026-11-23','2026-12-31','2027-01-01','2027-01-11','2027-02-11','2027-02-23','2027-04-29','2027-05-03','2027-05-04','2027-05-05','2027-11-03','2027-11-23','2027-12-31']),
 eu:new Set(['2026-12-25','2027-01-01','2027-03-26','2027-03-29','2027-12-25']),
 uk:new Set(['2026-12-25','2026-12-28','2027-01-01','2027-03-26','2027-03-29','2027-12-27','2027-12-28']),
 ch:new Set(['2026-12-25','2026-12-31','2027-01-01','2027-03-26','2027-03-29','2027-12-24','2027-12-31']),
 hk:new Set(['2026-12-25','2027-01-01','2027-02-08','2027-02-09','2027-02-10','2027-12-27']),
 cn:new Set(['2027-01-01','2027-02-08','2027-02-09','2027-02-10']),
 au:new Set(['2026-12-25','2026-12-28','2027-01-01','2027-01-26','2027-03-26','2027-03-29','2027-12-27','2027-12-28']),
 in:new Set(['2026-12-25','2027-01-26','2027-08-15','2027-10-02']),
 br:new Set(['2026-12-25','2027-01-01','2027-04-21','2027-05-01','2027-09-07','2027-10-12','2027-11-02','2027-11-15','2027-12-25'])
};
function localSessionClock(key,at){
 const cfg=exchangeSettings[key]||exchangeSettings.us;
 if(!sessionFmt.has(cfg.tz)){
  sessionFmt.set(cfg.tz,new Intl.DateTimeFormat('en-US',{
   timeZone:cfg.tz,year:'numeric',month:'2-digit',day:'2-digit',
   weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'
  }));
 }
 const x=Object.fromEntries(sessionFmt.get(cfg.tz).formatToParts(new Date(at)).filter(v=>v.type!=='literal').map(v=>[v.type,v.value]));
 return {date:x.year+'-'+x.month+'-'+x.day,weekday:x.weekday,minutes:Number(x.hour)*60+Number(x.minute)};
}
function exchangeOpenAt(key,at){
 if(key==='crypto')return true;
 const local=localSessionClock(key,at),dow=local.weekday,m=local.minutes;
 if(key==='fx')return dow==='Sun'?m>=1020:dow==='Fri'?m<1020:dow!=='Sat';
 if(key==='futures')return dow==='Sun'?m>=1080:dow==='Fri'?m<1020:dow!=='Sat'&&(m<1020||m>=1080);
 if(dow==='Sat'||dow==='Sun')return false;
 if(key==='us'&&(usFullHolidays.has(local.date)))return false;
 if(supportedHolidays[key]?.has(local.date))return false;
 const end=key==='us'&&usEarlyClose.has(local.date)?780:null;
 return (exchangeSettings[key]?.slots||[]).some(([start,finish])=>m>=start&&m<(end??finish));
}
function marketForAsset(group,id){
 if(group==='crypto')return 'crypto';
 if(group==='forex')return 'fx';
 if(group==='commodities')return 'futures';
 if(group!=='indices')return 'us'; // listed sector proxies, equities, US ETFs and bond ETFs
 const indexExchange={
  sp500:'us',nasdaq:'us',dow:'us',russell:'us',vix:'us',ndx:'us',
  stoxx:'eu',dax:'eu',cac:'eu',ftse:'uk',ibex:'eu',smi:'ch',
  bovespa:'br',nifty:'in',hangseng:'hk',nikkei:'jp',asx:'au',shanghai:'cn'
 };
 return indexExchange[id]||'us';
}
function nextSessionChange(key,now=Date.now()){
 if(key==='crypto')return {open:true,next:null};
 const cache=sessionCache.get(key);
 if(cache&&now-cache.at<45000)return cache.result;
 const open=exchangeOpenAt(key,now);
 let future=null;
 const STEP=15*60000;
 for(let d=STEP;d<=10*86400000;d+=STEP){
  const time=now+d;
  if(exchangeOpenAt(key,time)!==open){
   let low=time-STEP,high=time;
   while(high-low>60000){
    const mid=Math.floor((low+high)/120000)*60000;
    if(mid<=low)break;
    if(exchangeOpenAt(key,mid)===open)low=mid;else high=mid;
   }
   future=high;
   break;
  }
 }
 const result={open,next:future};
 sessionCache.set(key,{at:now,result});
 return result;
}
function nextClockLabel(at){
 if(!at)return '—';
 return new Intl.DateTimeFormat(en()?'en-GB':'it-IT',{
  timeZone:'Europe/Rome',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'
 }).format(new Date(at));
}
function ensureExchangeBadge(group){
 const section=$('injWorldSection'+group);
 const head=section?.querySelector('.inj-wm-section-head');
 if(!head)return null;
 let badge=head.querySelector('.inj-wm-exchange-state');
 if(!badge){
  badge=el('div','inj-wm-exchange-state');
  badge.setAttribute('aria-live','off');
  head.append(badge);
 }
 return badge;
}
function updateExchangeBadges(){
 if(!initialized||!active)return;
 const now=Date.now();
 for(const group of ids){
  const badge=ensureExchangeBadge(group);
  if(!badge)continue;
  const keys=[...new Set(definitions(group).map(q=>marketForAsset(group,q.id)))];
  const states=keys.map(key=>nextSessionChange(key,now));
  const opened=states.filter(x=>x?.open).length;
  const allOpen=opened===keys.length,noneOpen=opened===0;
  const future=states.map(x=>x?.next).filter(Number.isFinite).sort((a,b)=>a-b)[0]||null;
  const stateLabel=allOpen?tr('APERTO','OPEN'):noneOpen?tr('CHIUSO','CLOSED'):
   tr('APERTI ','OPEN ')+opened+'/'+keys.length;
  badge.dataset.session=allOpen?'open':noneOpen?'closed':'mixed';
  let detail;
  if(group==='crypto')detail=tr('24 ORE SU 24','24/7');
  else if(!noneOpen)detail=tr('Prossimo cambio ','Next change ')+nextClockLabel(future);
  else detail=tr('Riapre ','Reopens ')+nextClockLabel(future);
  badge.replaceChildren(el('span','inj-wm-session-main',stateLabel),el('small','inj-wm-session-next',detail));
  badge.title=tr('Orari regolari delle borse · festività e chiusure straordinarie possono variare · orari in Italia',
   'Regular exchange hours · holidays and exceptional closures may vary · times in Italy');
 }
 refreshMapSessions();
}
function refreshMapSessions(){
 const now=Date.now(),data=byId(quotes.get('indices')||[]);
 const layer=$('injWorldMapPins');
 if(!layer)return;
 layer.querySelectorAll('[data-market-id]').forEach(pin=>{
  const id=pin.dataset.marketId,key=marketForAsset('indices',id),session=nextSessionChange(key,now),q=data.get(id);
  pin.dataset.marketOpen=String(!!session?.open);
  const open=!!session?.open;
  // Do not pulse on a previous-session or unverified percentage.
  const quoteAge=Number.isFinite(Number(q?.time))&&Number(q?.time)>0?
   now-Number(q.time)*1000:Infinity;
  const verified=Number.isFinite(q?.change)&&quoteAge>=-60000&&quoteAge<2*3600000;
  pin.classList.toggle('up',open&&verified&&q.change>0);
  pin.classList.toggle('down',open&&verified&&q.change<0);
  pin.classList.toggle('neutral',open&&(!verified||q.change===0));
  pin.title=(q?.name||id)+' · '+(open?tr('APERTO','OPEN'):tr('CHIUSO','CLOSED'))+
   (!open&&session?.next?' · '+tr('Riapre ','Reopens ')+nextClockLabel(session.next):'')+
   ' · '+fmtPercent(q?.change);
  pin.setAttribute('aria-label',pin.title);
 });
}

function renderIndices(items){
 const idx=byId(items);const list=$('injWorldIndexRegions');if(!list)return;
 list.replaceChildren();
 regions.forEach(([name,assetIds])=>{
  const group=el('div','inj-wm-region');group.append(el('h4','inj-wm-region-title',en()?name.replace('Europa / Europe','Europe').replace('Asia / Pacifico','Asia / Pacific'):name.replace('Europa / Europe','Europa').replace('Asia / Pacifico','Asia / Pacifico')));
  if(name==='America'){
   const chip=el('small','inj-wm-session-chip');
   chip.setAttribute('data-us-session-region','');
   group.append(chip);
  }
  const cards=el('div','inj-wm-grid indices');
  assetIds.forEach(id=>{const q=idx.get(id);if(validQuote(q))cards.append(quoteTile({...q,name:quotedName('indices',q)},true))});
  group.append(cards);list.append(group);
 });
 renderPins(items);
 renderSummary('indices',items);
 updateUsSessionUI();
}
function renderSectors(items){
 const data=byId(items),rootGrid=$('injWorldSectorGrid');if(!rootGrid)return;
 rootGrid.replaceChildren();
 sectors.forEach(([id,it,english])=>{
  const q=data.get(id)||{id,name:tr(it,english),symbol:''};
  if(!validQuote(q))return;
  const card=quoteTile({...q,name:tr(it,english),symbol:q.symbol},false);
  card.classList.add('inj-wm-sector-card');
  const tag=el('small','inj-wm-proxy',tr('ETF settoriale','Sector ETF'));
  card.append(tag);
  rootGrid.append(card);
 });
 // These are thematic ETF proxies, separate from the eleven official S&P sectors.
 if(thematicSectors.length){
  const title=el('div','inj-wm-subgroup-title',tr('TEMI DI MERCATO · ETF','MARKET THEMES · ETFs'));
  if(thematicSectors.some(([id])=>validQuote(data.get(id))))rootGrid.append(title);
  thematicSectors.forEach(([id,it,english])=>{
   const q=data.get(id)||{id,name:tr(it,english),symbol:''};
   if(!validQuote(q))return;
   const card=quoteTile({...q,name:tr(it,english),symbol:q.symbol},true);
   card.classList.add('inj-wm-theme-card');
   rootGrid.append(card);
  });
 }
 renderSummary('sectors',items);
}
function renderStocks(items){
 const data=byId(items),out=$('injWorldStockGroups');if(!out)return;out.replaceChildren();
 sectors.forEach(([id,it,english,stocks])=>{
  const group=el('section','inj-wm-stock-sector');
  group.append(el('h4','inj-wm-stock-heading',tr(it,english)));
  const grid=el('div','inj-wm-grid stocks');
  stocks.forEach(stock=>{const q=data.get(stock);if(validQuote(q))grid.append(quoteTile(q,true))});
   if(grid.childElementCount)group.append(grid);
   else group.append(el('p','inj-wm-sector-empty',tr('Quotazioni temporaneamente non disponibili per questo settore.','Quotes temporarily unavailable for this sector.')));
   out.append(group);
 });
 renderSummary('stocks',items);
}
function renderPlain(group,items){
 const grid=$('injWorld'+group+'Grid');if(!grid)return;
 grid.replaceChildren();items.filter(validQuote).forEach(item=>grid.append(quoteTile({...item,name:quotedName(group,item)},true)));
 if(group==='bonds'){
  const first=grid.querySelector('.inj-wm-tile');
  if(first){const note=el('small','inj-wm-proxy',tr('Rendimento mostrato come indice ×10','Yield displayed as index ×10'));first.append(note)}
 }
 renderSummary(group,items);
}
function renderGroup(group,items){
 if(group==='indices')renderIndices(items);
 else if(group==='sectors')renderSectors(items);
 else if(group==='stocks')renderStocks(items);
 else renderPlain(group,items);
}
function statusWithRetry(group,message){
 const status=$('injWorld'+group+'Status');if(!status)return;
 status.replaceChildren(document.createTextNode(message+' · '));
 const retry=document.createElement('button');retry.type='button';retry.className='inj-wm-retry';
 retry.textContent=tr('Riprova','Retry');
 retry.setAttribute('aria-label',tr('Riprova caricamento dati: ','Retry loading market data: ')+titles[group][en()?1:0]);
 retry.addEventListener('click',()=>{void loadGroup(group,true)});
 status.append(retry);
}
/* Prefer the direct INJNODE Vercel quote gateway when present. GitHub Pages
   has no serverless runtime, so static GitHub Action snapshots remain fallback. */
let directQuoteGateway='unknown';
async function getCurrentMarketQuotes(group){
 if(directQuoteGateway==='unsupported')return null;
 const ctrl=new AbortController();
 const timeout=setTimeout(()=>ctrl.abort(),25500);
 try{
  const url='./api/global-markets?group='+encodeURIComponent(group)+'&t='+Math.floor(Date.now()/90000);
  const response=await fetch(url,{cache:'no-store',headers:{Accept:'application/json'},signal:ctrl.signal});
  const type=response.headers.get('content-type')||'';
  if(response.status===404||response.status===405||type.indexOf('json')<0){
   directQuoteGateway='unsupported';return null;
  }
  if(!response.ok)return null;
  const result=await response.json();
  if(result?.group!==group||!Array.isArray(result.quotes)||!result.quotes.length)return null;
  directQuoteGateway='supported';
  if(!result.quotes.some(x=>Number.isFinite(x.price)&&x.price>0))return null;
  return result;
 }catch(_){return null}
 finally{clearTimeout(timeout)}
}
let sharedSnapshot=null,sharedSnapshotAt=0,sharedSnapshotPromise=null;
async function getStaticMarketSnapshot(force=false){
 const now=Date.now();
 if(!force&&sharedSnapshot&&now-sharedSnapshotAt<120000)return sharedSnapshot;
 if(sharedSnapshotPromise)return sharedSnapshotPromise;
 sharedSnapshotPromise=(async()=>{
  try{
   const version=Math.floor(Date.now()/90000);
   const response=await fetch('./market-data/global-markets.json?v='+version,{
    cache:'no-store',headers:{Accept:'application/json'}
   });
   if(!response.ok)throw Object.assign(new Error('snapshot unavailable'),{code:response.status});
   if(!(response.headers.get('content-type')||'').includes('json'))
    throw Object.assign(new Error('snapshot not JSON'),{code:503});
   const body=await response.json();
   if(body?.schema!==1||typeof body.groups!=='object'||!body.groups)
    throw Object.assign(new Error('snapshot invalid'),{code:503});
   sharedSnapshot=body;sharedSnapshotAt=Date.now();
   return body;
  }catch(err){
   if(sharedSnapshot)return sharedSnapshot;
   throw err;
  }
 })();
 try{return await sharedSnapshotPromise;}finally{sharedSnapshotPromise=null;}
}
function errorDescription(code){
 if(code===404)return tr('Archivio quotazioni non ancora pubblicato','Market quotes snapshot not published yet');
 if(code===429)return tr('Fonte dati limitata (429)','Data source rate limited (429)');
 if(code===403)return tr('Accesso alla fonte negato (403)','Data source access denied (403)');
 if(code===503)return tr('Archivio quotazioni in aggiornamento','Market snapshot is being updated');
 if(code)return tr('Errore HTTP ','HTTP error ')+code;
 return tr('Connessione quotazioni non disponibile','Quote connection unavailable');
}
function renderPlaceholders(){
 for(const group of ids)renderGroup(group,quotes.get(group)||definitions(group));
}
async function loadGroup(group,force=false){
 if(pending.has(group)||(!force&&updated.has(group)&&Date.now()-updated.get(group)<MAX_AGE))return;
 const section=$('injWorldSection'+group);if(!section)return;
 const label=$('injWorld'+group+'Status');
 pending.add(group);section.classList.add('is-loading');
 if(label)label.textContent=tr('Aggiornamento quotazioni…','Updating market quotes…');
 try{
  let direct=null,archived=null;
  if(group==='crypto')direct=await cryptoSnapshot();
  else{
   direct=await getCurrentMarketQuotes(group);
   // If the live gateway returns a partial list, fill its holes from the
   // timestamped scheduled archive. Never replace a newer quote with an older one.
   if(!direct||direct.quotes.filter(validQuote).length<definitions(group).length){
    try{
     const snapshot=await getStaticMarketSnapshot(force);
     archived=snapshot?.groups?.[group]||null;
    }catch(err){if(!direct)throw err;}
   }
  }
  if(!Array.isArray(direct?.quotes)&&!Array.isArray(archived?.quotes))
   throw Object.assign(new Error('No verified quote source'),{code:503});
  const current=byId(direct?.quotes||[]),backup=byId(archived?.quotes||[]);
  const old=byId(quotes.get(group)||[]);
  const arr=definitions(group).map(base=>{
   const candidates=[current.get(base.id),backup.get(base.id),old.get(base.id)]
    .map((quote,index)=>({quote,index}))
    .filter(x=>validQuote(x.quote))
    .sort((x,y)=>(Number(y.quote.time)||0)-(Number(x.quote.time)||0)||x.index-y.index);
   const chosen=candidates[0]?.quote;
   return chosen?{...base,...chosen}:{...base,price:null,change:null,time:null};
  });
  quotes.set(group,arr);
  const available=arr.filter(validQuote).length;
  if(available){updated.set(group,Date.now());saveQuotes();}
  renderGroup(group,arr);
  updateUsSessionUI();
  if(!available){
   statusWithRetry(group,tr('Fonte temporaneamente non disponibile · nessuna quotazione inventata',
    'Source temporarily unavailable · no invented quotes'));
  }
 }catch(err){
  renderGroup(group,quotes.get(group)||definitions(group));
  statusWithRetry(group,errorDescription(Number(err.code)||0)+(quotes.has(group)?
   tr(' · ultimi dati salvati',' · last saved quotes'):''));
 }finally{pending.delete(group);section.classList.remove('is-loading');}
}
async function cryptoSnapshot(){
 const wanted=['bitcoin','ethereum','solana','binancecoin','ripple','hyperliquid','injective-protocol','avalanche-2','chainlink','polkadot','cardano','dogecoin','tron','sui','litecoin','stellar','monero','aptos'];
 const api=window.INJ_MARKET_VIEW_API;
 let coins=api?.getCoins?.()||[];
 if(!Array.isArray(coins)||coins.length<5){
  try{
   const url='https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids='+wanted.join(',')+'&price_change_percentage=24h';
   const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),6000);
   try{const response=await fetch(url,{signal:ctrl.signal,headers:{Accept:'application/json'}});if(response.ok)coins=await response.json()}finally{clearTimeout(timer)}
  }catch(_){}
 }
 const data=new Map((Array.isArray(coins)?coins:[]).map(coin=>[coin.id,coin]));
 return {quotes:wanted.map(id=>{
  const x=data.get(id)||{},p=Number(x.current_price),d=Number(x.price_change_percentage_24h_in_currency??x.price_change_percentage_24h);
  return {id,name:x.name||id.replaceAll('-',' ').toUpperCase(),symbol:(x.symbol||'').toUpperCase(),price:Number.isFinite(p)&&p>0?p:null,change:Number.isFinite(d)?d:null,currency:'USD',time:x.last_updated?Math.round(new Date(x.last_updated).getTime()/1000):null};
 })};
}
const countryIds=[['sp500',/united states/i],['bovespa',/brazil/i],['dax',/germany/i],['cac',/france/i],['ftse',/united kingdom/i],['nikkei',/japan/i],['nifty',/^india$/i],['hangseng',/hong kong/i],['asx',/australia/i]];
function updateMapColors(items){
 const data=byId(items);
 $('injWorldMapSvg')?.querySelectorAll('[data-market-country]')?.forEach(node=>{
  const id=node.getAttribute('data-market-country');const change=data.get(id)?.change;
  node.classList.toggle('up',Number.isFinite(change)&&change>0);
  node.classList.toggle('down',Number.isFinite(change)&&change<0);
 });
}
function renderPins(items){
 updateMapColors(items);
 const layer=$('injWorldMapPins');const note=$('injWorldMapSpotlight');if(!layer||!note)return;
 const data=byId(items);layer.replaceChildren();note.hidden=true;
 for(const [id,lat,lon] of hotspot){
  const q=data.get(id);if(!q)continue;
  const pin=el('button','inj-wm-pin '+state(q));pin.type='button';pin.dataset.marketId=id;
  pin.style.left=((lon+180)/360*100).toFixed(3)+'%';pin.style.top=((90-lat)/180*100).toFixed(3)+'%';
  pin.setAttribute('aria-label',q.name+': '+fmtPercent(q.change));
  pin.title=q.name+' · '+fmtPercent(q.change);
  pin.addEventListener('click',()=>{
   note.textContent=q.name+' · '+fmtValue(q.price,q.currency)+' · '+fmtPercent(q.change);
   note.hidden=false;
  });
  layer.append(pin);
 }
 refreshMapSessions();
}

/* Day/night veil from the actual UTC date and approximate NOAA solar
   declination. Lives above the world geography but below market pins. */
let solarCanvas=null,lastSolarPaint=0;
function ensureSolarOverlay(){
 const frame=$('injWorldMapSvg')?.closest('.inj-world-mapframe');
 if(!frame)return null;
 if(solarCanvas?.isConnected)return solarCanvas;
 solarCanvas=document.createElement('canvas');
 solarCanvas.id='injWorldSolarShade';
 solarCanvas.className='inj-wm-solar-shade';
 solarCanvas.width=480;
 solarCanvas.height=230;
 solarCanvas.setAttribute('aria-hidden','true');
 const pins=$('injWorldMapPins');
 frame.insertBefore(solarCanvas,pins||null);
 return solarCanvas;
}
function paintSolarOverlay(now=Date.now()){
 const canvas=ensureSolarOverlay();
 if(!canvas||document.hidden||now-lastSolarPaint<45000)return;
 lastSolarPaint=now;
 const date=new Date(now),start=Date.UTC(date.getUTCFullYear(),0,0);
 const day=Math.floor((Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate())-start)/86400000);
 const hour=date.getUTCHours()+date.getUTCMinutes()/60+date.getUTCSeconds()/3600;
 const gamma=2*Math.PI/365*(day-1+(hour-12)/24);
 const eqtime=229.18*(.000075+.001868*Math.cos(gamma)-.032077*Math.sin(gamma)-.014615*Math.cos(2*gamma)-.040849*Math.sin(2*gamma));
 const decl=.006918-.399912*Math.cos(gamma)+.070257*Math.sin(gamma)-.006758*Math.cos(2*gamma)+.000907*Math.sin(2*gamma)-.002697*Math.cos(3*gamma)+.00148*Math.sin(3*gamma);
 const sinDecl=Math.sin(decl),cosDecl=Math.cos(decl);
 const w=canvas.width,h=canvas.height,hourCos=new Float32Array(w);
 for(let x=0;x<w;x++){
  const longitude=-180+(x+.5)*360/w;
  const hourAngle=(hour*60+eqtime+4*longitude)/4-180;
  hourCos[x]=Math.cos(hourAngle*Math.PI/180);
 }
 const ctx=canvas.getContext('2d',{alpha:true});
 if(!ctx)return;
 const buffer=ctx.createImageData(w,h),pixels=buffer.data;
 const twilight=Math.sin(-10*Math.PI/180),daylight=Math.sin(2*Math.PI/180);
 for(let y=0;y<h;y++){
  const latitude=(90-(y+.5)*180/h)*Math.PI/180;
  const sinLat=Math.sin(latitude)*sinDecl,cosLat=Math.cos(latitude)*cosDecl;
  for(let x=0;x<w;x++){
   const solarSin=sinLat+cosLat*hourCos[x];
   const t=Math.max(0,Math.min(1,(daylight-solarSin)/(daylight-twilight)));
   const darkness=t*t*(3-2*t);
   const i=(y*w+x)*4;
   pixels[i]=1;pixels[i+1]=5;pixels[i+2]=18;
   // Keep the solar night layer readable on all themes (formerly 205/255 opacity).
    pixels[i+3]=Math.round(darkness*108);
  }
 }
 ctx.putImageData(buffer,0,0);
 const solarLon=((720-hour*60-eqtime)/4+540)%360-180;
 canvas.parentElement?.style.setProperty('--inj-wm-sun-x',((solarLon+180)/360*100).toFixed(2)+'%');
 canvas.parentElement?.style.setProperty('--inj-wm-sun-y',((90-decl*180/Math.PI)/180*100).toFixed(2)+'%');
}

function fallbackMap(){
 const svg=$('injWorldMapSvg');if(!svg)return;
 svg.innerHTML='<g class="inj-wm-land"><path d="M75 110 L120 60 200 38 248 80 230 125 192 145 181 199 146 218 134 181 95 163Z"/><path d="M210 230 L278 244 309 292 291 343 265 421 226 386 204 306Z"/><path d="M392 104 L448 76 502 90 527 123 521 178 490 191 475 235 435 233 413 168Z"/><path d="M510 83 L620 49 757 57 861 103 845 160 786 191 747 167 703 214 650 213 621 174 566 195 538 150Z"/><path d="M754 307 L812 295 866 339 834 382 768 370Z"/><path d="M904 392 L920 385 930 408 911 425Z"/></g>';
}
const ns='http://www.w3.org/2000/svg';
function shapePath(feature){
 const coords=feature?.geometry?.coordinates;if(!coords)return '';
 const polygons=feature.geometry.type==='Polygon'?[coords]:feature.geometry.type==='MultiPolygon'?coords:[];
 let path='';
 for(const polygon of polygons){
  for(const ring of polygon){
   if(!Array.isArray(ring)||ring.length<3)continue;
   const stride=Math.max(1,Math.ceil(ring.length/150));
   let started=false,lastX=0;
   for(let i=0;i<ring.length;i+=stride){
    const p=ring[i],lon=Number(p?.[0]),lat=Number(p?.[1]);
    if(!Number.isFinite(lon)||!Number.isFinite(lat))continue;
    const x=(lon+180)*960/360,y=(90-lat)*460/180;
    if(!started||Math.abs(x-lastX)>400){path+='M'+x.toFixed(1)+' '+y.toFixed(1);started=true}
    else path+='L'+x.toFixed(1)+' '+y.toFixed(1);
    lastX=x;
   }
   if(started)path+='Z';
  }
 }
 return path;
}
async function loadWorldGeometry(){
 if(geometryStarted)return;geometryStarted=true;
 const frame=$('injWorldMapSvg')?.closest('.inj-world-mapframe');
 try{
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),6500);
  let response;
  try{response=await fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson',{signal:ctrl.signal,cache:'force-cache'});}finally{clearTimeout(timer)}
  if(!response.ok)return;
  const payload=await response.json();
  if(!Array.isArray(payload?.features)||payload.features.length<80)return;
  const svg=$('injWorldMapSvg');if(!svg)return;
  const group=document.createElementNS(ns,'g');group.setAttribute('class','inj-wm-land');
  for(const feature of payload.features){
   const d=shapePath(feature);if(!d)continue;
   const path=document.createElementNS(ns,'path');path.setAttribute('d',d);
   const country=String(feature?.properties?.name||feature?.properties?.ADMIN||feature?.id||'');
   if(/antarct|southern ocean/i.test(country))continue;
   const match=countryIds.find(([,re])=>re.test(country));
   if(match)path.setAttribute('data-market-country',match[0]);
   group.append(path);
  }
  if(group.childNodes.length>80){svg.replaceChildren(group);geoReady=true;const indices=quotes.get('indices');if(indices)updateMapColors(indices);}
 }catch(_){/* Retain bundled fallback geography. */}
 finally{frame?.classList.add('is-world-ready');}
}
function localize(){
 $('injWorldHeading').textContent='Global Markets';
 $('injWorldIntro').textContent=tr('La situazione dei mercati mondiali, settore per settore. Scorri in verticale per esplorare.','World financial markets, sector by sector. Scroll vertically to explore.');
 $('injWorldDisclosure').textContent=tr('Le variazioni indicano l’ultima sessione disponibile, non movimenti in tempo reale. Le quotazioni possono essere ritardate. I settori sono rappresentati da ETF, non da indici ufficiali.','Changes reflect the latest available session, not real-time ticks. Quotes may be delayed. Sectors use representative ETFs rather than official sector indices.');
 const n=$('injWorldQuickNav');if(n){n.setAttribute('aria-label',tr('Categorie mercati mondiali','Global market categories'));n.querySelectorAll('[data-world-jump]').forEach(b=>b.textContent=navNames[b.dataset.worldJump][en()?1:0]);}
 for(const group of ids){
  const title=$('injWorldTitle'+group),hint=$('injWorldHint'+group);
  if(title)title.textContent=titles[group][en()?1:0];
  if(hint)hint.textContent=hints[group][en()?1:0];
  const rows=quotes.get(group);if(rows)renderGroup(group,rows);
 }
 updateUsSessionUI();
 $('injWorldMapCaption').textContent=tr('Seleziona un punto per leggere l’indice di riferimento','Tap a point to view its benchmark index');
 const sectorNote=root.querySelector('[data-translation="sector-note"]');if(sectorNote)sectorNote.textContent=tr('11 settori S&P 500 e 5 categorie tematiche, rappresentati da ETF. Le variazioni sono le ultime disponibili.','11 S&P 500 sectors and 5 thematic ETF categories. Changes reflect the latest available session.');
}
/* Each market group is a self-contained page with its own mosaic. */
function ensurePageNavigation(){
 const nav=$('injWorldQuickNav');
 if(!nav)return;
 if(!nav.querySelector('[data-world-jump="indices"]')){
  const first=document.createElement('button');
  first.type='button';
  first.dataset.worldJump='indices';
  first.textContent=navNames.indices[en()?1:0];
  nav.prepend(first);
 }
 nav.setAttribute('aria-label',tr('Categorie mercati mondiali','Global market categories'));
}
function selectWorldPage(group,scrollToTop=false){
 if(!ids.includes(group))return;
 worldPage=group;
 root.dataset.worldPage=group;
 for(const id of ids){
  const section=$('injWorldSection'+id);
  if(!section)continue;
  const selected=id===group;
  section.hidden=!selected;
  section.inert=!selected;
  section.setAttribute('aria-hidden',String(!selected));
 }
 const nav=$('injWorldQuickNav');
 nav?.querySelectorAll('[data-world-jump]').forEach(button=>{
  const selected=button.dataset.worldJump===group;
  button.classList.toggle('is-active',selected);
  button.setAttribute('aria-pressed',String(selected));
  if(selected)button.setAttribute('aria-current','page');
  else button.removeAttribute('aria-current');
 });
 const activeTab=nav?.querySelector('[data-world-jump="'+group+'"]');
 if(activeTab&&nav?.scrollWidth>nav.clientWidth){
  const desired=activeTab.offsetLeft+activeTab.offsetWidth/2-nav.clientWidth/2;
  nav.scrollTo({left:Math.max(0,desired),behavior:scrollToTop?'smooth':'instant'});
 }
 if(active){
  observed.add(group);
  void loadGroup(group);
 }
 if(scrollToTop)window.scrollTo({top:0,behavior:'instant'});
}
function mount(){
 if(initialized)return;initialized=true;
 ensurePageNavigation();
 const nav=$('injWorldQuickNav');
 nav?.addEventListener('click',e=>{
  const b=e.target.closest('[data-world-jump]');if(!b)return;
  selectWorldPage(b.dataset.worldJump,true);
 });
 selectWorldPage(worldPage,false);
 ensureUsSessionHeader();
 const mapFrame=$('injWorldMapSvg')?.closest('.inj-world-mapframe');
 const info=$('injWorldMapSpotlight');
 if(mapFrame&&info){mapFrame.appendChild(info);info.hidden=true;}
 localize();renderPlaceholders();loadWorldGeometry();
 paintSolarOverlay();
 updateUsSessionUI();
 // Selected page loads directly; hidden pages never trigger a quote request.
}
function activate(show){
 active=!!show;root.hidden=!active;
 if(active){mount();selectWorldPage(worldPage,false);updateUsSessionUI();}
}
function languageChange(){if(initialized)localize();}
window.INJ_WORLD_MARKETS={activate,languageChange};
window.addEventListener('storage',e=>{if(e.key==='inj_node_language_v1'&&active)languageChange()});
document.addEventListener('visibilitychange',()=>{
 if(!document.hidden&&active){
  updateUsSessionUI();
  paintSolarOverlay();
  for(const id of observed)if(!updated.has(id)||Date.now()-updated.get(id)>MAX_AGE)void loadGroup(id,true);
 }
});
setInterval(()=>{if(active&&!document.hidden&&Date.now()-(updated.get(worldPage)||0)>MAX_AGE)void loadGroup(worldPage,true)},90000);
setInterval(()=>{if(active&&!document.hidden)updateUsSessionUI()},25000);
setInterval(()=>{if(active&&!document.hidden)paintSolarOverlay()},60000);
})();