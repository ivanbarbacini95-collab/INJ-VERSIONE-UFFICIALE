/* INJ Node · INJC market terminal · 2026-11-05
   No fabricated quotes or fund flows. All quote fields belong to ETF shares, not INJ spot.
   Public Nasdaq.com last-sale snapshot first when available; Yahoo bars and timestamped backup are fallbacks.
   Public endpoints are not licensed exchange streaming. Always display the actual trade time.
*/
(() => {
 'use strict';
 if(window.__injcMarketTerminal) return;
 window.__injcMarketTerminal=true;
 const $=id=>document.getElementById(id);
 const lang=()=>document.documentElement.lang==='en'?'en':'it';
 const tr=(it,en)=>lang()==='en'?en:it;
 const fmt=(v,d=2)=>{
   if(!Number.isFinite(v))return '—';
   return Number(v).toLocaleString(lang()==='en'?'en-US':'it-IT',{minimumFractionDigits:d,maximumFractionDigits:d});
 };
 const usd=v=>Number.isFinite(v)?'$'+fmt(v):'—';
 const count=v=>Number.isFinite(v)?fmt(v,0):'—';
 const shortUsd=v=>!Number.isFinite(v)?'—':Math.abs(v)>=1e9?'$'+fmt(v/1e9,2)+'B':Math.abs(v)>=1e6?'$'+fmt(v/1e6,2)+'M':Math.abs(v)>=1e3?'$'+fmt(v/1e3,1)+'K':usd(v);
 const numeric=x=>x===null||x===undefined||x===''?null:Number.isFinite(Number(x))?Number(x):null;
 const tNY=date=>new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hour12:false,weekday:'short',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).reduce((a,p)=>(a[p.type]=p.value,a),{});
 const nyKey=date=>{const d=tNY(date);return d.year+'-'+d.month+'-'+d.day};
 const dayUTC=key=>new Date(key+'T12:00:00Z');
 const keyUTC=date=>date.toISOString().slice(0,10);
 function observed(year,month,day){
   const d=new Date(Date.UTC(year,month-1,day));
   if(d.getUTCDay()===6)d.setUTCDate(d.getUTCDate()-1);
   if(d.getUTCDay()===0)d.setUTCDate(d.getUTCDate()+1);
   return keyUTC(d);
 }
 function nthWeekday(y,month,weekday,nth){
   const d=new Date(Date.UTC(y,month-1,1));
   d.setUTCDate(1+(weekday-d.getUTCDay()+7)%7+(nth-1)*7);
   return keyUTC(d);
 }
 function lastWeekday(y,month,weekday){
   const d=new Date(Date.UTC(y,month,0));
   d.setUTCDate(d.getUTCDate()-(d.getUTCDay()-weekday+7)%7);
   return keyUTC(d);
 }
 function easter(y){
   const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),
     g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,
     l=(32+2*e+2*i-h-k+49)%7,m=Math.floor((a+11*h+22*l)/451),
     month=Math.floor((h+l-7*m+114)/31),day=(h+l-7*m+114)%31+1;
   return new Date(Date.UTC(y,month-1,day));
 }
 const holidayCache=new Map();
 function holidays(y){
   if(holidayCache.has(y))return holidayCache.get(y);
   const goodFriday=easter(y);goodFriday.setUTCDate(goodFriday.getUTCDate()-2);
   const dates=new Set([
     observed(y,1,1),observed(y+1,1,1),nthWeekday(y,1,1,3),nthWeekday(y,2,1,3),
     keyUTC(goodFriday),lastWeekday(y,5,1),observed(y,6,19),observed(y,7,4),
     nthWeekday(y,9,1,1),nthWeekday(y,11,4,4),observed(y,12,25)
   ]);
   holidayCache.set(y,dates);return dates;
 }
 function isTradingDay(key){
   const d=dayUTC(key),weekday=d.getUTCDay();
   return weekday!==0&&weekday!==6&&!holidays(d.getUTCFullYear()).has(key);
 }
 function dayCloseMinute(key){
   const d=dayUTC(key),y=d.getUTCFullYear();
   const thanksgiving=nthWeekday(y,11,4,4);
   const postThanksgiving=dayUTC(thanksgiving);postThanksgiving.setUTCDate(postThanksgiving.getUTCDate()+1);
   return key===keyUTC(postThanksgiving)||key===String(y)+'-12-24'?780:960;
 }
 function nyMinutes(date){
   const d=tNY(date);return (Number(d.hour)%24)*60+Number(d.minute);
 }
 function pointSession(timestamp){
   const d=new Date(timestamp),key=nyKey(d),minute=nyMinutes(d);
   if(!isTradingDay(key))return 'closed';
   if(minute>=240&&minute<570)return 'pre';
   if(minute>=570&&minute<dayCloseMinute(key))return 'regular';
   return 'post';
 }
 function marketState(){
   const now=new Date(),key=nyKey(now),minute=nyMinutes(now);
   if(!isTradingDay(key))return 'closed';
   if(minute>=570&&minute<dayCloseMinute(key))return 'open';
   if(minute>=240&&minute<570)return 'pre';
   return 'closed';
 }
 function nyOpenUtc(key){
   const [y,m,d]=key.split('-').map(Number),guess=new Date(Date.UTC(y,m-1,d,14,30));
   const tzPart=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',timeZoneName:'shortOffset'}).formatToParts(guess).find(p=>p.type==='timeZoneName')?.value||'GMT-5';
   const match=tzPart.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
   const offset=match?(match[1]==='-'?-1:1)*(Number(match[2])*60+Number(match[3]||0)):-300;
   return Date.UTC(y,m-1,d,9,30)-offset*60000;
 }
 function nextOpen(){
   const now=Date.now(),d=dayUTC(nyKey(new Date()));
   for(let i=0;i<16;i++){
     const key=keyUTC(d);
     if(isTradingDay(key)){
       const opening=nyOpenUtc(key);
       if(opening>now)return opening;
     }
     d.setUTCDate(d.getUTCDate()+1);
   }
   return null;
 }
 function countdownString(ms){
   if(ms===null||ms===undefined)return '—';
   const total=Math.max(0,Math.ceil(ms/1000)),days=Math.floor(total/86400),
     h=Math.floor(total%86400/3600),m=Math.floor(total%3600/60),sec=total%60;
   const time=[h,m,sec].map(x=>String(x).padStart(2,'0')).join(':');
   return days?days+tr('g ','d ')+time:time;
 }
 const fmtTime=ms=>new Date(ms).toLocaleTimeString(lang()==='en'?'en-US':'it-IT',{hour:'2-digit',minute:'2-digit',timeZone:'America/New_York'});
 let timeframe='1d', busy=false, lastQuote=null, lastGoodAt=0, quoteSource='', graphPoints=[], refreshTimer=null, marketPulseTimer=null, flowsHistory=[], flowDayKey=null, plottedFlowsFirstTime=true;
 const ranges={ '1d':['1d','1m'],'5d':['5d','5m'],'1mo':['1mo','30m'],'3mo':['3mo','1d'],'1y':['1y','1d'] };
 // Price-range rail is independent from the main chart timeframe.
 const priceRangeConfig={
   '1d':{range:'1d',interval:'1m',maxDays:1},
   '1w':{range:'1mo',interval:'1d',maxDays:7},
   '1mo':{range:'1mo',interval:'1d',maxDays:31},
   '1y':{range:'1y',interval:'1d',maxDays:366}
 };
 let selectedPriceRange='1d',priceRangeRequest=0,priceRangeSnapshot=null,
   priceRangeLastFetched=0,priceRangeSyncing=false;

 function setText(id,value){const el=$(id);if(el)el.textContent=value;}
 function changeClass(id,value){const el=$(id);if(!el)return;el.classList.toggle('up',Number.isFinite(value)&&value>0);el.classList.toggle('down',Number.isFinite(value)&&value<0);}
 function status(value,extra){
   const pill=$('etfListingPill');
   if(pill){pill.dataset.state=value;pill.classList.toggle('is-live',value==='open'&&extra==='fresh');}
   let txt={open:tr('NASDAQ APERTO','NASDAQ OPEN'),pre:tr('PRE-MARKET','PRE-MARKET'),closed:tr('MERCATO CHIUSO','MARKET CLOSED')}[value];
   if(value==='open'&&extra==='pending')txt=tr('PREZZO IN ATTESA DAL FEED','AWAITING PRICE FEED');
   setText('etfListingBadge',txt);
   setText('etfMarketClock',tr('Nasdaq · 09:30–16:00 New York','Nasdaq · 9:30 AM–4:00 PM New York'));
 }
 function renderStatus(){
   const now=new Date(),state=marketState(),nowKey=nyKey(now);
   const current=Boolean(lastQuote?.quoteTime&&nyKey(new Date(lastQuote.quoteTime))===nowKey&&Date.now()-lastQuote.quoteTime<1200000);
   const fresh=Boolean(current&&lastQuote?.providerRealTime===true&&Date.now()-lastQuote.quoteTime<90000&&Date.now()-lastGoodAt<180000);
   status(state,state==='open'&&lastQuote?.session!=='regular'?'pending':fresh?'fresh':'stale');
   if(!lastQuote)setText('etfQuoteFreshness',state==='pre'?tr('Pre-market · in attesa di scambi reali','Pre-market · awaiting actual trades'):tr('In attesa di una quotazione verificabile','Waiting for a verified market quote'));
   const count=$('etfOpenCountdown'),label=$('etfCountdownLabel');
   if(count&&label){
     const opening=nextOpen();
     count.textContent=opening?countdownString(opening-Date.now()):'—';
     label.textContent=tr('ALL’APERTURA DEL NASDAQ','UNTIL NASDAQ OPENS');
     const bar=$('etfCountdownBox');
     if(bar)bar.dataset.session=state;
     if(state==='open'){
       const minute=dayCloseMinute(nowKey);
       const closing=nyOpenUtc(nowKey)+(minute-570)*60000;
       count.textContent=countdownString(closing-Date.now());
       label.textContent=tr('ALLA CHIUSURA DEL NASDAQ','UNTIL NASDAQ CLOSE');
     }
   }
 }
 function yahooUrl(range,interval,host='query1.finance.yahoo.com'){
   const u='https://'+host+'/v8/finance/chart/INJC?range='+encodeURIComponent(range)+'&interval='+encodeURIComponent(interval)+'&includePrePost='+((range==='1d'||range==='5d')?'true':'false');
   return 'https://proxy.cors.dev/'+u;
 }
 async function getJson(url,timeout=12500){
   const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);
   try {
     const res=await fetch(url,{signal:ctrl.signal,cache:'no-store',credentials:'omit',headers:{accept:'application/json'}});
     if(!res.ok)throw Error('HTTP '+res.status);
     return await res.json();
   }finally{clearTimeout(timer);}
 }
 function parseYahoo(json){
   const obj=json?.chart?.result?.[0];if(!obj||json?.chart?.error)throw Error('Quote not ready');
   const meta=obj.meta||{},q=obj.indicators?.quote?.[0]||{},ts=obj.timestamp||[];
   const raw=ts.map((time,i)=>({time:Number(time)*1000,close:numeric(q.close?.[i]),open:numeric(q.open?.[i]),high:numeric(q.high?.[i]),low:numeric(q.low?.[i]),volume:numeric(q.volume?.[i])}))
     .filter(p=>Number.isFinite(p.time)&&p.time>0&&Number.isFinite(p.close)&&p.close>0)
     .map(p=>({...p,session:pointSession(p.time)}));
   if(!raw.length)throw Error('No confirmed ETF trades');
   const nowKey=nyKey(new Date()),dayRaw=raw.filter(p=>nyKey(new Date(p.time))===nowKey);
   const dayRegular=dayRaw.filter(p=>p.session==='regular'),dayPre=dayRaw.filter(p=>p.session==='pre');
   const session=dayRegular.length?'regular':dayPre.length?'pre':'regular';
   const points=timeframe==='1d'?(dayRegular.length||dayPre.length?dayRaw.filter(p=>p.session==='regular'||p.session==='pre'):raw.filter(p=>p.session==='regular')):raw.filter(p=>p.session==='regular');
   const selected=(session==='pre'?dayPre.at(-1):dayRegular.at(-1))??raw.filter(p=>p.session==='regular').at(-1)??raw.at(-1);
   // A real extended-hours trade is required: never substitute a regular-market close for a fictitious pre-market quote.
   let price=selected?.close,quoteTime=selected?.time;
   if(session==='pre'&&dayPre.length){
     const prePrice=numeric(meta.preMarketPrice),preTime=Number(meta.preMarketTime)*1000;
     if(Number.isFinite(prePrice)&&prePrice>0&&Number.isFinite(preTime)&&preTime>quoteTime&&nyKey(new Date(preTime))===nowKey){
       price=prePrice;quoteTime=preTime;
       if(timeframe==='1d')points.push({...selected,time:preTime,close:prePrice,session:'pre'});
     }
   } else if(session==='regular'){
     const regularTime=Number(meta.regularMarketTime)*1000,regularPrice=numeric(meta.regularMarketPrice);
     if(Number.isFinite(regularTime)&&Number.isFinite(regularPrice)&&regularPrice>0&&regularTime>quoteTime&&pointSession(regularTime)==='regular'){
       price=regularPrice;quoteTime=regularTime;
       if(timeframe==='1d')points.push({...selected,time:regularTime,close:regularPrice,session:'regular'});
     }
   }
   if(!Number.isFinite(price)||price<=0||!Number.isFinite(quoteTime))throw Error('No valid ETF prints');
   const previous=numeric(meta.chartPreviousClose)??numeric(meta.previousClose);
   const volume=dayRegular.length?(numeric(meta.regularMarketVolume)??dayRegular.reduce((sum,p)=>sum+(p.volume??0),0)):null;
   const dayHigh=dayRegular.length?(numeric(meta.regularMarketDayHigh)??Math.max(...dayRegular.map(p=>p.high??p.close))):null;
   const dayLow=dayRegular.length?(numeric(meta.regularMarketDayLow)??Math.min(...dayRegular.map(p=>p.low??p.close))):null;
   return {price,previous,change:Number.isFinite(previous)&&previous>0?(price-previous)/previous*100:null,quoteTime,
     open:dayRegular[0]?.open??null,high:dayHigh,low:dayLow,volume,points,
     session:dayPre.length&&!dayRegular.length?'pre':'regular',currency:meta.currency||'USD',isDelayed:true,updatedAt:Date.now()};
 }

 // Nasdaq.com exposes a public last-sale snapshot. It is distinct from the licensed Nasdaq Data Link stream.
 // Never treat a response timestamp or browser fetch time as the exchange trade timestamp.
 function parseEtTimestamp(value){
   if(typeof value==='number')return value>1e12?value:value>1e9?value*1000:NaN;
   if(typeof value!=='string')return NaN;
   const s=value.trim(),native=/\d{4}-\d\d-\d\dT\d\d:\d\d/.test(s)?Date.parse(s):NaN;
   if(Number.isFinite(native))return native;
   const m=s.match(/([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)\s*(ET|EST|EDT)/i);
   if(!m)return NaN;
   const month=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(m[1].slice(0,3).toLowerCase());
   if(month<0)return NaN;
   let hour=Number(m[4])%12;if(m[7].toUpperCase()==='PM')hour+=12;
   const naive=Date.UTC(Number(m[3]),month,Number(m[2]),hour,Number(m[5]),Number(m[6]||0));
   const tz=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',timeZoneName:'shortOffset'}).formatToParts(new Date(naive)).find(x=>x.type==='timeZoneName')?.value||'GMT-5';
   const offset=tz.match(/GMT([+-])(\d{1,2})(?::(\d\d))?/);
   const minutes=offset?(offset[1]==='-'?-1:1)*(Number(offset[2])*60+Number(offset[3]||0)):-300;
   return naive-minutes*60000;
 }
 const quoteNumber=value=>{
   if(typeof value==='number')return Number.isFinite(value)?value:null;
   if(typeof value!=='string')return null;
   const cleaned=value.trim().replace(/[,$%\s]/g,'').replace(/^\((.+)\)$/,'-$1');
   return /^[-+]?\d+(\.\d+)?$/.test(cleaned)?Number(cleaned):null;
 };
 function parseNasdaq(payload){
   const d=payload?.data,primary=d?.primaryData,secondary=d?.secondaryData;
   if(!d||!primary||payload?.status?.rCode>=400)throw Error('Nasdaq quote unavailable');
   if(d.symbol&&String(d.symbol).toUpperCase()!=='INJC')throw Error('Nasdaq symbol mismatch');
   const entries=[primary,secondary].filter(Boolean);
   const rows=entries.map(v=>({
     price:quoteNumber(v.lastSalePrice),
     time:parseEtTimestamp(v.lastTradeTimestamp??v.lastTradeTime??v.lastTradeDateTime??v.timestamp),
     change:quoteNumber(v.netChange),
     pct:quoteNumber(v.percentageChange),
     realTime:v.isRealTime===true
   })).filter(x=>x.price>0&&Number.isFinite(x.time)&&x.time<=Date.now()+120000&&x.time>Date.UTC(2026,10,4));
   if(!rows.length)throw Error('Nasdaq quote without verifiable trade timestamp');
   rows.sort((a,b)=>b.time-a.time);
   const last=rows[0],previous=Number.isFinite(last.change)?last.price-last.change:null;
   return {
     price:last.price,quoteTime:last.time,previous,
     change:Number.isFinite(last.pct)?last.pct:Number.isFinite(previous)&&previous>0?(last.price-previous)/previous*100:null,
     open:null,high:null,low:null,volume:null,points:[],session:pointSession(last.time),
     isDelayed:!last.realTime,providerRealTime:last.realTime,updatedAt:Date.now()
   };
 }
 function nasdaqUrl(viaProxy=false){
   const direct='https://api.nasdaq.com/api/quote/INJC/info?assetclass=etf';
   return viaProxy?'https://proxy.cors.dev/'+direct:direct;
 }
 async function getNasdaq(){
   for(const url of [nasdaqUrl(),nasdaqUrl(true)]){
     try{return parseNasdaq(await getJson(url,6500));}catch(_){}
   }
   return null;
 }
 function withChart(quote,reference){
   if(!reference)return quote;
   const sameDay=nyKey(new Date(quote.quoteTime))===nyKey(new Date(reference.quoteTime));
   const points=reference.points.slice();
   if(sameDay&&timeframe==='1d'&&quote.quoteTime>(points.at(-1)?.time||0)
     &&points.length&&quote.quoteTime-(points.at(-1)?.time||0)<1800000){
     points.push({time:quote.quoteTime,close:quote.price,open:null,high:null,low:null,volume:null,session:pointSession(quote.quoteTime)});
   }
   return {...quote,points,
     open:sameDay?reference.open:null,high:sameDay?reference.high:null,
     low:sameDay?reference.low:null,volume:sameDay?reference.volume:null,
     previous:Number.isFinite(quote.previous)?quote.previous:reference.previous};
 }

 function parseSnapshot(data){
   if(data?.schemaVersion!==1||data?.ticker!=='INJC'||!data?.quote)throw Error('No valid backup');
   const q=data.quote,price=numeric(q.price),quoteTime=Date.parse(q.quoteTime);
   if(!Number.isFinite(price)||price<=0||!Number.isFinite(quoteTime))throw Error('Backup not traded');
   const points=(data.points||[]).map(p=>({time:Date.parse(p.time),close:numeric(p.close),open:numeric(p.open),high:numeric(p.high),low:numeric(p.low),volume:numeric(p.volume)}))
     .filter(p=>Number.isFinite(p.time)&&Number.isFinite(p.close)&&p.close>0).map(p=>({...p,session:pointSession(p.time)}));
   return {price,quoteTime,previous:numeric(q.previous),change:numeric(q.change),open:numeric(q.open),high:numeric(q.high),low:numeric(q.low),volume:numeric(q.volume),points,session:q.session||pointSession(quoteTime),isDelayed:true,updatedAt:Date.parse(data.generatedAt)||0};
 }
 async function getQuote(){
   const [range,interval]=ranges[timeframe];
   // Check Nasdaq public last-sale concurrently with intraday bars to avoid unnecessary waiting.
   const primary=getNasdaq();
   const chart=(async()=>{
     for(const host of ['query1.finance.yahoo.com','query2.finance.yahoo.com']){
       try{return parseYahoo(await getJson(yahooUrl(range,interval,host),7000));}catch(_){}
     }
     return null;
   })();
   const backup=(async()=>{
     try{
       const snap=await getJson('./market-data/injc-etf-quotes.json?t='+Date.now(),5000);
       return {data:parseSnapshot(snap),source:snap.source||'Market snapshot'};
     }catch(_){return null;}
   })();
   const [nasdaq,yahoo,snapshot]=await Promise.all([primary,chart,backup]);
   const bestOther=[yahoo?{data:yahoo,source:'Yahoo Finance · '+tr('possibile ritardo','potential delay')}:null,snapshot]
     .filter(Boolean).sort((a,b)=>b.data.quoteTime-a.data.quoteTime)[0]||null;
   // A stale Nasdaq page must not displace a newer actual trade from another provider.
   if(nasdaq&&(!bestOther||nasdaq.quoteTime>=bestOther.data.quoteTime-60000)){
     return {
       data:withChart(nasdaq,yahoo||snapshot?.data),
       source:nasdaq.providerRealTime?'Nasdaq.com · '+tr('quotazione dichiarata real-time','provider marks real-time'):
         'Nasdaq.com · '+tr('ultima quotazione pubblicata','last published quote')
     };
   }
   if(bestOther)return bestOther;
   if(nasdaq)return {data:nasdaq,source:'Nasdaq.com · '+tr('ultima quotazione pubblicata','last published quote')};
   throw Error('No timestamped market quote available');
 }
 function marketRangePoints(raw,period){
   const now=Date.now(),start=now-(priceRangeConfig[period].maxDays*86400000+60000);
   if(period==='1d'){
     const today=nyKey(new Date());
     const day=raw.filter(p=>nyKey(new Date(p.time))===today);
     const regular=day.filter(p=>pointSession(p.time)==='regular');
     if(regular.length)return {points:regular,premarket:false};
     const pre=day.filter(p=>pointSession(p.time)==='pre');
     if(pre.length)return {points:pre,premarket:true};
     // When markets are closed, keep the last verified trading session.
     const lastDay=raw.filter(p=>pointSession(p.time)==='regular').at(-1);
     return lastDay
       ?{points:raw.filter(p=>nyKey(new Date(p.time))===nyKey(new Date(lastDay.time))&&pointSession(p.time)==='regular'),premarket:false}
       :{points:[],premarket:false};
   }
   return {points:raw.filter(p=>p.time>=start),premarket:false};
 }
 function parsePriceRangeFromBars(bars,period){
   const valid=bars.filter(p=>Number.isFinite(p.time)&&p.time>0&&Number.isFinite(p.close)&&p.close>0);
   if(!valid.length)throw Error('No actual price bars');
   const selected=marketRangePoints(valid,period),pts=selected.points;
   if(!pts.length)throw Error('No period price bars');
   const low=Math.min(...pts.map(p=>Number.isFinite(p.low)?p.low:p.close));
   const high=Math.max(...pts.map(p=>Number.isFinite(p.high)?p.high:p.close));
   const open=Number.isFinite(pts[0].open)?pts[0].open:pts[0].close;
   const current=pts.at(-1).close;
   if(!(Number.isFinite(low)&&Number.isFinite(high)&&Number.isFinite(open)&&Number.isFinite(current)&&low>0&&high>=low))throw Error('Invalid high/low');
   return {period,low,high,open,current,premarket:selected.premarket,at:pts.at(-1).time};
 }
 function parseRangeYahoo(data,period){
   const obj=data?.chart?.result?.[0];
   if(!obj||data?.chart?.error||(obj.meta?.symbol&&obj.meta.symbol!=='INJC'))throw Error('Quote feed unavailable');
   const q=obj.indicators?.quote?.[0]||{},ts=obj.timestamp||[];
   const bars=ts.map((t,i)=>({
      time:Number(t)*1000,open:numeric(q.open?.[i]),high:numeric(q.high?.[i]),
      low:numeric(q.low?.[i]),close:numeric(q.close?.[i])
   }));
   return parsePriceRangeFromBars(bars,period);
 }
 function renderPriceRange(){
   const data=priceRangeSnapshot?.period===selectedPriceRange?priceRangeSnapshot:null;
   const noData=!data;
   setText('etfPriceRangeLow',noData?'—':usd(data.low));
   setText('etfPriceRangeHigh',noData?'—':usd(data.high));
   setText('etfPriceRangeOpen',noData?'—':usd(data.open));
   setText('etfPriceRangeNow',noData?'—':usd(
     lastQuote&&Number.isFinite(lastQuote.price)&&lastQuote.quoteTime>=data.at?lastQuote.price:data.current
   ));
   const labels={'1d':'24H','1w':'1W','1mo':'1M','1y':'1Y'};
   setText('etfPriceRangeTitle',labels[selectedPriceRange]||'24H');
   const openMarker=$('etfPriceRangeOpenMarker'),lastMarker=$('etfPriceRangeLastMarker'),
     fill=$('etfPriceRangeFill'),track=$('etfPriceRangeTrack');
   if(!openMarker||!lastMarker||!fill||!track)return;
   track.classList.toggle('is-premarket',Boolean(data?.premarket));
   track.classList.toggle('is-empty',noData);
   if(noData){
     openMarker.hidden=true;lastMarker.hidden=true;fill.style.width='0%';
     setText('etfPriceRangeSource',tr('In attesa dei prezzi verificati per il periodo','Awaiting verified prices for this period'));
     return;
   }
   const size=Math.max(data.high-data.low,0.000001);
   const place=value=>Math.min(100,Math.max(0,(value-data.low)/size*100));
   const current=lastQuote&&Number.isFinite(lastQuote.price)&&lastQuote.quoteTime>=data.at?lastQuote.price:data.current;
   const openP=place(data.open),priceP=place(current);
   openMarker.hidden=false;lastMarker.hidden=false;
   openMarker.style.left=openP.toFixed(2)+'%';
   lastMarker.style.left=priceP.toFixed(2)+'%';
   fill.style.width=priceP.toFixed(2)+'%';
   openMarker.title=tr('Apertura','Open')+': '+usd(data.open);
   lastMarker.title=tr('Ultimo prezzo','Last price')+': '+usd(current);
   setText('etfPriceRangeSource',tr(
     data.premarket?'Range pre-market disponibile · feed potenzialmente ritardato':'Range dei prezzi effettivi · feed potenzialmente ritardato',
     data.premarket?'Available pre-market range · potentially delayed':'Actual price range · potentially delayed'
   ));
 }
 async function refreshPriceRange(force=false){
   if(document.hidden)return;
   if(!force&&priceRangeSyncing)return;
   const period=selectedPriceRange,request=++priceRangeRequest;
   if(!force&&priceRangeSnapshot?.period===period&&Date.now()-priceRangeLastFetched<55000){
     renderPriceRange();return;
   }
   priceRangeSyncing=true;
   const config=priceRangeConfig[period];
   let incoming=null,lastError=null;
   for(const host of ['query1.finance.yahoo.com','query2.finance.yahoo.com']){
     try{
       incoming=parseRangeYahoo(await getJson(yahooUrl(config.range,config.interval,host),11500),period);
       break;
     }catch(e){lastError=e;}
   }
   if(!incoming&&period==='1d'){
     try{
       const fallback=await getJson('./market-data/injc-etf-quotes.json?t='+Date.now(),8000);
       if(fallback?.ticker==='INJC'&&Array.isArray(fallback.points)){
         incoming=parsePriceRangeFromBars(fallback.points.map(p=>({
           time:Date.parse(p.time),close:numeric(p.close),open:numeric(p.open),
           high:numeric(p.high),low:numeric(p.low)
         })),period);
       }
     }catch(e){lastError=e;}
   }
   // Ignore a slower response to an earlier timeframe selection.
   if(request!==priceRangeRequest)return;
   priceRangeSyncing=false;
   if(incoming){priceRangeSnapshot=incoming;priceRangeLastFetched=Date.now();}
   else{
     if(priceRangeSnapshot?.period!==period)priceRangeSnapshot=null;
     if(lastError)console.warn('INJC price range unavailable:',lastError.message);
   }
   renderPriceRange();
 }
 function drawGraph(){
   const wrap=$('etfSvgWrap');if(!wrap)return;
   const points=graphPoints.filter(p=>Number.isFinite(p.close)&&p.close>0);
   if(!points.length){
     wrap.replaceChildren();
     $('etfChartWaiting')?.classList.remove('hidden');
     setText('etfChartDataLabel',tr('In attesa di scambi verificati · aggiornamento automatico','Awaiting verified trades · automatic updates'));
     return;
   }
   $('etfChartWaiting')?.classList.add('hidden');
   // The old fixed 1000x350 SVG with preserveAspectRatio=none distorted the
   // price/time labels on mobile: x and y text were scaled by different factors.
   // Use actual rendered CSS-pixel dimensions so text remains fully proportional.
   const rect=wrap.getBoundingClientRect();
   const w=Math.max(220,Math.round(rect.width||wrap.clientWidth||360));
   const h=Math.max(220,Math.round(rect.height||wrap.clientHeight||330));
   const right=Math.max(75,Math.min(94,Math.round(w*.205)));
   const left=18,top=33,bottom=45,plotRight=w-right,plotBottom=h-bottom;
   const plotWidth=Math.max(1,plotRight-left),plotHeight=Math.max(1,plotBottom-top);
   const priceFont=Math.max(12,Math.min(14,Math.round(w/36)));
   const timeFont=Math.max(12,Math.min(14,Math.round(w/34)));
   const prices=points.map(p=>p.close),min=Math.min(...prices),max=Math.max(...prices);
   const pad=Math.max((max-min)*.16,max*.001,.00001),lo=min-pad,hi=max+pad;
   const x=i=>left+plotWidth*i/Math.max(points.length-1,1);
   const y=v=>top+plotHeight*(hi-v)/Math.max(hi-lo,.00001);
   const regular=points.filter(p=>p.session!=='pre');
   const lastRegular=regular.at(-1)?.close,firstRegular=regular[0]?.close;
   const up=Number.isFinite(lastRegular)&&Number.isFinite(firstRegular)?lastRegular>=firstRegular:points.at(-1).close>=points[0].close;
   const normalColor=up?'#45c996':'#f4777f',preColor='#f4c95d';
   const preActive=timeframe==='1d'&&points.some(p=>p.session==='pre');
   const phases=[];
   if(preActive){
     const indices=points.map((p,i)=>p.session==='pre'?i:-1).filter(i=>i>=0);
     if(indices.length)phases.push({indices,color:preColor,kind:'pre'});
   }
   const regularIndices=points.map((p,i)=>p.session!=='pre'||!preActive?i:-1).filter(i=>i>=0);
   if(regularIndices.length)phases.push({indices:regularIndices,color:normalColor,kind:'regular'});
   // Give each price tick its own right-side column, never overlaying the plot.
   let grid='';
   for(let i=0;i<4;i++){
     const yy=top+plotHeight*i/3;
     const value=hi-(hi-lo)*i/3;
     const labelY=Math.max(priceFont+4,Math.min(h-8,yy+(i===0?-7:i===3?priceFont+3:priceFont/3)));
     grid+='<line x1="'+left+'" y1="'+yy.toFixed(2)+'" x2="'+plotRight+'" y2="'+yy.toFixed(2)+'" stroke="currentColor" stroke-opacity=".12" stroke-dasharray="3 8"/>';
     grid+='<text class="injc-axis-price" x="'+(plotRight+12)+'" y="'+labelY.toFixed(2)+'" text-anchor="start" fill="currentColor" opacity=".83" font-size="'+priceFont+'">'+fmt(value,2)+'</text>';
   }
   let shapes='';
   for(const p of phases){
     const arr=p.indices;
     const path=arr.map((idx,j)=>(j?'L':'M')+x(idx).toFixed(2)+' '+y(points[idx].close).toFixed(2)).join(' ');
     const shapeId=p.kind==='pre'?'injcPreFill':'injcNormalFill';
     const fill=path+' L '+x(arr.at(-1)).toFixed(2)+' '+plotBottom+' L '+x(arr[0]).toFixed(2)+' '+plotBottom+' Z';
     if(arr.length>1)shapes+='<path d="'+fill+'" fill="url(#'+shapeId+')"/>';
     shapes+='<path d="'+path+'" fill="none" stroke="'+p.color+'" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>';
     shapes+='<circle cx="'+x(arr.at(-1)).toFixed(2)+'" cy="'+y(points[arr.at(-1)].close).toFixed(2)+'" r="4" fill="'+p.color+'"/>';
   }
   // Avoid crowded 3-label time axes on narrow iPhones.
   const midTick=Math.round((points.length-1)/2);
   const ticks=plotWidth>=275?[0,midTick,points.length-1]:[0,points.length-1];
   const dates=[...new Set(ticks)].map(i=>{
     const value=timeframe==='1d'?fmtTime(points[i].time):new Date(points[i].time).toLocaleDateString(lang()==='en'?'en-US':'it-IT',{month:'short',day:'numeric'});
     const align=i===0?'start':i===points.length-1?'end':'middle';
     return '<text class="injc-axis-time" x="'+x(i).toFixed(2)+'" y="'+(h-13)+'" fill="currentColor" opacity=".88" font-size="'+timeFont+'" text-anchor="'+align+'">'+value+'</text>';
   }).join('');
   let labels='';
   if(preActive){
     labels+='<circle cx="'+(left+5)+'" cy="16" r="4" fill="'+preColor+'"/><text x="'+(left+16)+'" y="20" fill="currentColor" opacity=".82" font-size="12">PRE-MARKET</text>';
     if(regularIndices.length&&plotWidth>300)labels+='<circle cx="'+(left+128)+'" cy="16" r="4" fill="'+normalColor+'"/><text x="'+(left+140)+'" y="20" fill="currentColor" opacity=".82" font-size="12">NASDAQ</text>';
   }
   wrap.innerHTML='<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="xMidYMid meet" role="img" aria-label="'+tr('Grafico delle transazioni INJC: pre-market giallo, sessione rosso o verde','INJC traded chart: yellow pre-market, red or green regular session')+'"><defs><linearGradient id="injcPreFill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="'+preColor+'" stop-opacity=".2"/><stop offset="1" stop-color="'+preColor+'" stop-opacity="0"/></linearGradient><linearGradient id="injcNormalFill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="'+normalColor+'" stop-opacity=".2"/><stop offset="1" stop-color="'+normalColor+'" stop-opacity="0"/></linearGradient></defs>'+grid+shapes+labels+dates+'</svg>';
   setText('etfChartDataLabel',tr('INJC · '+points.length+' punti intraday · storico Yahoo/backup, ultima quota da fonte indicata in alto','INJC · '+points.length+' intraday points · Yahoo/backup history, latest quote source shown above'));
 }
 function displayQuote(data,source){
   const prevTime=lastQuote?.quoteTime||0;
   if(prevTime&&data.quoteTime<prevTime&&timeframe==='1d')return;
   lastQuote=data;quoteSource=source;lastGoodAt=Date.now();
   const pre=data.session==='pre'&&nyKey(new Date(data.quoteTime))===nyKey(new Date());
   setText('etfQuotePrice',usd(data.price));
   setText('etfQuoteChange',Number.isFinite(data.change)?(data.change>0?'+':'')+fmt(data.change,2)+'%':'—');
   setText('etfQuoteDelta',Number.isFinite(data.previous)?(data.price-data.previous>=0?'+':'')+usd(data.price-data.previous)+' '+tr('vs chiusura prec.','vs previous close'):'—');
   for(const id of ['etfQuotePrice','etfQuoteChange','etfQuoteDelta']){
     const el=$(id);if(el)el.classList.toggle('premarket',pre);
   }
   changeClass('etfQuoteChange',pre?null:data.change);
   changeClass('etfQuoteDelta',pre?null:data.price-data.previous);
   const ageM=Math.max(0,Math.floor((Date.now()-data.quoteTime)/60000));
   const age=ageM>=15?' · '+tr('RITARDO ≥15 MIN','DELAY ≥15 MIN'):ageM>=3?' · '+tr('dato '+ageM+' min fa','quote '+ageM+' min old'):'';
   setText('etfQuoteFreshness',source+' · '+(pre?tr('PRE-MARKET','PRE-MARKET'):tr('ultimo scambio','last trade'))+' '+fmtTime(data.quoteTime)+' NY'+age);
   setText('etfVolume',count(data.volume));
   setText('etfNotional',Number.isFinite(data.volume)?shortUsd(data.volume*data.price):'—');
   setText('etfDayHigh',usd(data.high));setText('etfDayLow',usd(data.low));
   setText('etfDayOpen',usd(data.open));setText('etfPreviousClose',usd(data.previous));
   setText('etfVolumeFootnote',tr('Volumi di quote nella sessione regolare, non afflussi netti nel fondo. Controvalore indicativo = volume × ultimo prezzo.','Regular-session share volume, not net fund inflows. Indicative turnover = volume × last share price.'));
   graphPoints=data.points;
   drawGraph();
   renderStatus();
   renderPriceRange();
 }
 async function refreshMarket(){
   if(busy||document.hidden)return;
   busy=true;
   setText('etfSyncLabel',tr('SINCRONIZZAZIONE','SYNCING'));
   try{
     const incoming=await getQuote();
     displayQuote(incoming.data,incoming.source);
     const stale=Date.now()-incoming.data.quoteTime>15*60000;
     setText('etfSyncLabel',stale?tr('DATO RITARDATO','DELAYED QUOTE'):tr('QUOTAZIONE AGGIORNATA','QUOTE UPDATED'));
   }catch(err){
     // Never erase a last-known real quote, but clearly identify a failed live update.
     if(lastQuote){
       setText('etfSyncLabel',tr('FEED NON DISPONIBILE','FEED UNAVAILABLE'));
       setText('etfQuoteFreshness',tr('Ultimo dato disponibile · aggiornamento non riuscito','Last available quote · update failed')+' · '+fmtTime(lastQuote.quoteTime)+' NY');
     }else{
       setText('etfSyncLabel',tr('IN ATTESA','PENDING'));
       setText('etfQuoteFreshness',tr('Nessun primo scambio disponibile dal provider · riprova automaticamente','No first trade available from the provider · automatic retry'));
     }
     renderStatus();
   }finally{busy=false}
 }
 function isVerifiedFlow(row){
   return Boolean(row&&/^\d{4}-\d\d-\d\d$/.test(row.date)&&/^https:\/\//.test(row.source||'')
     &&row.verified===true&&numeric(row.inflowUsd)!==null&&numeric(row.outflowUsd)!==null
     &&numeric(row.inflowUsd)>=0&&numeric(row.outflowUsd)>=0);
 }
 function renderFlows(){
   const today=nyKey(new Date()),start=dayUTC('2026-11-05'),end=dayUTC(today);
   const dateKeys=[];
   for(let i=0;start<=end&&i<2500;i++,start.setUTCDate(start.getUTCDate()+1)){
     const key=keyUTC(start);if(isTradingDay(key))dateKeys.push(key);
   }
   const byDate=new Map(flowsHistory.filter(isVerifiedFlow).map(x=>[x.date,x]));
   const lastVerified=dateKeys.map(d=>byDate.get(d)).filter(Boolean).at(-1);
   const todayFlow=byDate.get(today);
   setText('etfInflowValue',shortUsd(todayFlow?.inflowUsd));
   setText('etfOutflowValue',shortUsd(todayFlow?.outflowUsd));
   const net=lastVerified?lastVerified.inflowUsd-lastVerified.outflowUsd:null;
   setText('etfNetFlow',Number.isFinite(net)?(net>0?'+':'')+shortUsd(net):'—');
   changeClass('etfNetFlow',net);
   setText('etfFlowVerified',lastVerified
     ?tr('Ultima seduta verificata · '+lastVerified.date+' · flussi giornalieri','Latest verified session · '+lastVerified.date+' · daily fund flows')
     :tr('Flussi non pubblicati/verificati · nuove colonne per ogni seduta Nasdaq','Fund flows not yet published/verified · one new set of columns each Nasdaq session'));
   $('etfFlowsSource').hidden=!lastVerified;
   if(lastVerified)$('etfFlowsSource').href=lastVerified.source;
   const el=$('etfFlowHistory');if(!el)return;
   const oldScroll=el.scrollLeft,first=plottedFlowsFirstTime;
   const all=Array.from(byDate.values()).filter(r=>dateKeys.includes(r.date));
   const max=Math.max(1,...all.map(r=>Math.max(r.inflowUsd,r.outflowUsd)));
   const todayLabel=tr('OGGI','TODAY');
   const frag=document.createDocumentFragment();
   for(const key of dateKeys){
     const row=byDate.get(key),label=key.slice(8)+'/'+key.slice(5,7);
     const group=document.createElement('div');group.className='injc-flow-day';group.dataset.day=key;group.classList.toggle('is-current',key===today);
     group.setAttribute('aria-label',key+' · '+(row?'Inflow '+shortUsd(row.inflowUsd)+'; Outflow '+shortUsd(row.outflowUsd):tr('flussi non disponibili','fund flows unavailable')));
     group.title=group.getAttribute('aria-label');
     const bars=document.createElement('div');bars.className='injc-flow-columns';
     for(const side of ['inflow','outflow']){
       const bar=document.createElement('i');bar.className='injc-flow-column '+side;
       if(row){
         const value=side==='inflow'?row.inflowUsd:row.outflowUsd;
         bar.style.height=(value===0?'3px':Math.max(6,Math.min(100,value/max*100)).toFixed(1)+'%');
         bar.classList.toggle('is-zero',value===0);
       }else{bar.style.height='64px';bar.classList.add('is-pending');}
       bars.appendChild(bar);
     }
     group.appendChild(bars);
     const date=document.createElement('span');date.className='injc-flow-date';date.textContent=label;group.appendChild(date);
     const state=document.createElement('small');state.className='injc-flow-day-state';state.textContent=row?'✓':key===today?todayLabel:'·';group.appendChild(state);
     frag.appendChild(group);
   }
   el.replaceChildren(frag);
   if(first){el.scrollLeft=el.scrollWidth;plottedFlowsFirstTime=false;}
   else el.scrollLeft=Math.min(oldScroll,Math.max(0,el.scrollWidth-el.clientWidth));
   setText('etfFlowsSummary',tr(dateKeys.length+' sedute dal lancio · '+byDate.size+' con dati verificati',dateKeys.length+' sessions since listing · '+byDate.size+' with verified flows'));
   flowDayKey=today;
 }
 async function refreshFlows(){
   try{
     const data=await getJson('./market-data/injc-etf-flows.json?t='+Date.now(),8000);
     const rows=Array.isArray(data.sessions)?data.sessions:data.date?[data]:[];
     if(data?.ticker==='INJC'){
       const byDate=new Map(rows.filter(isVerifiedFlow).map(x=>[x.date,{date:x.date,source:x.source,verified:true,inflowUsd:Number(x.inflowUsd),outflowUsd:Number(x.outflowUsd)}]));
       flowsHistory=[...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
     }
   }catch(_){/* A missing third-party verified feed is not a zero dollar flow. */}
   renderFlows();
 }
 function toggleExpandedChart(force){
   const panel=$('etfChartPanel'),button=$('etfAdvancedButton');
   if(!panel||!button)return;
   const expanded=typeof force==='boolean'?force:!panel.classList.contains('injc-chart-expanded');
   panel.classList.toggle('injc-chart-expanded',expanded);
   document.body.classList.toggle('injc-chart-modal-open',expanded);
   button.setAttribute('aria-expanded',String(expanded));
   setText('etfAdvancedButton',expanded?tr('CHIUDI SCHERMO INTERO','CLOSE FULL SCREEN'):tr('INGRANDISCI GRAFICO','EXPAND CHART'));
   if(expanded)panel.scrollTop=0;
 }
 function bind(){
   document.querySelectorAll('[data-etf-range]').forEach(b=>b.addEventListener('click',()=>{
      timeframe=b.dataset.etfRange;
      document.querySelectorAll('[data-etf-range]').forEach(btn=>{btn.classList.toggle('active',btn===b);btn.setAttribute('aria-pressed',String(btn===b))});
      graphPoints=[];drawGraph();refreshMarket();
   }));
   document.querySelectorAll('[data-etf-price-range]').forEach(button=>{
     button.addEventListener('click',()=>{
       const next=button.dataset.etfPriceRange;
       if(!priceRangeConfig[next]||next===selectedPriceRange)return;
       selectedPriceRange=next;
       document.querySelectorAll('[data-etf-price-range]').forEach(b=>{
         const active=b===button;
         b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));
       });
       priceRangeSnapshot=null;priceRangeLastFetched=0;
       renderPriceRange();refreshPriceRange(true);
     });
   });
   $('etfRefresh')?.addEventListener('click',()=>{refreshMarket();refreshFlows();refreshPriceRange(true)});
   $('etfAdvancedButton')?.addEventListener('click',()=>toggleExpandedChart());
   // Chart is redrawable on resize, full-screen transitions and rotation.
   // Keep viewBox units 1:1 with CSS pixels to avoid squashed numeric glyphs.
   const chartHost=$('etfSvgWrap');
   let resizeQueued=false;
   const onChartResize=()=>{
     if(resizeQueued)return;
     resizeQueued=true;
     requestAnimationFrame(()=>{resizeQueued=false;if(graphPoints.length)drawGraph()});
   };
   if(chartHost&&typeof ResizeObserver==='function'){
     new ResizeObserver(onChartResize).observe(chartHost);
   }else window.addEventListener('resize',onChartResize);

   document.addEventListener('keydown',event=>{if(event.key==='Escape')toggleExpandedChart(false);});
   document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshMarket();refreshFlows();refreshPriceRange();renderStatus()}});
   window.addEventListener('pageshow',()=>{refreshMarket();refreshPriceRange();renderStatus()});
   window.addEventListener('storage',event=>{if(event.key==='inj_node_language_v1')location.reload()});
   window.addEventListener('message',e=>{if(e.origin===location.origin&&e.data?.type==='injnode:etf:language')location.reload()});
   renderStatus();renderFlows();drawGraph();renderPriceRange();
   refreshMarket();refreshFlows();refreshPriceRange();
   refreshTimer=setInterval(()=>{if(!document.hidden)refreshMarket()},20000);
   marketPulseTimer=setInterval(()=>{if(!document.hidden){renderStatus();if(flowDayKey!==nyKey(new Date()))renderFlows()}},1000);
   setInterval(()=>{if(!document.hidden)refreshFlows()},300000);
   setInterval(()=>{if(!document.hidden)refreshPriceRange()},60000);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
