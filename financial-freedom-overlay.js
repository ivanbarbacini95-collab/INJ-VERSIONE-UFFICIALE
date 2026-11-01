/* INJ Node · Financial Freedom overlay v3.
   Eager same-origin iframe, validated load, mobile-safe escape route. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const overlay=()=> $('injFreedomOverlay');
  const frame=()=> $('injFreedomFrame');
  let open=false,previousFocus=null,loadWatchdog=0;
  function stopWatchdog(){
    if(loadWatchdog){window.clearTimeout(loadWatchdog);loadWatchdog=0;}
  }
  function recoverButton(){
    const root=overlay();
    if(!root)return null;
    let btn=$('injFreedomRecovery');
    if(!btn){
      btn=document.createElement('button');
      btn.type='button';btn.id='injFreedomRecovery';
      btn.className='inj-freedom-recovery';
      btn.addEventListener('click',closeView);
      root.append(btn);
    }
    btn.textContent=document.documentElement.lang==='en'?'Back to Home':'Torna alla Home';
    return btn;
  }
  function showRecovery(){
    if(!open)return;
    const btn=recoverButton();
    if(btn)btn.hidden=false;
  }
  function hideRecovery(){
    const btn=$('injFreedomRecovery');
    if(btn)btn.hidden=true;
  }
  function isFinancialPage(){
    try{return frame()?.contentDocument?.documentElement?.dataset.injPage==='financial-freedom';}
    catch(_){return false}
  }
  function onFrameLoad(){
    if(!open)return;
    if(isFinancialPage()){
      stopWatchdog();
      hideRecovery();
    }else showRecovery();
  }
  function openView(){
    if(open)return;
    const root=overlay(),child=frame();
    if(!root||!child)return;
    open=true;
    previousFocus=document.activeElement;
    // Fetch exact net validator APR for other saved wallets in the background.
    // Do not block opening or depend on these extra API calls.
    try{
      Promise.resolve(window.INJ_FINANCIAL_FREEDOM_ENRICH_APR?.()).catch(()=>{});
    }catch(_){}
    try{window.INJ_HOME_SCROLL?.save?.();}catch(_){}
    root.hidden=false;
    document.documentElement.classList.add('inj-freedom-open');
    document.body.classList.add('inj-freedom-open');
    hideRecovery();
    stopWatchdog();
    loadWatchdog=window.setTimeout(()=>{if(open&&!isFinancialPage())showRecovery();},6500);
    if(!child.getAttribute('src')){
      child.src='./financial-freedom.html?v=20261028freedom8';
    }else if(!isFinancialPage()){
      child.src='./financial-freedom.html?v=20261028freedom8';
    }else {
      try{child.contentWindow?.postMessage({type:'injnode:freedom-refresh'},location.origin)}catch(_){}
      stopWatchdog();
    }
  }
  function closeView(){
    if(!open)return;
    open=false;
    stopWatchdog();
    hideRecovery();
    overlay().hidden=true;
    document.documentElement.classList.remove('inj-freedom-open');
    document.body.classList.remove('inj-freedom-open');
    try{previousFocus?.focus?.({preventScroll:true})}catch(_){}
    previousFocus=null;
  }
  function setup(){
    const button=$('entryFreedomButton');
    if(!button||!overlay()||!frame())return;
    button.addEventListener('click',openView);
    frame().addEventListener('load',onFrameLoad);
    frame().addEventListener('error',showRecovery);
    window.addEventListener('message',event=>{
      if(event.origin!==location.origin||event.source!==frame().contentWindow)return;
      if(event.data?.type==='injnode:freedom-close')closeView();
    });
    document.addEventListener('keydown',event=>{
      if(open&&event.key==='Escape'){event.preventDefault();closeView();}
    });
    window.addEventListener('pageshow',()=>{if(open)closeView();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
  else setup();
})();
