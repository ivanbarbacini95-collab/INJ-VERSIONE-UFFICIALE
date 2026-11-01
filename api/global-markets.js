/* INJ Node · independent world-market quote gateway.
 * Fixed watchlists only; server-side fetch; no third-party widgets, no secrets.
 * Public Yahoo Finance chart/spark data are unofficial and may be delayed or rate-limited.
 * Never invent an unavailable quote.
 */
const S={
 indices:[['sp500','S&P 500','^GSPC'],['nasdaq','NASDAQ','^IXIC'],['dow','Dow Jones','^DJI'],['russell','Russell 2000','^RUT'],['stoxx','Euro Stoxx 50','^STOXX50E'],['dax','DAX','^GDAXI'],['cac','CAC 40','^FCHI'],['ftse','FTSE 100','^FTSE'],['nikkei','Nikkei 225','^N225'],['hangseng','Hang Seng','^HSI'],['nifty','Nifty 50','^NSEI'],['asx','ASX 200','^AXJO'],['bovespa','Ibovespa','^BVSP'],["ndx","Nasdaq 100","^NDX"],["vix","VIX Volatilità","^VIX"],["ibex","IBEX 35","^IBEX"],["smi","Swiss Market Index","^SSMI"],["shanghai","Shanghai Composite","000001.SS"]],
 sectors:[['technology','Tecnologia','XLK'],['finance','Finanza','XLF'],['energy','Energia','XLE'],['healthcare','Sanità','XLV'],['industrial','Industria','XLI'],['consumer','Consumi discrezionali','XLY'],['staples','Beni essenziali','XLP'],['utilities','Utilities','XLU'],['realestate','Immobiliare','XLRE'],['materials','Materiali','XLB'],['communications','Comunicazioni','XLC'],["semis","Semiconduttori","SMH"],["biotech","Biotecnologie","XBI"],["cleanenergy","Energia pulita","ICLN"],["aerospace","Difesa e aerospazio","ITA"],["banks","Banche regionali","KRE"]],
 stocks:[['aapl','Apple','AAPL'],['msft','Microsoft','MSFT'],['nvda','NVIDIA','NVDA'],['jpm','JPMorgan','JPM'],['bac','Bank of America','BAC'],['xom','ExxonMobil','XOM'],['cvx','Chevron','CVX'],['lly','Eli Lilly','LLY'],['jnj','Johnson & Johnson','JNJ'],['cat','Caterpillar','CAT'],['ge','GE Aerospace','GE'],['amzn','Amazon','AMZN'],['tsla','Tesla','TSLA'],['wmt','Walmart','WMT'],['cost','Costco','COST'],['nee','NextEra Energy','NEE'],['duk','Duke Energy','DUK'],['googl','Alphabet','GOOGL'],['meta','Meta','META'],['amt','American Tower','AMT'],['lin','Linde','LIN'],['fcx','Freeport-McMoRan','FCX'],["adbe","Adobe","ADBE"],["crm","Salesforce","CRM"],["gs","Goldman Sachs","GS"],["v","Visa","V"],["slb","SLB","SLB"],["abbv","AbbVie","ABBV"],["de","Deere","DE"],["hd","Home Depot","HD"],["pg","Procter & Gamble","PG"],["pld","Prologis","PLD"],["nue","Nucor","NUE"],["nflx","Netflix","NFLX"],["orcl","Oracle","ORCL"],["avgo","Broadcom","AVGO"],["ms","Morgan Stanley","MS"],["blk","BlackRock","BLK"],["cop","ConocoPhillips","COP"],["eog","EOG Resources","EOG"],["mrk","Merck","MRK"],["unh","UnitedHealth","UNH"],["hon","Honeywell","HON"],["ups","UPS","UPS"],["mcd","McDonald's","MCD"],["nke","Nike","NKE"],["ko","Coca-Cola","KO"],["pep","PepsiCo","PEP"],["so","Southern Company","SO"],["exc","Exelon","EXC"],["eqix","Equinix","EQIX"],["o","Realty Income","O"],["shw","Sherwin-Williams","SHW"],["apd","Air Products","APD"],["dis","Walt Disney","DIS"],["t","AT&T","T"],["tmus","T-Mobile US","TMUS"]],
 etf:[['spy','S&P 500 ETF','SPY'],['qqq','Nasdaq 100 ETF','QQQ'],['iwm','Small Caps ETF','IWM'],['efa','Developed Markets','EFA'],['eem','Emerging Markets','EEM'],['tlt','Long Treasury','TLT'],['gld','Gold ETF','GLD'],['vnq','Real Estate ETF','VNQ'],["voo","S&P 500 Vanguard","VOO"],["vti","Total Stock Market","VTI"],["dia","Dow Jones ETF","DIA"],["schd","Dividend Equity","SCHD"],["hyg","High Yield ETF","HYG"],["iau","Gold Trust","IAU"]],
 forex:[['eurusd','EUR / USD','EURUSD=X'],['gbpusd','GBP / USD','GBPUSD=X'],['usdjpy','USD / JPY','JPY=X'],['usdchf','USD / CHF','CHF=X'],['audusd','AUD / USD','AUDUSD=X'],['usdcny','USD / CNY','CNY=X'],['usdinr','USD / INR','INR=X'],["eurgbp","EUR / GBP","EURGBP=X"],["eurjpy","EUR / JPY","EURJPY=X"],["nzdusd","NZD / USD","NZDUSD=X"],["usdcad","USD / CAD","CAD=X"],["usdsek","USD / SEK","SEK=X"]],
 commodities:[['gold','Oro','GC=F'],['silver','Argento','SI=F'],['wti','Petrolio WTI','CL=F'],['brent','Petrolio Brent','BZ=F'],['gas','Gas naturale','NG=F'],['copper','Rame','HG=F'],['corn','Mais','ZC=F'],["platinum","Platino","PL=F"],["palladium","Palladio","PA=F"],["wheat","Grano","ZW=F"],["soybeans","Soia","ZS=F"],["sugar","Zucchero","SB=F"]],
 bonds:[['us10y','USA 10Y rendimento','^TNX'],['us30y','USA 30Y rendimento','^TYX'],['bnd','Bond aggregate ETF','BND'],['ief','Treasury 7-10Y ETF','IEF'],['shy','Treasury 1-3Y ETF','SHY'],['lqd','Corporate IG ETF','LQD'],['hyg','High Yield ETF','HYG'],['tip','Inflation-linked ETF','TIP'],["us5y","USA 5Y rendimento","^FVX"],["us13w","USA 13 settimane","^IRX"],["agg","US Aggregate Bond","AGG"],["emb","Emerging Market Bond","EMB"],["mub","Municipal Bond","MUB"]]
};
const MAXAGE=90*1000;
const cache=new Map();
const UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const number=n=>finite(n)?n:null;
function normalizeChart(result,symbol){
 if(!result)return null;
 const meta=result.meta||{};
 const values=(result.indicators?.quote?.[0]?.close||[]).filter(v=>finite(v)&&v>0);
 const price=number(meta.regularMarketPrice)??values.at(-1)??null;
 const previous=number(meta.previousClose)??number(meta.chartPreviousClose)??values.at(-2)??null;
 if(!finite(price)||price<=0)return null;
 return {symbol,price,change:finite(previous)&&previous>0?(price/previous-1)*100:null,
  previous:finite(previous)&&previous>0?previous:null,time:number(meta.regularMarketTime)||number(result.timestamp?.at(-1))||null,
  currency:String(meta.currency||'').slice(0,7),source:'Yahoo Finance'};
}
async function request(url,ms=5200){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),ms);
 try{
  const resp=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json, text/plain, */*','User-Agent':UA}});
  if(!resp.ok)return {data:null,status:resp.status};
  return {data:await resp.json(),status:resp.status};
 }catch(_){return {data:null,status:0};}finally{clearTimeout(timer)}
}
const cnbcAliases={
 '^GSPC':'.SPX','^IXIC':'.IXIC','^DJI':'.DJI','^RUT':'.RUT',
 '^STOXX50E':'.STOXX50E','^GDAXI':'.GDAXI','^FCHI':'.FCHI','^FTSE':'.FTSE',
 '^NDX':'.NDX','^VIX':'.VIX','^IBEX':'.IBEX','^SSMI':'.SSMI','000001.SS':'.SSEC',
 '^N225':'.N225','^HSI':'.HSI','^NSEI':'.NSEI','^AXJO':'.AXJO','^BVSP':'.BVSP',
 'GC=F':'@GC.1','SI=F':'@SI.1','CL=F':'@CL.1','BZ=F':'@BZ.1',
 'NG=F':'@NG.1','HG=F':'@HG.1','ZC=F':'@C.1','PL=F':'@PL.1','PA=F':'@PA.1',
 'ZW=F':'@W.1','ZS=F':'@S.1','SB=F':'@SB.1','^TNX':'US10Y','^TYX':'US30Y','^FVX':'US5Y','^IRX':'US3M',
 'EURUSD=X':'EUR=','GBPUSD=X':'GBP=','JPY=X':'JPY=','CHF=X':'CHF=',
 'AUDUSD=X':'AUD=','CNY=X':'CNY=','INR=X':'INR=','NZDUSD=X':'NZD='
};
async function cnbc(symbols){
 const known=new Map();
 for(const symbol of symbols)known.set(cnbcAliases[symbol]||symbol,symbol);
 const allSymbols=[...known.keys()],mapped=new Map(),requests=[];
 for(let i=0;i<allSymbols.length;i+=18){
  const chunk=allSymbols.slice(i,i+18);
  const uri='https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols='+encodeURIComponent(chunk.join('|'))+'&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json';
  requests.push(request(uri,3000).then(response=>{
  let rows=response.data?.FormattedQuoteResult?.FormattedQuote||[];
  if(!Array.isArray(rows))rows=rows?[rows]:[];
  for(const row of rows){
   const cnbcSymbol=row?.symbol;
   const symbol=known.get(cnbcSymbol);
   if(!symbol)continue;
   const price=parseNasdaqNumber(row.last);
   if(!(price>0))continue;
   const prev=parseNasdaqNumber(row.previous_day_closing);
   const percentage=parseNasdaqNumber(row.change_pct);
   const change=prev>0?(price/prev-1)*100:percentage;
   const parsed=Date.parse(String(row.last_time||''));
   mapped.set(symbol,{symbol,price,change:Number.isFinite(change)?change:null,previous:prev>0?prev:null,
    time:Number.isFinite(parsed)&&parsed>0&&parsed<=Date.now()+5*60000?Math.round(parsed/1000):null,currency:String(row.currency||'').slice(0,7),
    source:'CNBC'});
  }
 }));
 }
 await Promise.all(requests);
 return mapped;
}
async function spark(symbols){
 const map=new Map();
 let status=0;
 // Retry only missing symbols on the secondary public Yahoo host.
 for(const host of ['query1.finance.yahoo.com','query2.finance.yahoo.com']){
  const remaining=symbols.filter(symbol=>!map.has(symbol));
  if(!remaining.length)break;
  const url='https://'+host+'/v7/finance/spark?symbols='+encodeURIComponent(remaining.join(','))+'&range=5d&interval=1d';
  const result=await request(url,2900);
  status=result.status||status;
  for(const item of result.data?.spark?.result||[]){
   const symbol=item.symbol,quote=normalizeChart(item.response?.[0],symbol);
   if(symbol&&quote)map.set(symbol,quote);
  }
 }
 return {quotes:map,status};
}
function parseNasdaqNumber(v){
 if(typeof v==='number'&&Number.isFinite(v))return v;
 if(typeof v!=='string')return null;
 const cleaned=v.replace(/[,$%\s]/g,'').trim();
 if(!/^[-+]?\d+(?:\.\d+)?$/.test(cleaned))return null;
 const n=Number(cleaned);return Number.isFinite(n)?n:null;
}
async function nasdaq(symbol,assetClass='stocks'){
 if(!/^[A-Z][A-Z0-9.\-]{0,12}$/.test(symbol))return null;
 const url='https://api.nasdaq.com/api/quote/'+encodeURIComponent(symbol)+'/info?assetclass='+assetClass;
 const response=await request(url,2300);
 const raw=response.data?.data?.primaryData;
 if(!raw)return null;
 const price=parseNasdaqNumber(raw.lastSalePrice);
 if(!(price>0))return null;
 const change=parseNasdaqNumber(raw.percentageChange);
 const delta=parseNasdaqNumber(raw.netChange);
 let dt=Date.parse(raw.lastTradeTimestamp||'');
 const previous=delta!==null&&price-delta>0?price-delta:null;
 return {symbol,price,change:change??(previous?(price/previous-1)*100:null),previous,time:Number.isFinite(dt)?Math.round(dt/1000):null,currency:'USD',source:'Nasdaq'};
}
async function chart(symbol,group){
 if(group==='stocks'||group==='sectors'||group==='etf'){
  const fromNasdaq=await nasdaq(symbol,group==='etf'||group==='sectors'?'etf':'stocks');
  if(fromNasdaq)return {quote:fromNasdaq,status:200};
 }
 const tail='/v8/finance/chart/'+encodeURIComponent(symbol)+'?range=5d&interval=1d';
 for(const host of ['query1.finance.yahoo.com','query2.finance.yahoo.com']){
  const response=await request('https://'+host+tail,1800);
  const data=normalizeChart(response.data?.chart?.result?.[0],symbol);
  if(data)return {quote:data,status:200};
  if(response.status===429)return {quote:null,status:429};
 }
 return {quote:null,status:0};
}
async function getGroup(group){
 const def=S[group],symbols=def.map(q=>q[2]),found=new Map(),errors=[],started=Date.now();
 // Batch source can fill a whole market category in one request, reducing Yahoo throttling.
 const first=await cnbc(symbols);
 first.forEach((v,k)=>found.set(k,v));
 // One inexpensive batch attempt before chart fallbacks; individual requests use
 // bounded concurrency to avoid exhausting serverless time and provider quotas.
 const remaining=symbols.filter(k=>!found.has(k));
 const chunks=[];
 for(let i=0;i<remaining.length;i+=12)chunks.push(remaining.slice(i,i+12));
 const batches=await Promise.all(chunks.map(spark));
 for(const r of batches){r.quotes.forEach((v,k)=>{if(!found.has(k))found.set(k,v)});if(!r.quotes.size)errors.push(r.status);}
 const pending=symbols.filter(symbol=>!found.has(symbol));
 let next=0;
 await Promise.all(Array.from({length:Math.min(8,pending.length)},async()=>{
  while(next<pending.length && Date.now()-started<24500){
   const symbol=pending[next++];
   const r=await chart(symbol,group);
   if(r.quote)found.set(symbol,r.quote);
   else errors.push(r.status);
  }
 }));
 return {group,asOf:Date.now(),source:[...new Set([...found.values()].map(q=>q.source))].join(' / ')||'Yahoo Finance / Nasdaq (unofficial)',delayed:true,
  session:'latest available quote',quotes:def.map(([id,name,symbol])=>({
   id,name,symbol,...(found.get(symbol)||{price:null,change:null,previous:null,time:null,currency:null,source:'Yahoo Finance'})
  })),available:found.size,total:def.length,providerStatus:errors.includes(429)?'rate-limited':found.size?'partial':'unavailable'};
}
export const config={maxDuration:30};
export default async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
 const group=String(req.query?.group||'').toLowerCase();
 if(!Object.prototype.hasOwnProperty.call(S,group))return res.status(400).json({error:'Unknown market group'});
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','public, s-maxage=90, stale-while-revalidate=180');
 res.setHeader('X-Content-Type-Options','nosniff');
 const saved=cache.get(group);
 if(saved&&Date.now()-saved.asOf<MAXAGE)return res.status(200).json(saved);
 const result=await getGroup(group);
 if(result.available)cache.set(group,result);
 // Always return structured JSON; unavailable instruments retain names/symbols,
 // and the client can report an outage without hiding the entire section.
 return res.status(200).json(result);
}
