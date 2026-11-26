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
  const portraitCss=`html[data-inj-reward-embedded="true"] body :is(.rewards-shell,.ladder-main){width:100%!important;max-width:none!important;}`;
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
