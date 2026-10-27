const assert=require('node:assert/strict');
const {test}=require('node:test');
const M=require('./workspace-model.js');
const card=(uid,r)=>({uid,type:'total',source:'selected',layouts:{desktop:{...r},mobile:{x:0,y:0,w:4,h:3}}});
test('moving or enlarging a card pushes every collision without changing priority rectangle',()=>{
 const items=[card('a',{x:0,y:0,w:8,h:6}),card('b',{x:4,y:0,w:4,h:3}),card('c',{x:4,y:3,w:4,h:3})];
 M.settle(items,'desktop',12,'a');assert.deepEqual(items[0].layouts.desktop,{x:0,y:0,w:8,h:6});
 for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++)assert.ok(!M.overlaps(items[i].layouts.desktop,items[j].layouts.desktop));
 assert.equal(items[1].layouts.desktop.y,6);assert.equal(items[2].layouts.desktop.y,9);
});
test('desktop operations preserve mobile geometry',()=>{const items=[card('a',{x:0,y:0,w:12,h:5}),card('b',{x:0,y:0,w:4,h:3})];const before=JSON.stringify(items.map(i=>i.layouts.mobile));M.settle(items,'desktop',12,'a');assert.equal(JSON.stringify(items.map(i=>i.layouts.mobile)),before)});
test('new cards fill available columns before adding a row',()=>{const a=card('a',{x:0,y:0,w:4,h:3});assert.deepEqual(M.firstFree([a],'desktop',12,4,3),{x:4,y:0,w:4,h:3});assert.deepEqual(M.firstFree([a],'mobile',4,4,3),{x:0,y:3,w:4,h:3})});
test('aggregate uses each wallet APR and includes unbonding in total',()=>{const a={staked:100,available:2,rewards:3,unbonding:5,personalApr:10,updated:100,verified:true},b={staked:200,available:1,rewards:4,total:205,personalApr:5,updated:200,verified:true};const r=M.aggregate([a,b]);assert.equal(r.total,315);assert.equal(r.daily,20/365);assert.equal(r.at,100);assert.equal(r.verified,true)});
test('partial multiwallet data stays unavailable; unknown APR does not become zero',()=>{assert.equal(M.aggregate([{staked:10,available:0,rewards:1},null]),null);assert.equal(M.aggregate([]),null);assert.equal(M.aggregate([{staked:10,available:0,rewards:1}]).daily,null)});
test('imports retain duplicate card types with independent wallet sources and layouts',()=>{const a=card('a',{x:0,y:0,w:4,h:3}),b=card('b',{x:4,y:0,w:4,h:3});b.source='inj1'+'a'.repeat(38);const r=M.sanitize({version:1,presets:[{id:'p',name:'My setup',items:[a,b]}],active:'p',defaultId:'p'});assert.equal(r.presets[0].items.length,2);assert.notEqual(r.presets[0].items[0].source,r.presets[0].items[1].source);assert.equal(r.defaultId,'p')});
test('malformed imports reject unknown types, duplicate IDs and wallet sources',()=>{const wrap=items=>({version:1,presets:[{id:'p',items}]});assert.throws(()=>M.sanitize(wrap([{...card('x',{}),type:'script'}])));assert.throws(()=>M.sanitize(wrap([card('x',{}),card('x',{})])));assert.throws(()=>M.sanitize(wrap([{...card('x',{}),source:'javascript:bad'}])));assert.throws(()=>M.sanitize(wrap([{...card('x',{}),source:'market'}])))});
test('chart preferences survive preset round trips and older presets default to line',()=>{const make=()=>({version:1,active:'p',presets:[{id:'p',items:[{...card('chart',{x:0,y:0,w:8,h:5}),type:'chart',chartStyle:'candles',timeframe:'4h'}]}]});const saved=M.sanitize(JSON.parse(JSON.stringify(M.sanitize(make()))));assert.equal(saved.presets[0].items[0].chartStyle,'candles');assert.equal(saved.presets[0].items[0].timeframe,'4h');const old=make();delete old.presets[0].items[0].chartStyle;assert.equal(M.sanitize(old).presets[0].items[0].chartStyle,'line')});
test('candles retain exchange OHLC rather than synthesizing it from closing prices',()=>{const rows=M.parseKlines([[200,10,15,9,12],[100,12,13,8,10],[300,10,9,11,12],[400,'bad',12,9,11]]);assert.deepEqual(rows,[{t:100,o:12,h:13,l:8,c:10},{t:200,o:10,h:15,l:9,c:12}]);assert.deepEqual(M.parseKlines(null),[])});
test('each selectable period has its own history window and interval',()=>{assert.deepEqual(Object.keys(M.timeframes),['5m','15m','1h','4h','24h','7d','30d']);for(const c of Object.values(M.timeframes))assert.ok(c.limit>1&&c.ms>0&&c.interval);assert.equal(M.timeframes['1h'].ms,3600000);assert.equal(M.timeframes['7d'].ms,7*86400000)});

