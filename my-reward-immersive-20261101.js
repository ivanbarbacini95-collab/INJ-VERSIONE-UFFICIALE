/* INJ Node · immersive My Reward navigation & green accrual refinement. */
(()=>{
'use strict';
const root=document.documentElement;
const english=()=>root.lang==='en'||localStorage.getItem('inj_node_language_v1')==='en';
const translate=(it,en)=>english()?en:it;
function init(){
 const panel=document.getElementById('injMyRewardPanel');
 const nav=document.getElementById('injMyRewardPages');
 if(!panel||!nav||document.getElementById('injMyRewardHome'))return;
 const row=document.createElement('div');
 row.className='inj-myreward-nav-row';
 const back=document.createElement('button');
 back.type='button';back.className='inj-myreward-home';back.id='injMyRewardHome';
 back.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10"/><path d="M9 21v-8h6v8"/></svg>';
 function refreshLabel(){
  const text=translate('Torna alla Home','Back to Home');
  back.setAttribute('aria-label',text);back.title=text;
 }
 refreshLabel();
 nav.before(row);row.append(back,nav);
 back.addEventListener('click',()=>{
  window.INJ_BOTTOM_NAV?.select('home');
  if(root.dataset.injHomeTab==='reward'){
   root.dataset.injHomeTab='home';window.scrollTo({top:0,behavior:'instant'});
  }
 });
 window.addEventListener('injnode:languagechange',refreshLabel);
 const frameCss=`
 html[data-inj-reward-embedded="true"] body :is(#rewardsTotal,#rewardsTotalFiat,.reward-live-number strong,#ladderRewardValue,#ladderRewardInj){
  color:#43e69b!important;font-weight:850!important
 }
 html[data-inj-reward-embedded="true"] body :is(.rewards-total-value strong,.reward-live-number strong,.ladder-total strong){
  font-family:"INJ Geist","Geist",system-ui,sans-serif!important;font-weight:850!important
 }`;
 function styleFrame(frame){
  try{
   const doc=frame.contentDocument;
   if(!doc||!doc.documentElement||doc.getElementById('injMyRewardGreenNumbers'))return;
   const style=doc.createElement('style');style.id='injMyRewardGreenNumbers';style.textContent=frameCss;
   (doc.head||doc.documentElement).append(style);
  }catch(_){}
 }
 panel.querySelectorAll('iframe.inj-myreward-frame').forEach(frame=>{
  frame.addEventListener('load',()=>styleFrame(frame));
  if(frame.contentDocument?.readyState==='complete')styleFrame(frame);
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();