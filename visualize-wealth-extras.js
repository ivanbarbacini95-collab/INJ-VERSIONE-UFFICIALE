/* Potential Value additions — isolated from the stable single-wallet simulator.
   Read-only, progressive: an APR request must never block net-worth totals. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const DAY=86400000;
const RELOAD_MS=5*60000;
const APR_ENDPOINT='https://api.ui.injective.network/api/v1/cache/stats/apr';
const LCD=['https://sentry.lcd.injective.network:443','https://lcd.injective.network','https://1rpc.io/inj-lcd'];
const periods=[['1h',1/24],['1d',1],['1w',7],['1m',365/12],['1y',365]];
const aprLive=new Map();
let baseApr={value:NaN,at:0,promise:null};
let running=0;
let ticking=false;

function read(key){try{return localStorage.getItem(key)}catch(_){return null}}
function json(raw,fallback){try{const result=JSON.parse(raw);return result??fallback}catch(_){return fallback}}
function language(){return read('inj_node_language_v1')==='en'?'en':'it'}
function currency(){return read('inj_monitor_currency')==='EUR'?'EUR':'USD'}
function number(value){if(value===undefined||value===null||String(value).trim()==='')return NaN;const n=Number(value);return Number.isFinite(n)&&n>=0?n:NaN}
function validAddress(value){return /^inj1[a-z0-9]{38,60}$/i.test(String(value||''))}
function validHolding(row){
 return !!row&&Number.isFinite(row.total)&&Number.isFinite(row.staked)&&row.staked<=row.total+1e-5;
}
function parsePrice(value){
 const s=String(value||'').trim().replace(/[\s\u00a0\u202f€$]/g,'');
 if(!s||!/^[\d.,]+$/.test(s))return NaN;
 const d=s.lastIndexOf('.'),c=s.lastIndexOf(',');
 let cleaned=s;
 if(d>=0&&c>=0){const dec=d>c?'.':',';cleaned=s.split(dec==='.'?',':'.').join('').replace(dec,'.')}
 else if((s.match(/[.,]/g)||[]).length>1){
  const sep=c>=0?',':'.',i=s.lastIndexOf(sep);
  cleaned=s.slice(0,i).replace(/[.,]/g,'')+'.'+s.slice(i+1);
 }else cleaned=s.replace(',','.');
 const n=Number(cleaned);return Number.isFinite(n)&&n>=0?n:NaN;
}
function price(){
 // The user-visible input is the authority: never simulate with a hidden
 // stale price when the original section shows a different value.
 const value=parsePrice($('wealthPrice')?.value);
 if(!Number.isFinite(value))return {shown:NaN,usd:NaN};
 if(currency()==='USD')return {shown:value,usd:value};
 const rate=number(read('inj_monitor_eur_rate'));
 return {shown:value,usd:rate>0&&rate<10?value/rate:NaN};
}
function money(amount,ccy){
 return new Intl.NumberFormat(ccy==='EUR'?'it-IT':'en-US',{
  style:'currency',currency:ccy,minimumFractionDigits:2,maximumFractionDigits:2
 }).format(amount);
}
function rewardMoney(amount){
 const decimals=amount>0&&amount<.01?4:2;
 return new Intl.NumberFormat('en-US',{
  style:'currency',currency:'USD',minimumFractionDigits:decimals,maximumFractionDigits:decimals
 }).format(amount);
}
function qty(value){
 return new Intl.NumberFormat(language()==='en'?'en-US':'it-IT',{maximumFractionDigits:4}).format(value)+' INJ';
}
function aprPercent(value){
 const n=number(value);
 return Number.isFinite(n)&&n<=100?n:NaN;
}
function walletFrom(source,address,label){
 const total=number(source?.total);
 const staked=number(source?.staked);
 const available=number(source?.available),rewards=number(source?.rewards);
 const derived=Number.isFinite(available)&&Number.isFinite(staked)&&Number.isFinite(rewards)
  ?available+staked+rewards:NaN;
 const row={
  address,label:String(label||source?.label||'Wallet'),
  total:Number.isFinite(total)?total:derived,
  staked,updated:number(source?.updated)||0,
  apr:aprPercent(source?.personalApr),
  validators:Array.isArray(source?.validators)?source.validators:[]
 };
 return row;
}
function selectedSnapshot(){
 try{
  if(parent!==window&&parent.location.origin===location.origin&&typeof parent.INJ_GET_SELECTED_WALLET_SNAPSHOT==='function'){
   return parent.INJ_GET_SELECTED_WALLET_SNAPSHOT();
  }
 }catch(_){}
 return null;
}
function wallets(){
 const saved=json(read('inj_monitor_wallets_v1'),[]);
 const summaries=json(read('inj_monitor_summaries_v1'),{});
 const result=[];
 const seen=new Set();
 for(const w of Array.isArray(saved)?saved:[]){
  const address=String(w?.address||'').trim().toLowerCase();
  if(!validAddress(address)||seen.has(address))continue;
  seen.add(address);
  result.push(walletFrom(summaries?.[address],address,w.label));
 }
 const snapshot=selectedSnapshot();
 const selected=String(snapshot?.address||read('inj_node_comparison_selected_wallet_v1')||read('inj_monitor_address')||'').toLowerCase();
 if(validAddress(selected)){
  let found=result.find(r=>r.address===selected);
  if(!found){
   found=walletFrom(snapshot,selected,snapshot?.label||'Wallet');
   result.push(found);
  }else if(snapshot){
   const live=walletFrom(snapshot,selected,snapshot.label||found.label);
   if(validHolding(live)&&(!validHolding(found)||live.updated>=found.updated&&live.updated>0)){
    found.total=live.total;found.staked=live.staked;found.updated=live.updated;
   }
   if(Number.isFinite(live.apr))found.apr=live.apr;
   found.label=live.label;
  }
 }
 return {rows:result,selected:result.find(r=>r.address===selected)||null};
}
function effectiveApr(row){
 const update=aprLive.get(row.address);
 if(update&&Number.isFinite(update.apr))return update.apr;
 return row.apr;
}
function annualPayout(row,usd){
 if(!validHolding(row)||!Number.isFinite(usd))return NaN;
 if(row.staked===0)return 0;
 const apr=effectiveApr(row);
 return Number.isFinite(apr)?row.staked*apr/100*usd:NaN;
}
function text(id,value){const node=$(id);if(node&&node.textContent!==value)node.textContent=value}
function setTitle(id,value){const node=$(id);if(node&&node.title!==value)node.title=value}
function render(){
 if(ticking)return;
 ticking=true;
 try{
  const en=language()==='en';
  const privateOn=read('inj_monitor_privacy')==='1';
  const all=wallets();
  const ready=all.rows.filter(validHolding);
  const input=price();
  const knownCount=ready.length;
  const count=all.rows.length;
  const complete=count>0&&knownCount===count;
  const total=ready.reduce((sum,r)=>sum+r.total,0);
  const staked=ready.reduce((sum,r)=>sum+r.staked,0);
  const goodPrice=Number.isFinite(input.shown);
  const allVisible=goodPrice&&knownCount>0&&!privateOn;
  const hidden='••••••';
  text('wealthAllTitle',en?'ALL WALLETS · SIMULATED':'TUTTI I WALLET · SIMULAZIONE');
  text('wealthAllWorthLabel',en?'TOTAL NET WORTH':'PATRIMONIO TOTALE');
  text('wealthAllStakeLabel',en?'STAKING ONLY':'SOLO STAKING');
  text('wealthAllCount',count
    ?(complete?(en?'ALL '+count+' WALLETS':count+' WALLET'):knownCount+'/'+count+(en?' SYNCED':' SINCRONIZZATI'))
    :(en?'NO SAVED WALLETS':'NESSUN WALLET SALVATO'));
  text('wealthAllWorth',privateOn?hidden:allVisible?money(total*input.shown,currency()):'—');
  text('wealthAllStake',privateOn?hidden:allVisible?money(staked*input.shown,currency()):'—');
  text('wealthAllInj',privateOn?hidden:knownCount?qty(total):'—');
  text('wealthAllStakeInj',privateOn?hidden:knownCount?qty(staked):'—');
  text('wealthIncomeTitle',en?'POTENTIAL STAKING INCOME · USD':'RENDITA POTENZIALE DA STAKING · USD');
  text('wealthIncomePeriodTitle',en?'PERIOD':'PERIODO');
  text('wealthIncomeSelectedTitle',en?'SELECTED WALLET':'WALLET SELEZIONATO');
  text('wealthIncomeAllTitle',en?'ALL WALLETS':'TUTTI I WALLET');
  text('wealthIncomeSelectedName',all.selected?.label||'—');
  const selectedAnnual=all.selected?annualPayout(all.selected,input.usd):NaN;
  const knownApr=ready.filter(r=>r.staked===0||Number.isFinite(effectiveApr(r)));
  const annualKnown=knownApr.reduce((sum,r)=>sum+annualPayout(r,input.usd),0);
  const annualAll=knownApr.length&&Number.isFinite(input.usd)?annualKnown:NaN;
  const aprCoverage=count?knownApr.length+'/'+count:'0/0';
  const allAprComplete=complete&&knownApr.length===count;
  const selectedApr=all.selected?effectiveApr(all.selected):NaN;
  const allNetApr=staked>0&&allAprComplete?
    ready.reduce((sum,r)=>sum+r.staked*(effectiveApr(r)||0),0)/staked
    :staked===0&&complete?0:NaN;
  const selectedLabel=Number.isFinite(selectedApr)?selectedApr.toFixed(3)+'%':'—';
  const allLabel=Number.isFinite(allNetApr)?allNetApr.toFixed(3)+'%':'—';
  text('wealthIncomeSelectedApr',privateOn?hidden:(en?'NET APR ':'APR NETTO ')+selectedLabel);
  text('wealthIncomeAllApr',privateOn?hidden:(en?'NET APR ':'APR NETTO ')+allLabel);
  for(const [key,days] of periods){
   const selectedValue=Number.isFinite(selectedAnnual)?selectedAnnual*days/365:NaN;
   const allValue=Number.isFinite(annualAll)?annualAll*days/365:NaN;
   const one=privateOn?hidden:Number.isFinite(selectedValue)?rewardMoney(selectedValue):'—';
   const group=privateOn?hidden:Number.isFinite(allValue)?rewardMoney(allValue):'—';
   text('wealthIncomeSelected'+key,one);
   text('wealthIncomeAll'+key,group);
   setTitle('wealthIncomeSelected'+key,one);
   setTitle('wealthIncomeAll'+key,group);
  }
  const incomeStatus=allAprComplete?
   (en?'APR FOR ALL '+count+' WALLETS':'APR DI TUTTI I '+count+' WALLET'):
   (en?'APR AVAILABLE '+aprCoverage:'APR DISPONIBILE '+aprCoverage);
  text('wealthIncomeStatus',privateOn?(en?'PRIVACY ON':'PRIVACY ATTIVA'):incomeStatus);
  text('wealthIncomeNote',privateOn
   ?(en?'Figures are hidden by Privacy settings.':'I valori sono nascosti dalle impostazioni Privacy.')
   :!goodPrice?(en?'Enter a hypothetical INJ price above to calculate income.':'Inserisci sopra un prezzo INJ ipotetico per calcolare la rendita.')
   :currency()==='EUR'&&!Number.isFinite(input.usd)
    ?(en?'Waiting for EUR/USD conversion to estimate dollar income.':'In attesa del cambio EUR/USD per stimare la rendita in dollari.')
    :!complete||!allAprComplete
     ?(en?'Partial estimate: not all wallet balances or validator APRs are available yet.':'Stima parziale: alcuni saldi o APR dei validatori sono ancora in aggiornamento.')
     :(en?'Estimated at your hypothetical price and net validator APR. Excludes compounding and future rate changes.':'Stima al prezzo ipotetico e APR netto dei validatori, senza compound né variazioni future.'));
  if(!document.hidden&&!privateOn)refreshApr(ready);
 }catch(error){
  // Optional estimates must never affect the original simulator.
  console.warn('[INJ Node] Potential Value additional metrics:',error);
 }finally{ticking=false}
}
async function fetchJson(url){
 const ctl=new AbortController();
 const timer=setTimeout(()=>ctl.abort(),7500);
 try{
  const response=await fetch(url,{cache:'no-store',signal:ctl.signal});
  if(!response.ok)throw new Error('HTTP '+response.status);
  return await response.json();
 }finally{clearTimeout(timer)}
}
async function lcd(path){
 let error;
 for(const base of LCD){
  try{return await fetchJson(base+path)}catch(err){error=err}
 }
 throw error||new Error('LCD unavailable');
}
async function getNetworkApr(){
 if(Number.isFinite(baseApr.value)&&Date.now()-baseApr.at<RELOAD_MS)return baseApr.value;
 if(baseApr.promise)return baseApr.promise;
 baseApr.promise=(async()=>{
  const info=await fetchJson(APR_ENDPOINT);
  const raw=number(info?.apr);
  const net=raw>0?(raw<=1?raw*100:raw):NaN;
  if(!(net>0&&net<100))throw new Error('Invalid network APR');
  baseApr={value:net,at:Date.now(),promise:null};
  return net;
 })().finally(()=>{baseApr.promise=null});
 return baseApr.promise;
}
async function fetchWalletApr(row){
 const [network,delegations]=await Promise.all([
  getNetworkApr(),
  lcd('/cosmos/staking/v1beta1/delegations/'+encodeURIComponent(row.address))
 ]);
 const stakeRows=(Array.isArray(delegations?.delegation_responses)?delegations.delegation_responses:[])
  .map(item=>({
   operator:String(item?.delegation?.validator_address||''),
   stake:Number(item?.balance?.amount)/1e18
  })).filter(item=>item.operator&&Number.isFinite(item.stake)&&item.stake>0);
 const delegated=stakeRows.reduce((s,r)=>s+r.stake,0);
 if(!(delegated>0))return 0;
 const netRows=await Promise.all(stakeRows.map(async item=>{
  const info=await lcd('/cosmos/staking/v1beta1/validators/'+encodeURIComponent(item.operator));
  const validator=info?.validator;
  if(!validator)throw new Error('Missing validator');
  const raw=Number(validator?.commission?.commission_rates?.rate);
  const commission=raw>1?raw/1e18:raw;
  if(!Number.isFinite(commission)||commission<0||commission>1)throw new Error('Invalid validator commission');
  const active=!validator.jailed&&(!validator.status||
   validator.status==='BOND_STATUS_BONDED'||validator.status===3||validator.status==='3');
  return item.stake*(active?1-commission:0);
 }));
 return network*netRows.reduce((sum,value)=>sum+value,0)/delegated;
}
function refreshApr(rows){
 const now=Date.now();
 for(const row of rows){
  if(running>=2)break;
  if(row.staked<=0)continue;
  const cache=aprLive.get(row.address);
  if(cache?.loading||now<(cache?.nextAt||0))continue;
  // Display Dashboard's own cached APR immediately, then enhance it silently.
  const item={apr:cache?.apr??NaN,updated:cache?.updated||0,nextAt:now+RELOAD_MS,loading:true};
  aprLive.set(row.address,item);
  running++;
  fetchWalletApr(row).then(net=>{
   if(Number.isFinite(net)&&net>=0&&net<=100){item.apr=net;item.updated=Date.now();}
  }).catch(()=>{
   item.nextAt=Date.now()+45_000;
  }).finally(()=>{
   item.loading=false;running=Math.max(0,running-1);
   render();
  });
 }
}
// Public read-only snapshot for the growth simulator. Reuse the identical
// selected-wallet and net-APR logic displayed by this panel.
window.INJ_POTENTIAL_COMPOUND_DATA=()=>{
 const state=wallets();
 return {
  selected:state.selected?.address||null,
  rows:state.rows.map(row=>({
   address:row.address,label:row.label,staked:row.staked,
   apr:effectiveApr(row),updated:row.updated
  }))
 };
};
$('wealthPrice')?.addEventListener('input',render);
window.addEventListener('storage',event=>{
 if(!event.key||['inj_monitor_summaries_v1','inj_monitor_wallets_v1',
 'inj_monitor_address','inj_node_comparison_selected_wallet_v1',
 'inj_monitor_currency','inj_monitor_eur_rate','inj_monitor_privacy',
 'inj_node_language_v1'].includes(event.key))render();
});
window.addEventListener('pageshow',render);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
window.INJ_POTENTIAL_EXTRA_REFRESH=render;
render();
window.setInterval(()=>{if(!document.hidden)render()},3500);
})();