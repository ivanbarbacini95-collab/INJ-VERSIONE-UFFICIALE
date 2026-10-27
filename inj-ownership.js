/* INJ NODE — verified ownership context, v16.06.25
   Historical genesis tokenomics != current company holdings.
   Holder tiers & ranks are ONLY among locally saved native INJ wallets.
   Optional per-wallet on-chain refresh uses read-only LCD queries. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
if(!$('injOwnership'))return;
const WALLET_KEY='inj_monitor_wallets_v1';
const DASH_KEY='inj_monitor_summaries_v1';
const CHAIN_KEY='inj_node_holder_native_balances_v1';
const LCD=[
 'https://sentry.lcd.injective.network:443',
 'https://lcd.injective.network',
 'https://1rpc.io/inj-lcd'
];
const now=()=>Date.now(),DAY=86400000;
const en=()=>document.documentElement.lang==='en';
const tr=(it,english)=>en()?english:it;
const num=v=>v===undefined||v===null||v===''?NaN:Number(v);
const fmt=(v,d=2)=>Number.isFinite(v)?new Intl.NumberFormat(en()?'en-US':'it-IT',{maximumFractionDigits:d}).format(v):'—';
const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch(_){return null}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}};
const el=(tag,cls,text)=>{
 const e=document.createElement(tag);if(cls)e.className=cls;
 if(text!==undefined)e.textContent=text;
 return e;
};
const gen=[
 {id:'ecosystem',it:'Sviluppo ecosistema',en:'Ecosystem development',value:36.33},
 {id:'team',it:'Team / contributori',en:'Team / contributors',value:20},
 {id:'private',it:'Vendita privata',en:'Private sale',value:16.67},
 {id:'community',it:'Crescita community',en:'Community growth',value:10},
 {id:'launchpad',it:'Binance Launchpad',en:'Binance Launchpad',value:9},
 {id:'seed',it:'Seed sale',en:'Seed sale',value:6},
 {id:'advisors',it:'Consulenti',en:'Advisors',value:2}
];
// These thresholds are local, illustrative size tiers, not protocol-defined
// brackets and not the number of INJ addresses throughout the network.
const tiers=[
 {id:'shrimp',emoji:'🦐',it:'Gambero',english:'Shrimp',min:0,max:100,range:'< 100 INJ'},
 {id:'crab',emoji:'🦀',it:'Granchio',english:'Crab',min:100,max:1000,range:'100–999 INJ'},
 {id:'fish',emoji:'🐟',it:'Pesce',english:'Fish',min:1000,max:10000,range:'1.000–9.999 INJ'},
 {id:'shark',emoji:'🦈',it:'Squalo',english:'Shark',min:10000,max:100000,range:'10.000–99.999 INJ'},
 {id:'whale',emoji:'🐋',it:'Whale',english:'Whale',min:100000,max:Infinity,range:'≥ 100.000 INJ'}
];
const regex=/^inj1[02-9ac-hj-np-z]{35,90}$/;
const short=addr=>addr.length>18?addr.slice(0,9)+'…'+addr.slice(-6):addr;
function walletList(){
 const raw=read(WALLET_KEY);
 if(!Array.isArray(raw))return [];
 const seen=new Set();
 return raw.filter(w=>{
  const addr=String(w?.address||'').trim().toLowerCase();
  if(!regex.test(addr)||seen.has(addr))return false;seen.add(addr);return true;
 }).slice(0,30).map((w,i)=>({
  address:String(w.address).trim().toLowerCase(),
  label:String(w.label||('Wallet '+(i+1))).trim().slice(0,32)
 }));
}
function tierFor(balance){
 if(!Number.isFinite(balance)||balance<0)return null;
 return tiers.find(t=>balance>=t.min&&balance<t.max)||tiers.at(-1);
}
let syncing=false,lastSync=0,chainBalances=read(CHAIN_KEY);
if(!chainBalances||typeof chainBalances!=='object'||Array.isArray(chainBalances))chainBalances={};
let refreshButton=null;
function readPositions(){
 const saved=read(DASH_KEY)||{};
 const wallets=walletList();
 const positions=wallets.map(w=>{
  const cache=chainBalances[w.address];
  const fromWallet=saved[w.address];
  const localAt=num(fromWallet?.updated);
  const chainAt=num(cache?.at);
  const freshChain=Number.isFinite(chainAt)&&now()-chainAt<5*DAY&&Number.isFinite(num(cache?.total))&&num(cache.total)>=0;
  const validSaved=Number.isFinite(localAt)&&now()-localAt<7*DAY&&
   Number.isFinite(num(fromWallet?.total))&&num(fromWallet.total)>=0;
  const preferChain=freshChain&&(!validSaved||chainAt>localAt);
  const sample=preferChain?cache:validSaved?fromWallet:null;
  const at=preferChain?chainAt:validSaved?localAt:NaN;
  const count=sample?num(sample.total):NaN;
  return {...w,balance:Number.isFinite(count)&&count>=0?count:NaN,at,
   source:preferChain?'lcd':validSaved?'dashboard':'missing'};
 });
 const available=positions.filter(w=>Number.isFinite(w.balance)).sort((a,b)=>b.balance-a.balance);
 const ranks=new Map(available.map((w,i)=>[w.address,i+1]));
 return {wallets:positions,ranks,available};
}
function historical(){
 const host=$('injOriginSegments'),legend=$('injOriginLegend');
 if(!host||!legend)return;
 host.replaceChildren();legend.replaceChildren();
 for(const [i,item] of gen.entries()){
  const bar=el('span','inj-origin-segment inj-origin-'+item.id);
  bar.style.width=item.value+'%';
  bar.setAttribute('title',(en()?item.en:item.it)+' '+fmt(item.value,2)+'%');
  host.append(bar);
  const cell=el('div','inj-origin-legend-item');
  const dot=el('i','inj-origin-dot inj-origin-'+item.id);
  const name=el('span','inj-origin-name',en()?item.en:item.it);
  const val=el('strong','inj-origin-value',fmt(item.value,2)+'%');
  cell.append(dot,name,val);legend.append(cell);
 }
 host.setAttribute('aria-label',tr('Allocazione dei 100 milioni di INJ alla nascita, anno 2020.',
  '100 million INJ initial allocation in 2020.'));
}
function render(){
 const {wallets,available,ranks}=readPositions();
 $('injOwnershipHeading').textContent=tr('Distribuzione e Holder','Distribution & holders');
 $('injOwnershipSources').textContent=tr('Allocazione iniziale · wallet salvati','Initial allocation · saved wallets');
 $('injOriginHeading').textContent=tr('Allocazione iniziale · 100 milioni INJ','Initial allocation · 100 million INJ');
 $('injOriginTeam').textContent=tr('20% AL TEAM · NEL 2020','20% TEAM · IN 2020');
 $('injOriginWarning').textContent=tr(
  'La quota del 20% era destinata al team nel 2020: NON indica quanti token possiedano oggi Injective Labs o la Foundation. Non esiste qui un saldo aziendale verificato.',
  'The team received a 20% initial allocation in 2020: this is NOT what Injective Labs or the Foundation owns today. No verified corporate balance is available here.');
 $('injOriginSource').textContent=tr('Fonte: documento SEC · distribuzione iniziale ↗',
  'Source: SEC filing · initial allocation ↗');
 $('injGenTeamLabel').textContent=tr('TEAM · ASSEGNAZIONE 2020','TEAM · INITIAL ALLOCATION 2020');
 $('injGenTeamAmount').textContent=fmt(20000000,0)+' INJ';
 $('injCompanyHoldingsLabel').textContent=tr('INJECTIVE LABS · DETENUTI OGGI','INJECTIVE LABS · OWNED TODAY');
 $('injCompanyHoldings').textContent=tr('Non verificato','Not verified');
 $('injHoldersHeading').textContent=tr('Holder Distribution · I tuoi wallet','Holder distribution · Your wallets');
 $('injHoldersStatus').textContent=wallets.length?wallets.length+' '+tr('wallet monitorati','tracked wallets'):
   tr('Nessun wallet salvato','No saved wallets');
 $('injHoldersExplainer').textContent=tr(
  'Fasce indicative per quantità INJ. Posizione # interna ai soli wallet salvati, non rank mondiale. Il saldo comprende INJ disponibili, delegati e reward maturati nei riepiloghi verificati.',
  'Illustrative INJ amount tiers. Rank # is only among saved wallets, not a worldwide rank. Verified balances include available, delegated INJ and earned rewards.');
 $('injHoldersFoot').textContent=tr(
  'Non mostriamo classifiche mondiali presunte: gli elenchi ERC-20 su Ethereum comprendono i bridge e non descrivono tutti gli holder nativi di Injective.',
  'No guessed worldwide ranking: Ethereum ERC-20 lists include bridge balances and do not describe all native Injective holders.');
 $('injHolderSource').textContent=tr("L'explorer ufficiale InjScan e i suoi holder ↗",
  'Official InjScan explorer and token holders ↗');
 if(refreshButton){
  refreshButton.textContent=syncing?tr('Aggiornamento…','Updating…'):
    tr('Aggiorna saldi on-chain ↻','Refresh on-chain balances ↻');
  refreshButton.disabled=syncing||!wallets.length;
 }
 historical();
 const tierHost=$('injHoldersTiers');tierHost.replaceChildren();
 for(const tier of tiers){
  const count=available.filter(w=>tierFor(w.balance)?.id===tier.id).length;
  const card=el('div','inj-holder-tier inj-holder-tier-'+tier.id);
  const line=el('div','inj-holder-tier-heading');
  const name=el('strong','',tier.emoji+' '+(en()?tier.english:tier.it));
  const n=el('strong','inj-holder-tier-count',count+' / '+available.length);
  line.append(name,n);
  const scale=el('div','inj-holder-tier-track');
  const fill=el('span','inj-holder-tier-fill');
  fill.style.width=available.length?(count/available.length*100).toFixed(1)+'%':'0%';
  scale.append(fill);
  card.append(line,el('small','',tier.range),scale);
  tierHost.append(card);
 }
 const host=$('injHoldersList');host.replaceChildren();
 if(!wallets.length){
  host.append(el('p','inj-holder-empty',tr(
   'Salva gli indirizzi nella Home per visualizzare la distribuzione dei tuoi wallet.',
   'Save wallet addresses in Home to see their size distribution.')));
  return;
 }
 const sorted=wallets.slice().sort((a,b)=>{
  if(!Number.isFinite(a.balance))return Number.isFinite(b.balance)?1:0;
  if(!Number.isFinite(b.balance))return -1;
  return b.balance-a.balance;
 });
 for(const w of sorted){
  const tier=tierFor(w.balance),rank=ranks.get(w.address);
  const line=el('div','inj-holder-row');
  const pos=el('span','inj-holder-rank',rank?'#'+rank:'—');
  const who=el('div','inj-holder-identity');
  who.append(el('strong','',w.label),el('small','',short(w.address)));
  const amt=el('div','inj-holder-amount');
  const count=el('strong','',Number.isFinite(w.balance)?fmt(w.balance,3)+' INJ':'— INJ');
  const category=el('span','inj-holder-category',tier?tier.emoji+' '+(en()?tier.english:tier.it):tr('Da aggiornare','Needs refresh'));
  const source=el('small','inj-holder-source',
   Number.isFinite(w.at)?(w.source==='lcd'?'Injective LCD · ':'Dashboard · ')+
   new Date(w.at).toLocaleDateString(en()?'en-US':'it-IT',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):
   tr('Nessun saldo verificato','No verified balance'));
  amt.append(count,category,source);line.append(pos,who,amt);host.append(line);
 }
}
async function get(url,timeout=8500){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);
 try{
  const r=await fetch(url,{signal:ctrl.signal,cache:'no-store'});
  if(!r.ok)throw Error('HTTP '+r.status);
  return await r.json();
 }finally{clearTimeout(timer)}
}
function injAmount(rows){
 if(!Array.isArray(rows))return NaN;
 return rows.filter(x=>x?.denom==='inj').reduce((sum,x)=>sum+(Number(x.amount)||0)/1e18,0);
}
async function accountBalance(address){
 for(const endpoint of LCD){
  try{
   const p=[
    '/cosmos/bank/v1beta1/balances/'+encodeURIComponent(address),
    '/cosmos/staking/v1beta1/delegations/'+encodeURIComponent(address),
    '/cosmos/distribution/v1beta1/delegators/'+encodeURIComponent(address)+'/rewards'
   ];
   const all=await Promise.all(p.map(x=>get(endpoint+x,6500)));
   const bank=injAmount(all[0]?.balances);
   const stake=(all[1]?.delegation_responses||[]).reduce((acc,v)=>acc+
    (v?.balance?.denom==='inj'?(Number(v.balance.amount)||0)/1e18:0),0);
   const rewards=injAmount(all[2]?.total||[]);
   if(!Number.isFinite(bank)||!Number.isFinite(stake)||!Number.isFinite(rewards)||bank<0||stake<0||rewards<0)
    throw Error('Invalid chain balance');
   return {total:bank+stake+rewards,available:bank,staked:stake,rewards,at:now()};
  }catch(_){}
 }
 throw Error('Native LCD read unavailable');
}
async function refresh(){
 if(syncing||now()-lastSync<30000)return;
 const wallets=walletList();if(!wallets.length)return;
 syncing=true;lastSync=now();render();
 let ok=0;
 try{
  // At most 3 concurrent native accounts to reduce LCD rate limiting.
  for(let i=0;i<wallets.length;i+=3){
   const chunk=wallets.slice(i,i+3);
   const results=await Promise.allSettled(chunk.map(w=>accountBalance(w.address)));
   results.forEach((r,j)=>{
    if(r.status==='fulfilled'){
     chainBalances[chunk[j].address]=r.value;ok++;
    }
   });
  }
  save(CHAIN_KEY,chainBalances);
 }finally{
  syncing=false;render();
  const status=$('injHoldersStatus');
  if(status)status.textContent=ok?tr('Aggiornati ','Updated ')+ok+'/'+wallets.length+
    tr(' · saldi on-chain',' · native balances'):
    tr('Nodo non disponibile · riepiloghi salvati','LCD unavailable · using saved balances');
 }
}
const controls=$('injHoldersStatus')?.parentElement;
if(controls){
 refreshButton=el('button','inj-holder-refresh');
 refreshButton.type='button';
 refreshButton.addEventListener('click',refresh);
 controls.append(refreshButton);
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
window.addEventListener('pageshow',render,{passive:true});
window.addEventListener('storage',e=>{
 if([WALLET_KEY,DASH_KEY,CHAIN_KEY].includes(e.key))render();
});
window.addEventListener('message',e=>{
 if(e.origin===location.origin&&e.data?.type==='injnode:market:language')render();
});
setInterval(()=>{if(!document.hidden)render()},60000);
render();
})();