const C=require('./workspace-catalog.js'),S=require('./workspace-sections.js');
test('every catalog entry has a working renderer route and independent defaults',()=>{const base=new Set(['worth','total','staked','available','rewards','daily','ratio','price','chart','ladder','liveview']);assert.equal(new Set(C.entries.map(c=>c.type)).size,C.entries.length);for(const c of C.entries){assert.ok(base.has(c.type)||S.supported.includes(c.type),c.type);assert.ok(['wallet','market'].includes(c.scope));assert.ok(c.w>0&&c.h>0);const options=C.defaults(c.type);options.amount=12;assert.equal(C.defaults(c.type).amount,1)}});
test('all section card types and their settings survive preset serialization',()=>{for(const c of C.entries){const i={...card('x',{x:0,y:0,w:c.w,h:c.h}),...C.defaults(c.type),type:c.type,source:c.scope==='market'?'market':'all',scenarioPrice:123.45,amount:23,targetCoin:'ethereum',years:7,historyRange:'7d',chartStyle:'candles'};const db={version:1,presets:[{id:'p',items:[i]}]};const restored=M.sanitize(JSON.parse(JSON.stringify(M.sanitize(db)))).presets[0].items[0];assert.equal(restored.type,c.type);assert.equal(restored.chartStyle,'candles');assert.equal(restored.scenarioPrice,123.45);assert.equal(restored.targetCoin,'ethereum');assert.equal(restored.historyRange,'7d')}});
test('simulation calculations keep unknown APR unavailable and compound daily',()=>{assert.equal(S.compound(100,null,5),null);assert.equal(S.compound(100,0,5),100);assert.ok(S.compound(100,10,1)>110);assert.equal(S.ratio(10,0),null);assert.equal(S.sum([null],'staked'),null)});
test('free movement preserves sub-grid positions and does not move neighboring cards on reload',()=>{const a=card('a',{x:0,y:0,w:4,h:3}),b=card('b',{x:4,y:0,w:4,h:3});a.layouts.desktop=M.transform(a.layouts.desktop,'move',1.137,.323,12);const raw={version:1,presets:[{id:'free',snap:false,items:[a,b]}]};const saved=M.sanitize(JSON.parse(JSON.stringify(raw))).presets[0];assert.equal(saved.items[0].layouts.desktop.x,1.137);assert.equal(saved.items[0].layouts.desktop.y,.323);assert.deepEqual(saved.items[1].layouts.desktop,b.layouts.desktop);assert.ok(M.overlaps(saved.items[0].layouts.desktop,saved.items[1].layouts.desktop));assert.equal(saved.snap,false)});
test('resizing north and west keeps opposite edges anchored and enforces minimum size',()=>{const r={x:2,y:3,w:4,h:5},n=M.transform(r,'nw',.123,.456,12);assert.equal(n.x,.123+2);assert.equal(n.y,.456+3);assert.equal(n.x+n.w,6);assert.equal(n.y+n.h,8);const tiny=M.transform(r,'nw',100,100,12);assert.equal(tiny.w,.75);assert.equal(tiny.h,1.75);assert.equal(tiny.x+tiny.w,6);assert.equal(tiny.y+tiny.h,8)});
test('free transforms remain inside the canvas while grid snapping is optional',()=>{const r={x:1,y:2,w:4,h:3};assert.equal(M.transform(r,'move',.4,.4,12).x,1.4);assert.equal(M.transform(r,'move',.4,.4,12,{snap:true}).x,1);assert.equal(M.transform(r,'e',100,0,12).w,11);assert.equal(M.transform(r,'move',100,-100,12).x,8);assert.equal(M.transform(r,'move',100,-100,12).y,0)});
test('grid presets retain collision avoidance; older presets keep their exact arrangement',()=>{const items=[card('a',{x:0,y:0,w:6,h:3}),card('b',{x:4,y:0,w:4,h:3})],wrap=snap=>({version:1,presets:[{id:'p',snap,items}]});assert.equal(M.sanitize(wrap(true)).presets[0].items[1].layouts.desktop.y,3);assert.equal(M.sanitize(wrap(undefined)).presets[0].items[1].layouts.desktop.y,0)});
test('enabling the grid aligns absolute coordinates after earlier free movement',()=>{const moved=M.transform({x:1.137,y:.323,w:4,h:3},'move',.1,.1,12,{snap:true});assert.equal(moved.x,1);assert.equal(moved.y,0)});


test('all catalog cards duplicate as independent instances, keeping data options and nonoverlapping layouts',()=>{
 for(const spec of C.entries){
  const original={
   ...C.defaults(spec.type),uid:'original',type:spec.type,
   source:spec.scope==='market'?'market':'selected',title:'CUSTOM',cardLocked:false,
   marketRange:'7d',historyRange:'7d',timeframe:'4h',chartStyle:'candles',
   heatmapCoins:['bitcoin','injective-protocol'],bookStep:0.01,
   layouts:{
    desktop:{x:0,y:0,w:Math.min(12,spec.w),h:spec.h},
    mobile:{x:0,y:0,w:Math.min(4,spec.w),h:spec.h}
   }
  };
  const existing=[original,{...original,uid:'other',layouts:{
   desktop:{...original.layouts.desktop,y:original.layouts.desktop.h},
   mobile:{...original.layouts.mobile,y:original.layouts.mobile.h}
  }}];
  const copy=M.cloneCard(original,existing,'copy');
  assert.equal(copy.uid,'copy',spec.type);
  assert.equal(copy.type,spec.type);
  assert.equal(copy.source,original.source);
  assert.equal(copy.cardLocked,false);
  assert.equal(copy.group,'');
  assert.notEqual(copy.heatmapCoins,original.heatmapCoins);
  assert.deepEqual(copy.heatmapCoins,original.heatmapCoins);
  for(const key of ['desktop','mobile']){
   assert.ok(existing.every(item=>!M.overlaps(item.layouts[key],copy.layouts[key])),spec.type+' '+key);
  }
  const saved=M.sanitize({version:1,presets:[{id:'p',items:[original,copy]}]}).presets[0].items;
  assert.equal(saved[1].marketRange,'7d');
  assert.equal(saved[1].historyRange,'7d');
  assert.equal(saved[1].timeframe,'4h');
  assert.equal(saved[1].chartStyle,'candles');
  assert.equal(saved[1].bookStep,.01);
  assert.deepEqual(saved[1].heatmapCoins,original.heatmapCoins);
 }
});
