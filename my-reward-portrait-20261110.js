/* INJ Node | My Reward: portrait PC layout and embedded destination fixes.
 * Presentation only. Never alters reward values, wallet selection or APR.
 */
(()=>{
 'use strict';
 function init(){
  const panel=document.getElementById('injMyRewardPanel');
  if(!panel)return;
  const card=panel.querySelector('.inj-myreward-stake-card');
  if(card&&!card.querySelector('.inj-myreward-figures')){
   const staked=card.querySelector('#injMyRewardStaked');
   const fiat=card.querySelector('#injMyRewardValue');
   const divider=card.querySelector('.inj-myreward-separator');
   const label=card.querySelector('.inj-myreward-reward-label');
   const accrued=card.querySelector('#injMyRewardAccrued');
   const rewardFiat=card.querySelector('#injMyRewardRewardValue');
   if(staked&&fiat&&divider&&label&&accrued&&rewardFiat){
    const figures=document.createElement('div');
    const stake=document.createElement('div');
    const reward=document.createElement('div');
    figures.className='inj-myreward-figures';
    stake.className='inj-myreward-stake-group';
    reward.className='inj-myreward-reward-group';
    card.append(figures);figures.append(stake,divider,reward);
    stake.append(staked,fiat);
    reward.append(label,accrued,rewardFiat);
   }
  }
  const portraitCss=`
/* Embedded portrait desktop: avoid desktop grid forcing clipped wallet cards. */
@media screen and (min-width:900px) and (orientation:portrait){
 html[data-inj-reward-embedded="true"][data-inj-page="live-rewards"] body{
  overflow-x:hidden!important;overflow-y:auto!important;height:auto!important;
 }
 html[data-inj-reward-embedded="true"][data-inj-page="live-rewards"] .rewards-shell{
  width:min(100% - 24px,1000px)!important;min-width:0!important;
  height:auto!important;min-height:100%!important;max-height:none!important;
  overflow:visible!important;display:block!important;
 }
 html[data-inj-reward-embedded="true"][data-inj-page="live-rewards"] .rewards-main{
  height:auto!important;min-height:0!important;overflow:visible!important;
 }
 html[data-inj-reward-embedded="true"][data-inj-page="live-rewards"] .rewards-layout{
  display:flex!important;flex-direction:column!important;
  grid-template-columns:none!important;grid-template-rows:none!important;
  width:100%!important;height:auto!important;min-height:0!important;
  align-items:stretch!important;gap:16px!important;overflow:visible!important;
 }
 html[data-inj-reward-embedded="true"][data-inj-page="live-rewards"] .rewards-total-panel{
  order:-1!important;display:grid!important;position:relative!important;
  top:auto!important;min-height:260px!important;height:auto!important;
  overflow:hidden!important;width:100%!important;grid-row:auto!important;
 }
 html[data-inj-reward-embedded="true"][data-inj-page="live-rewards"] .rewards-list-panel{
  display:block!important;position:relative!important;min-height:0!important;
  height:auto!important;overflow:hidden!important;width:100%!important;
  grid-row:auto!important;
 }
 html[data-inj-reward-embedded="true"][data-inj-page="live-rewards"] .rewards-list{
  display:grid!important;grid-template-columns:minmax(0,1fr)!important;
  height:auto!important;overflow:visible!important;
 }
 html[data-inj-reward-embedded="true"][data-inj-page="live-rewards"] .rewards-list-head{
  display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;
 }
 html[data-inj-reward-embedded="true"][data-inj-page="live-rewards"] .reward-row{
  display:grid!important;grid-template-columns:minmax(0,1fr) max-content!important;
  align-items:center!important;gap:12px!important;
  min-height:92px!important;height:auto!important;overflow:visible!important;
 }
 html[data-inj-reward-embedded="true"][data-inj-page="live-rewards"] .reward-wallet{
  min-width:0!important;max-width:100%!important;
 }
 html[data-inj-reward-embedded="true"][data-inj-page="live-rewards"] .reward-live-number{
  min-width:0!important;max-width:100%!important;
 }
 html[data-inj-reward-embedded="true"][data-inj-page="live-rewards"] .reward-live-number strong{
  min-width:0!important;font-size:clamp(16px,2vw,23px)!important;
 }
 html[data-inj-reward-embedded="true"][data-inj-page="reward-ladder"] body{
  height:auto!important;min-height:100%!important;overflow-y:auto!important;
 }
 html[data-inj-reward-embedded="true"][data-inj-page="reward-ladder"] .ladder-main{
  width:min(100%,1000px)!important;height:auto!important;overflow:visible!important;
 }
 html[data-inj-reward-embedded="true"][data-inj-page="reward-ladder"] .ladder-steps{
  grid-template-columns:minmax(0,1fr)!important;min-width:0!important;
 }
 html[data-inj-reward-embedded="true"][data-inj-page="reward-ladder"] .ladder-overview{
  grid-template-columns:repeat(2,minmax(0,1fr))!important;
 }
 html[data-inj-reward-embedded="true"][data-inj-page="reward-ladder"] :is(.ladder-total,.ladder-metrics,.ladder-step){
  min-width:0!important;
 }
}
@media screen and (min-width:900px) and (max-width:1040px) and (orientation:portrait){
 html[data-inj-reward-embedded="true"][data-inj-page="reward-ladder"] .ladder-overview{
  grid-template-columns:minmax(0,1fr)!important;
 }
}
`;
  function apply(frame){
   try{
    const doc=frame.contentDocument;
    if(!doc?.documentElement||doc.getElementById('injMyRewardPortraitDesktop'))return;
    const style=doc.createElement('style');
    style.id='injMyRewardPortraitDesktop';
    style.textContent=portraitCss;
    (doc.head||doc.documentElement).append(style);
   }catch(_){}
  }
  panel.querySelectorAll('iframe.inj-myreward-frame').forEach(frame=>{
   frame.addEventListener('load',()=>apply(frame));
   if(frame.contentDocument?.readyState==='complete')apply(frame);
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
