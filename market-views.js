/* INJ Node — Global Crypto, Heatmap and Favorites: one live market data source. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const global=$('injGlobalMarket'),heat=$('marketHeatmap'),list=$('hybridPro'),rows=$('marketProRows');
 const grid=$('marketHeatmapGrid'),legacy=global?.querySelector('.tablewrap');
 const favControls=$('marketFavoritesControls'),favModes=$('marketFavoritesModes'),scope=$('scope'),nav=$('injIntelRoot');
 if(!global||!heat||!list||!rows||!grid||!legacy||!favControls||!favModes||!nav)return;
 const key='inj_node_market_heat_range_v1',favoritesKey='inj_node_crypto_favorites_v1',
  favoriteModeKey='inj_node_crypto_favorites_mode_v1';
 const en=()=>document.documentElement.lang==='en',tr=(it,eng)=>en()?eng:it;
 const rangeChoices=['1h','24h','7d','30d'];
 const read=()=>{try{return localStorage.getItem(key)}catch(_){return null}};
 const save=value=>{try{localStorage.setItem(key,value)}catch(_){}};
 const api=()=>window.INJ_MARKET_VIEW_API;
 const num=x=>x===undefined||x===null||x===''?NaN:Number(x);
 const finite=x=>Number.isFinite(num(x));
 const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=(value,compact=false)=>api()?.formatMoney?.(num(value),compact)||'—';
 const percent=value=>api()?.formatPercent?.(num(value))||'—';
 const change=(coin,frame)=>num(api()?.getChange?.(coin,frame));
 const tone=v=>!Number.isFinite(v)?'flat':v>0?'up':v<0?'down':'flat';
 function readFavorites(){
  const result=new Map();
  try{
   const saved=JSON.parse(localStorage.getItem(favoritesKey)||'[]');
   if(Array.isArray(saved))for(const item of saved){
    const id=String(item?.id||'').trim();
    if(!/^[a-z0-9][a-z0-9_.-]{0,99}$/i.test(id)||result.has(id)||result.size>=250)continue;
    result.set(id,{id,name:String(item.name||id).slice(0,90),symbol:String(item.symbol||'').slice(0,18)});
   }
  }catch(_){}
  return result;
 }
 let favorites=readFavorites();
 const persistFavorites=()=>{try{localStorage.setItem(favoritesKey,JSON.stringify([...favorites.values()]))}catch(_){}};
 let section='global',mode='list',range=rangeChoices.includes(read())?read():'24h',
     favoriteLayout=readLocalFavoriteMode(),favoritesEditing=false,pendingRemovalId=null,lastRemoved=null,undoTimer=null;
 function readLocalFavoriteMode(){
  try{return localStorage.getItem(favoriteModeKey)==='heatmap'?'heatmap':'list'}catch(_){return 'list'}
 }
 let listTiles=new Map(),mapTiles=new Map(),pending=new Set(),renderQueued=false,timer=null;
 const all=()=>api()?.getCoins?.()||[];
 // Applies exclusively to the Heatmap. Global Crypto preserves the full Top 200.
 // Match identifiers/names as well as tickers; do not filter native BTC, ETH, SOL or INJ.
 const stableSymbols=new Set(['USDT','USDC','DAI','USDS','USDE','USDD','USD1','PYUSD','FDUSD','TUSD','FRAX','LUSD','GUSD','PAX','USDP','RLUSD','USDY','USD0','CRVUSD','GHO','EURI','EURC','EUROC','AEUR','SUSD','USDB','USDT0','BUSD','USTC','MIM','CUSD','USDF','BFUSD','USDX']);
 const wrappedSymbols=new Set(['WBTC','WETH','WBETH','WSTETH','STETH','WEETH','EETH','CBETH','CBBTC','BTCB','BBTC','TBTC','FBTC','RETH','SFRXETH','WBNB','WSOL','WMATIC','WPOL','WAVAX','WFTM','WTRX','WSTUSR','WUSDM','WRSETH','RSETH','EZETH']);
 const stableIds=new Set(['tether','usd-coin','dai','usds','ethena-usde','first-digital-usd','paypal-usd','world-liberty-financial-usd','frax','frax-usd','pax-dollar','paxos-standard','true-usd','gemini-dollar','ripple-usd','global-dollar','usual-usd','sky-dollar','usdd','liquity-usd','gho','curve-usd','euro-coin','euro-coinvertible','binance-usd','magic-internet-money','stasis-eurs','usd1']);
 function heatmapEligible(coin){
  const symbol=String(coin.symbol||'').trim().toUpperCase();
  const id=String(coin.id||'').trim().toLowerCase();
  const name=String(coin.name||'').trim().toLowerCase();
  if(stableSymbols.has(symbol)||wrappedSymbols.has(symbol)||stableIds.has(id))return false;
  if(/^(wrapped|bridged|binance-peg|wormhole|coinbase-wrapped|synthetic|liquid-staked|liquid-staking|wrapped-staked|staked|restaked|restaking)[-\s]/i.test(id)||/^(wrapped|bridged|binance-peg|wormhole|coinbase wrapped|synthetic|liquid staked|staked|restaked)\b/.test(name))return false;
  if(/\b(stablecoin|stable coin|bridged usdt|bridged usdc|wrapped bitcoin|wrapped ethereum|wrapped ether|wrapped btc|wrapped eth)\b/.test(name))return false;
  return true;
 }
 // Skip incomplete quote records. A missing single optional chart or metric
 // should not hide an otherwise valid coin from the vertical Global Crypto list.
 function hasMarketQuote(coin){
  if(!coin||typeof coin!=='object')return false;
  const id=String(coin.id||'').trim(),name=String(coin.name||'').trim(),symbol=String(coin.symbol||'').trim();
  const price=num(coin.current_price);
  if(!id||!name||!symbol||!Number.isFinite(price)||price<=0)return false;
  const cap=num(coin.market_cap),volume=num(coin.total_volume),daily=change(coin,'24h');
  return (Number.isFinite(cap)&&cap>0)||(Number.isFinite(volume)&&volume>0)||Number.isFinite(daily);
 }
 // A Heatmap tile has no meaningful red/green fill without the chosen period.
 // Do not show black "—" tiles for missing or invalid timeframe samples.
 function hasHeatmapData(coin){
  return hasMarketQuote(coin)&&Number.isFinite(change(coin,range));
 }
 function filtered(){
  const count=Number($('scope')?.value)||200;
  const query=String($('search')?.value||'').trim().toLowerCase();
  const direction=$('direction')?.value||'all';
  const rankedTop=section==='favorites'
   ?[...favorites.keys()].map(id=>all().find(c=>c.id===id)).filter(Boolean)
   :all().slice(0,count);
  const eligible=mode==='heatmap'
   ?rankedTop.filter(coin=>(section==='favorites'||heatmapEligible(coin))&&hasHeatmapData(coin))
   :rankedTop.filter(hasMarketQuote);
  return eligible.filter(coin=>{
   if(query&&!String(coin.name+' '+coin.symbol).toLowerCase().includes(query))return false;
   const day=change(coin,'24h');
   return direction==='all'||(direction==='up'&&Number.isFinite(day)&&day>=0)||(direction==='down'&&Number.isFinite(day)&&day<0);
  });
 }
 function ranked(items){return [...items].sort((a,b)=>(finite(a.market_cap_rank)?num(a.market_cap_rank):99999)-(finite(b.market_cap_rank)?num(b.market_cap_rank):99999))}
 function sorted(items){
  const sort=$('marketProSort')?.value||'rank';
  if(sort==='rank')return ranked(items);
  const values={change:c=>change(c,'24h'),volume:c=>num(c.total_volume),price:c=>num(c.current_price)};
  const get=values[sort]||values.change;
  return [...items].sort((a,b)=>{
   const va=get(a),vb=get(b);
   return (finite(vb)?vb:-Infinity)-(finite(va)?va:-Infinity);
  });
 }
 function spark(coin){
  const source=coin.sparkline_in_7d?.price;
  if(!Array.isArray(source)||source.length<2)return '—';
  const data=source.map(num).filter(Number.isFinite);
  if(data.length<2)return '—';
  const stride=Math.max(1,Math.ceil(data.length/35));
  const sample=data.filter((_,i)=>i%stride===0||i===data.length-1);
  const low=Math.min(...sample),high=Math.max(...sample),span=high-low||1;
  const points=sample.map((v,i)=>((100*i)/(sample.length-1)).toFixed(1)+','+(36-(v-low)/span*31).toFixed(1)).join(' ');
  return '<svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true" class="mp-spark '+tone(sample.at(-1)-sample[0])+'"><polyline points="'+points+'"/></svg>';
 }
 function pctHtml(coin,k){
  const v=change(coin,k);return '<span class="mp-percent mp-'+k+' '+tone(v)+'">'+escape(percent(v))+'</span>';
 }
 const favoriteIcon='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m12 2.5 2.9 5.88 6.49.94-4.7 4.58 1.11 6.47L12 17.32l-5.8 3.05 1.1-6.47-4.7-4.58 6.5-.94Z"/></svg>';
 function favoriteLabel(coin,saved){
  const symbol=String(coin.symbol||'').toUpperCase(),name=String(coin.name||coin.id);
  return (saved?tr('Rimuovi dai preferiti: ','Remove from favorites: '):tr('Aggiungi ai preferiti: ','Add to favorites: '))+name+' ('+symbol+')';
 }
 function favoriteButtonHtml(coin){
  const saved=favorites.has(coin.id);
  return '<button type="button" class="market-favorite-toggle'+(saved?' is-saved':'')+'" data-favorite-id="'+escape(coin.id)+'" data-favorite-name="'+escape(coin.name)+'" data-favorite-symbol="'+escape(coin.symbol)+'" aria-pressed="'+saved+'" aria-label="'+escape(favoriteLabel(coin,saved))+'" title="'+escape(favoriteLabel(coin,saved))+'">'+favoriteIcon+'</button>';
 }
 function makeFavoriteButton(coin){
  const fragment=document.createElement('template');
  fragment.innerHTML=favoriteButtonHtml(coin);
  return fragment.content.firstElementChild;
 }
 function updateFavoriteButton(button){
  const id=button?.dataset?.favoriteId;if(!id)return;
  const coin=all().find(c=>c.id===id)||{id,name:button.dataset.favoriteName,symbol:button.dataset.favoriteSymbol};
  const saved=favorites.has(id),label=favoriteLabel(coin,saved);
  button.classList.toggle('is-saved',saved);
  button.setAttribute('aria-pressed',String(saved));
  button.setAttribute('aria-label',label);
  button.title=label;
 }
 function updateFavoritesUI(){
  const size=favorites.size,count=$('injFavoriteTabCount');
  if(count){count.textContent=String(size);count.hidden=size===0;}
  if(section!=='favorites'||favoriteLayout!=='list'||size===0)favoritesEditing=false;
  const manage=$('marketFavoritesManage');
  if(manage){
   manage.hidden=section!=='favorites'||favoriteLayout!=='list'||size===0;
   manage.textContent=favoritesEditing?tr('Fine','Done'):tr('Gestisci','Manage');
   manage.setAttribute('aria-pressed',String(favoritesEditing));
  }
  favControls.classList.toggle('is-editing',favoritesEditing);
  list.classList.toggle('favorites-readonly',section==='favorites'&&!favoritesEditing);
  const undoButton=$('marketFavoritesUndoButton');
  if(undoButton)undoButton.textContent=tr('Annulla','Undo');
  const confirmTitle=$('marketFavoriteConfirmTitle');
  if(confirmTitle)confirmTitle.textContent=tr('Rimuovere dai preferiti?','Remove from favorites?');
  const cancelButton=$('marketFavoriteConfirmCancel');
  if(cancelButton)cancelButton.textContent=tr('Annulla','Cancel');
  const removeButton=$('marketFavoriteConfirmRemove');
  if(removeButton)removeButton.textContent=tr('Rimuovi','Remove');
  $('marketFavoritesHeading').textContent=tr('I tuoi preferiti','Your favorites');
  $('marketFavoritesStatus').textContent=size
   ?size+' '+tr(size===1?'crypto salvata':'crypto salvate',size===1?'saved crypto':'saved cryptos')+' · '+tr('su questo dispositivo','on this device')
   :tr('Tocca la stella accanto a una crypto in Global Crypto','Tap a star beside any coin in Global Crypto');
  $('marketFavoritesList').textContent=tr('Lista','List');
  $('marketFavoritesMap').textContent='Heatmap';
  favModes.setAttribute('aria-label',tr('Visualizzazione preferiti','Favorites view'));
  favModes.querySelectorAll('[data-favorite-mode]').forEach(b=>{
   b.setAttribute('aria-pressed',String(b.dataset.favoriteMode===favoriteLayout));
  });
  const missing=all().length?[...favorites.keys()].filter(id=>!all().some(c=>c.id===id)).length:0;
  const note=$('marketFavoritesUnavailable');
  if(note){
   note.hidden=!missing;
   note.textContent=missing+' '+tr(missing===1?'preferito non presente nella Top 200 attuale':'preferiti non presenti nella Top 200 attuale',
      missing===1?'favorite currently outside the Top 200':'favorites currently outside the Top 200')
      +' · '+tr('salvataggio conservato','still saved');
  }
 }
 function toggleFavorite(id,name,symbol){
  if(favorites.has(id))favorites.delete(id);
  else favorites.set(id,{id,name:String(name||id).slice(0,90),symbol:String(symbol||'').slice(0,18)});
  persistFavorites();
  updateFavoritesUI();
  if(section==='favorites')requestRender();
  else document.querySelectorAll('[data-favorite-id]').forEach(updateFavoriteButton);
 }
 function setFavoritesEditing(enabled){
  favoritesEditing=Boolean(enabled)&&section==='favorites'&&favoriteLayout==='list'&&favorites.size>0;
  updateFavoritesUI();
  requestRender();
 }
 const confirmation=$('marketFavoriteConfirm');
 function hideFavoriteUndo(){
  if(undoTimer){clearTimeout(undoTimer);undoTimer=null;}
  lastRemoved=null;
  const banner=$('marketFavoritesUndo');
  if(banner)banner.hidden=true;
 }
 function showFavoriteUndo(item,index){
  hideFavoriteUndo();
  lastRemoved={item,index};
  const message=$('marketFavoritesUndoText'),banner=$('marketFavoritesUndo');
  if(message)message.textContent=tr('Rimossa dai preferiti: ','Removed from favorites: ')+item.name+' ('+String(item.symbol).toUpperCase()+')';
  if(banner)banner.hidden=false;
  undoTimer=setTimeout(hideFavoriteUndo,8000);
 }
 function undoFavoriteRemoval(){
  const removed=lastRemoved;
  if(!removed)return;
  hideFavoriteUndo();
  if(favorites.has(removed.item.id))return;
  const entries=[...favorites.entries()];
  entries.splice(Math.max(0,Math.min(removed.index,entries.length)),0,[removed.item.id,removed.item]);
  favorites=new Map(entries);
  persistFavorites();
  updateFavoritesUI();
  requestRender();
 }
 function finishFavoriteRemoval(){
  const id=pendingRemovalId;
  pendingRemovalId=null;
  if(confirmation?.open)confirmation.close();
  if(!id||!favorites.has(id))return;
  const item=favorites.get(id),index=[...favorites.keys()].indexOf(id);
  favorites.delete(id);
  persistFavorites();
  updateFavoritesUI();
  requestRender();
  showFavoriteUndo(item,index);
 }
 function requestFavoriteRemoval(id){
  if(section!=='favorites'||favoriteLayout!=='list'||!favoritesEditing||!favorites.has(id))return;
  const item=favorites.get(id);
  pendingRemovalId=id;
  const description=tr('Vuoi rimuovere ','Do you want to remove ')+item.name+' ('+String(item.symbol).toUpperCase()+')'+tr(' dalla lista dei preferiti?',' from your favorites list?');
  const target=$('marketFavoriteConfirmText');
  if(target)target.textContent=description;
  if(confirmation?.showModal){
   if(!confirmation.open)confirmation.showModal();
  }else if(window.confirm(description)){
   finishFavoriteRemoval();
  }else pendingRemovalId=null;
 }
 function favoriteRemoveHtml(coin){
  if(!favoritesEditing)return '';
  const label=tr('Rimuovi dai preferiti: ','Remove from favorites: ')+coin.name+' ('+String(coin.symbol||'').toUpperCase()+')';
  return '<button type="button" class="market-favorite-remove" data-favorite-id="'+escape(coin.id)+'" aria-label="'+escape(label)+'" title="'+escape(label)+'"><span aria-hidden="true">−</span></button>';
 }
 function rowHtml(coin){
  const chart=spark(coin);
  const rank=finite(coin.market_cap_rank)?'#'+num(coin.market_cap_rank):'—';
  const symbol=String(coin.symbol||'').toUpperCase();
  return '<div class="market-favorite-row'+(section==='favorites'&&!favoritesEditing?' is-readonly':'')+'"><button type="button" class="mp-row" data-coin="'+escape(coin.id)+'" data-previous-price="'+escape(coin.current_price)+'" aria-label="'+escape(coin.name+' '+symbol)+'">'+
  '<span class="mp-identity"><span class="mp-rank">'+rank+'</span>'+(String(coin.image||'').trim()?'<img loading="lazy" referrerpolicy="no-referrer" src="'+escape(coin.image)+'" alt="">':'')+'<span class="mp-name"><strong>'+escape(coin.name)+'</strong><small>'+escape(symbol)+'</small></span></span>'+
  '<span class="mp-price"><strong class="mp-price-value">'+escape(money(coin.current_price))+'</strong><small class="mp-mobile-label">'+escape(money(coin.market_cap,true))+' Cap</small></span>'+
  '<span class="mp-change mp-hour">'+pctHtml(coin,'1h')+'</span>'+
  '<span class="mp-change mp-day">'+pctHtml(coin,'24h')+'</span>'+
  '<span class="mp-change mp-week">'+pctHtml(coin,'7d')+'</span>'+
  '<span class="mp-change mp-month">'+pctHtml(coin,'30d')+'</span>'+
  '<span class="mp-stat mp-cap">'+escape(money(coin.market_cap,true))+'</span>'+
  '<span class="mp-stat mp-volume">'+escape(money(coin.total_volume,true))+'</span>'+
  '<span class="mp-chart">'+(chart==='—'?'':chart)+'</span></button>'+(section==='global'?favoriteButtonHtml(coin):favoriteRemoveHtml(coin))+'</div>';
 }
 function renderList(items){
  const coins=sorted(items),template=document.createElement('template'),next=new Map();
  template.innerHTML=coins.length?coins.map(rowHtml).join(''):'<div class="mp-empty">'+
   (section==='favorites'&&favorites.size===0
    ?tr('Nessuna crypto salvata. Tocca una stella in Global Crypto.','No saved cryptos yet. Tap a star in Global Crypto.')
    :all().length?tr('Nessun risultato o prezzo attualmente disponibile','No matching results or currently available quotes')
    :tr('Caricamento criptovalute…','Loading cryptocurrencies…'))+'</div>';
  rows.replaceChildren(template.content);
  rows.querySelectorAll('.mp-row[data-coin]').forEach(el=>next.set(el.dataset.coin,el));
  listTiles=next;
  $('mpMetaCount').textContent=tr('Crypto visualizzate: ','Displayed assets: ')+coins.length;
 }
 function tile(coin){
  const v=change(coin,range),node=document.createElement('button');
  const symbol=String(coin.symbol||'').toUpperCase();
  node.type='button';node.className='heatmap-tile';node.dataset.coin=coin.id;
  node.dataset.previousPrice=String(coin.current_price);
  if(coin.id==='injective-protocol')node.classList.add('is-inj');
  const identity=document.createElement('span');identity.className='hm-identity';
  const imageUrl=String(coin.image||'').trim();
  if(/^https:\/\//i.test(imageUrl)){
   const icon=document.createElement('img');
   icon.className='hm-icon';icon.src=imageUrl;icon.alt='';
   icon.loading='lazy';icon.decoding='async';icon.referrerPolicy='no-referrer';
   identity.append(icon);
  }
  const labels=document.createElement('span');labels.className='hm-labels';
  const sym=document.createElement('strong');sym.className='hm-symbol';sym.textContent=symbol;
  const name=document.createElement('small');name.className='hm-name';name.textContent=String(coin.name||'');
  labels.append(sym,name);identity.append(labels);
  node.append(identity);
  if(finite(coin.market_cap_rank)){
   const badge=document.createElement('small');
   badge.className='hm-rank';badge.textContent='#'+Math.trunc(num(coin.market_cap_rank));
   node.append(badge);
  }
  const value=document.createElement('span');value.className='hm-change';
  const price=document.createElement('small');price.className='hm-price';
  node.append(price,value);
  recolor(node,coin,v);
  return node;
 }
 function recolor(node,coin,newValue){
  const delta=newValue===undefined?change(coin,range):newValue;
  node.classList.toggle('is-up',delta>0);
  node.classList.toggle('is-down',delta<0);
  node.classList.toggle('is-flat',!Number.isFinite(delta)||delta===0);
  const strength=Number.isFinite(delta)?Math.min(58,22+Math.log1p(Math.abs(delta))*13):0;
  node.style.setProperty('--heat-fill',strength.toFixed(0)+'%');
  node.style.setProperty('--heat-rim',(Math.min(78,Math.max(30,strength+13))).toFixed(0)+'%');
  const label=percent(delta),price=money(coin.current_price);
  const p=node.querySelector('.hm-change'),priceNode=node.querySelector('.hm-price');
  if(p&&p.textContent!==label)p.textContent=label;
  if(priceNode&&priceNode.textContent!==price)priceNode.textContent=price;
  node.dataset.displayPrice=price;
  const text=coin.name+' ('+String(coin.symbol||'').toUpperCase()+') · '+range.toUpperCase()+' '+label+' · '+price;
  node.setAttribute('aria-label',text);
  node.title=text;
 }
 function renderMap(items){
  const coins=ranked(items),next=new Map();
  // Preserve each card, logo and its composited background between feeds:
  // replacing the whole grid every 90s makes iPad Safari visibly flash.
  const sameOrder=coins.length>0&&grid.children.length===coins.length
   &&coins.every((coin,i)=>grid.children[i]?.dataset.coin===coin.id);
  if(coins.length){
   for(const coin of coins){
    const el=mapTiles.get(coin.id)||tile(coin);
    recolor(el,coin);
    el.dataset.previousPrice=String(coin.current_price);
    const symbol=el.querySelector('.hm-symbol'),name=el.querySelector('.hm-name'),rank=el.querySelector('.hm-rank');
    const newSymbol=String(coin.symbol||'').toUpperCase(),newName=String(coin.name||'');
    if(symbol&&symbol.textContent!==newSymbol)symbol.textContent=newSymbol;
    if(name&&name.textContent!==newName)name.textContent=newName;
    const newRank=finite(coin.market_cap_rank)?'#'+Math.trunc(num(coin.market_cap_rank)):'';
    if(rank&&rank.textContent!==newRank)rank.textContent=newRank;
    next.set(coin.id,el);
   }
   // When ranks change, move only cards that actually changed position.
   // Never replace the full grid (even when a couple of rankings swap).
   if(!sameOrder){
    for(let i=0;i<coins.length;i++){
     const el=next.get(coins[i].id),at=grid.children[i]||null;
     if(at!==el)grid.insertBefore(el,at);
    }
    for(const child of Array.from(grid.children)){
     if(!next.has(child.dataset.coin))child.remove();
    }
   }
  }else{
   const message=section==='favorites'&&favorites.size===0
    ?tr('Nessuna crypto salvata. Tocca una stella in Global Crypto.','No saved cryptos yet. Tap a star in Global Crypto.')
    :all().length?tr('Nessuna crypto con dati disponibili per questo periodo','No cryptos with available data for this period')
    :tr('Caricamento dati di mercato…','Loading market data…');
   let empty=grid.querySelector('.heatmap-empty');
   if(!empty){empty=document.createElement('div');empty.className='heatmap-empty';grid.replaceChildren(empty);}
   if(empty.textContent!==message)empty.textContent=message;
  }
  mapTiles=next;
  $('heatmapCount').textContent=tr('Crypto visualizzate: ','Displayed assets: ')+coins.length;
 }
 function render(){
  if(global.hidden)return;
  updateFavoritesUI();
  const coins=filtered();
  if(mode==='heatmap')renderMap(coins);
  else renderList(coins);
 }
 function requestRender(){
  if(renderQueued)return;
  renderQueued=true;
  requestAnimationFrame(()=>{renderQueued=false;render()});
 }
 function setView(next){
  section=next==='favorites'?'favorites':next==='heatmap'?'heatmap':'global';
  if(section==='favorites'){
   const intel=$('injIntelligenceMain');
   if(intel)intel.hidden=true;
   global.hidden=false;
   document.documentElement.dataset.marketSection='favorites';
  }
  mode=section==='favorites'?favoriteLayout:section==='heatmap'?'heatmap':'list';
  if(timer){clearTimeout(timer);timer=null}
  pending.clear();
  document.documentElement.dataset.marketMode=mode;
  list.hidden=mode!=='list';
  heat.hidden=mode!=='heatmap';
  legacy.hidden=true;
  favControls.hidden=section!=='favorites';
  scope.hidden=section==='favorites';
  $('marketProSort').hidden=mode==='heatmap';
  $('marketHeading').textContent=section==='favorites'?tr('Preferiti','Favorites'):mode==='heatmap'?'Market Heatmap':'Global Crypto';
  $('mpMetaTitle').innerHTML=section==='favorites'?tr('PREFERITI','FAVORITES')+' <span>· HYBRID PRO</span>':'HYBRID PRO <span>· MARKET WATCH</span>';
  updateFavoritesUI();
  requestRender();
 }
 // Favorites opens independently of an older cached section-router.
 function openFavoritesTab(event){
  event.preventDefault();
  event.stopImmediatePropagation();
  if(typeof window.INJ_MARKET_NAVIGATE==='function'){
   window.INJ_MARKET_NAVIGATE('favorites');
   return;
  }
  try{localStorage.setItem('inj_node_intel_view_v1','favorites')}catch(_){}
  const intel=$('injIntelligenceMain');if(intel)intel.hidden=true;
  global.hidden=false;
  document.documentElement.dataset.marketSection='favorites';
  const suffix=$('injIntelHeaderSuffix');
  if(suffix)suffix.textContent=tr('PREFERITI','FAVORITES');
  nav.querySelectorAll('[data-inj-intel-view]').forEach(b=>{
   b.setAttribute('aria-pressed',String(b.dataset.injIntelView==='favorites'));
  });
  setView('favorites');
 }
 $('injIntelTabFavorites')?.addEventListener('click',openFavoritesTab,{capture:true});
 function setFavoriteLayout(next){
  if(next!=='list'&&next!=='heatmap')return;
  favoriteLayout=next;
  try{localStorage.setItem(favoriteModeKey,next)}catch(_){}
  if(section==='favorites')setView('favorites');
  else updateFavoritesUI();
 }
 function setRange(next){
  if(!rangeChoices.includes(next))return;
  range=next;save(range);
  $('heatmapPerformanceSource').textContent=tr('Performance '+range.toUpperCase(),'Performance '+range.toUpperCase());
  heat.querySelectorAll('[data-heat-range]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.heatRange===range)));
  // The timeframe affects the actual percent, tile tint and edge signal.
  // Rebuild because a coin may lack performance observations for a given period.
  if(mode==='heatmap')requestRender();
 }
 // Flash only actual visible price changes. A short finite pulse, not a permanent glow.
 function priceFlash(element,direction,tile=false){
  if(!element||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
  if(tile){
   // The pulse must match the tile's selected-timeframe colour, not the
   // direction of an unrelated instantaneous market tick.
   if(element.classList.contains('is-up'))direction='up';
   else if(element.classList.contains('is-down'))direction='down';
   else return;
   // Avoid rearming an ongoing or just-ended pulse when the feed is busy.
   const now=performance.now(),last=Number(element.dataset.lastHeatPulse||0);
   if(last&&now-last<1850)return;
   element.dataset.lastHeatPulse=String(now);
  }
  if(!direction)return;
  const rise=direction==='up'?'market-flash-up':'market-flash-down';
  element.classList.remove('market-flash-up','market-flash-down');
  // Only one colour transition per real displayed-price change.
  void element.offsetWidth;
  element.classList.add(rise);
 }
 function tick(coin){
  if(global.hidden)return;
  const active=mode==='heatmap'?mapTiles:listTiles;
  if(!active.has(coin.id))return;
  pending.add(coin.id);
  if(timer)return;
  timer=setTimeout(()=>{
   timer=null;
   const byId=new Map(all().map(c=>[c.id,c]));
   for(const id of pending){
    const current=byId.get(id),element=active.get(id);
    if(!element||!current)continue;
    if(mode==='heatmap'){
     // Light the fixed edge ONLY for a true underlying price change.
     // Percent/date updates or repeated quotes must not fire the bar.
     const previous=Number(element.dataset.previousPrice);
     const currentPrice=num(current.current_price);
     // A quote change must also alter the displayed price: tiny rounding
     // differences should never produce a seemingly random flashing bar.
     const previousText=element.dataset.displayPrice||'';
     const nextText=money(currentPrice);
     const changed=Number.isFinite(previous)&&previous>0
       &&Number.isFinite(currentPrice)&&currentPrice>0
       &&currentPrice!==previous&&previousText!==nextText;
     recolor(element,current);
     if(changed)priceFlash(element,currentPrice>previous?'up':'down',true);
     element.dataset.previousPrice=String(current.current_price);
     continue;
    }
    const price=element.querySelector('.mp-price-value'),next=money(current.current_price);
    if(price&&price.textContent!==next){
     const prior=Number(element.dataset.previousPrice||0);
     price.textContent=next;
     if(prior>0)priceFlash(price,current.current_price>prior?'up':'down');
    }
    element.dataset.previousPrice=String(current.current_price);
    for(const k of ['1h','24h','7d','30d']){
     const span=element.querySelector('.mp-'+k);
     if(!span)continue;
     const value=change(current,k);
     span.textContent=percent(value);
     span.className='mp-percent mp-'+k+' '+tone(value);
    }
   }
   pending.clear();
  },1500);
 }
 function languageChange(){
  $('injFavoriteTabLabel').textContent=tr('Preferiti','Favorites');
  $('marketProSort').setAttribute('aria-label',tr('Ordina Crypto','Sort cryptos'));
  $('heatmapCount').textContent=tr('Crypto visualizzate: ','Displayed assets: ')+mapTiles.size;
  $('heatmapNote').textContent=tr('Verde: rialzo · Rosso: ribasso','Green: up · Red: down');
  $('heatmapPerformanceSource').textContent=tr('Performance '+range.toUpperCase(),'Performance '+range.toUpperCase());
  $('marketHeading').textContent=section==='favorites'?tr('Preferiti','Favorites'):mode==='heatmap'?'Market Heatmap':'Global Crypto';
  $('mpMetaTitle').innerHTML=section==='favorites'?tr('PREFERITI','FAVORITES')+' <span>· HYBRID PRO</span>':'HYBRID PRO <span>· MARKET WATCH</span>';
  updateFavoritesUI();
  requestRender();
 }
 $('heatmapRanges').addEventListener('click',e=>{
  const b=e.target.closest('[data-heat-range]');if(b)setRange(b.dataset.heatRange);
 });
 $('marketProSort').addEventListener('change',requestRender);
 favModes.addEventListener('click',e=>{
  const b=e.target.closest('[data-favorite-mode]');
  if(b)setFavoriteLayout(b.dataset.favoriteMode);
 });
 $('marketFavoritesManage')?.addEventListener('click',()=>setFavoritesEditing(!favoritesEditing));
 $('marketFavoritesUndoButton')?.addEventListener('click',undoFavoriteRemoval);
 $('marketFavoriteConfirmCancel')?.addEventListener('click',()=>confirmation?.close());
 $('marketFavoriteConfirmRemove')?.addEventListener('click',finishFavoriteRemoval);
 confirmation?.addEventListener('close',()=>{pendingRemovalId=null;});
 window.addEventListener('storage',e=>{
  if(e.key===favoritesKey){favorites=readFavorites();updateFavoritesUI();requestRender();}
  if(e.key===favoriteModeKey){favoriteLayout=readLocalFavoriteMode();if(section==='favorites')setView('favorites');}
 });
 // Remove broken/empty coin icons instead of exposing black image placeholders.
 rows.addEventListener('error',event=>{
  const image=event.target;
  if(image?.tagName==='IMG'&&image.closest('.mp-identity'))image.remove();
 },true);
 function onAssetClick(e){
  const remove=e.target.closest('.market-favorite-remove');
  if(remove){
   e.preventDefault();
   requestFavoriteRemoval(remove.dataset.favoriteId);
   return;
  }
  const favorite=e.target.closest('.market-favorite-toggle');
  if(favorite){
   e.preventDefault();
   toggleFavorite(favorite.dataset.favoriteId,favorite.dataset.favoriteName,favorite.dataset.favoriteSymbol);
   return;
  }
  const asset=e.target.closest('[data-coin]');
  if(asset)api()?.open?.(asset.dataset.coin);
 }
 rows.addEventListener('click',onAssetClick);
 // A missing provider logo simply disappears; no broken-image rectangle on the card.
 grid.addEventListener('error',event=>{
  const image=event.target;
  if(image?.tagName==='IMG'&&image.classList.contains('hm-icon'))image.remove();
 },true);
 grid.addEventListener('click',onAssetClick);
 // Remove pulse classes at animation end. A stationary quote has no active signal.
 grid.addEventListener('animationend',event=>{
  if(event.animationName!=='injAggressiveEdgePulse')return;
  const tile=event.target;
  if(tile?.classList?.contains('heatmap-tile'))
   tile.classList.remove('market-flash-up','market-flash-down');
 });
 window.INJ_MARKET_VIEWS={render:requestRender,tick,setView,languageChange,favoriteCount:()=>favorites.size};
 setRange(range);
 setView('list');
})();