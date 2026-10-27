/* Workspace uses the main app's number renderer when embedded. The fallback
   preserves its single-layer digits, 720ms cue gate and calm reward treatment. */
(() => {
 'use strict';
 const finite=n=>typeof n==='number'&&Number.isFinite(n);
 function paint(node,text,value,{calm=false,identity=''}={}){
  if(node._wsIdentity!==identity){clearTimeout(node._digitColorTimer);for(const key of ['rollRenderedValue','rollNumericValue','plainRenderedValue','plainNumericValue'])delete node.dataset[key];for(const key of ['_verticalVisualText','_verticalVisualNumeric','_verticalLastAnimatedAt','_wsText','_wsNumeric','_wsCueAt'])delete node[key];node._wsIdentity=identity;}
  if(node._wsText===text&&Object.is(node._wsNumeric,value))return;
  try{
   if(parent!==window){const render=calm?parent.setStableLiveNumberValue:parent.setRollingNumberValue;if(typeof render==='function'){render(node,text,finite(value)?value:NaN);node._wsText=text;node._wsNumeric=value;return}}
  }catch(_){}
  const oldText=node._wsText,previous=node._wsNumeric,now=performance.now();
  const cue=!calm&&finite(previous)&&finite(value)&&oldText!==text&&Math.abs(value-previous)>Math.max(1e-12,Math.abs(previous)*1e-10)&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&now-(node._wsCueAt||0)>=720;
  const direction=value>previous?'up':'down',oldGroups=String(oldText||'').match(/\d[\d.,]*/g)||[];
  const shell=document.createElement('span');shell.className='number-roll-text number-roll-stable';shell.setAttribute('aria-label',text);
  const regex=/\d[\d.,]*/g;let match,cursor=0,index=0;
  while((match=regex.exec(text))){if(match.index>cursor)shell.append(document.createTextNode(text.slice(cursor,match.index)));const before=Array.from(oldGroups[index++]||'').filter(c=>/\d/.test(c)),chars=Array.from(match[0]),offset=before.length-chars.filter(c=>/\d/.test(c)).length;let digit=0;for(const c of chars){if(!/\d/.test(c)){shell.append(document.createTextNode(c));continue}const span=document.createElement('span');span.className='number-roll-static-digit';if(cue&&before[digit+offset]!==c)span.classList.add('number-change-digit','number-change-'+direction);span.textContent=c;shell.append(span);digit++}cursor=regex.lastIndex;}
  if(cursor<text.length)shell.append(document.createTextNode(text.slice(cursor)));node.classList.add('number-roll-host');node.replaceChildren(shell);
  clearTimeout(node._digitColorTimer);if(cue){node._wsCueAt=now;node._digitColorTimer=setTimeout(()=>node.querySelectorAll('.number-change-up,.number-change-down').forEach(n=>n.classList.remove('number-change-up','number-change-down')),260)}
  node._wsText=text;node._wsNumeric=value;
 }
 window.INJWorkspaceValues={paint};
})();
