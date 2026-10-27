import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
const COOKIE='__Host-injnode-admin', DURATION=8*60*60*1000;
const config=()=>Boolean(process.env.INJ_ADMIN_USERNAME&&process.env.INJ_ADMIN_PASSWORD);
function eq(a,b){return timingSafeEqual(createHash('sha256').update(String(a)).digest(),createHash('sha256').update(String(b)).digest())}
function sign(ex,nonce){return createHmac('sha256',process.env.INJ_ADMIN_PASSWORD).update('injnode-admin-v1:'+process.env.INJ_ADMIN_USERNAME+':'+ex+':'+nonce).digest('hex')}
function authorized(req){
 if(!config())return false;
 const item=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='));
 if(!item)return false;
 const m=/^(\d{13})\.([0-9a-f]{32})\.([0-9a-f]{64})$/.exec(item.slice(COOKIE.length+1));
 if(!m)return false;
 const exp=Number(m[1]),now=Date.now();
 return exp>now&&exp<=now+DURATION&&eq(m[3],sign(m[1],m[2]));
}
function setCookie(){const ex=String(Date.now()+DURATION),nonce=randomBytes(16).toString('hex');
 return COOKIE+'='+ex+'.'+nonce+'.'+sign(ex,nonce)+'; Path=/; Max-Age=28800; Secure; HttpOnly; SameSite=Strict'}
const clearCookie=()=>COOKIE+'=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Strict';
function sameOrigin(req){try{const u=new URL(req.headers.origin||req.headers.referer);return u.host===req.headers.host&&(u.protocol==='https:'||u.origin==='http://localhost:3000')}catch(_){return false}}
function origin(){const raw=String(process.env.INJ_INSIGHTS_BASE_URL||'').trim();if(!raw)return null;
 try{const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash&&u.pathname==='/'?u.origin:null}catch(_){return null}}
const reply=(res,code,body)=>res.status(code).json(body);
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('X-Robots-Tag','noindex, nofollow');
 const action=String(req.query?.action||'status');
 if(req.method==='GET'&&action==='status')return reply(res,200,{configured:config(),authenticated:authorized(req),dataConnected:!!origin()});
 if(req.method==='POST'&&action==='login'){
  if(!sameOrigin(req))return reply(res,403,{error:'Origine non autorizzata'});
  if(!config())return reply(res,503,{error:'Credenziali Admin non configurate su INJ Node'});
  if(Number(req.headers['content-length']||0)>4096)return reply(res,413,{error:'Richiesta troppo grande'});
  let b=req.body||{};if(typeof b==='string'){try{b=JSON.parse(b)}catch(_){b={}}}if(!b||typeof b!=='object')b={};
  if(typeof b.username!=='string'||typeof b.password!=='string'||b.username.length>180||b.password.length>1024
     ||!eq(b.username,process.env.INJ_ADMIN_USERNAME)||!eq(b.password,process.env.INJ_ADMIN_PASSWORD))return reply(res,401,{error:'Nome utente o password non corretti'});
  res.setHeader('Set-Cookie',setCookie());return reply(res,200,{ok:true});
 }
 if(req.method==='POST'&&action==='logout'){
  if(!sameOrigin(req))return reply(res,403,{error:'Origine non autorizzata'});
  res.setHeader('Set-Cookie',clearCookie());return reply(res,200,{ok:true});
 }
 if(req.method==='GET'&&action==='overview'){
  if(!authorized(req))return reply(res,401,{error:'Accesso Admin richiesto'});
  const base=origin();if(!base)return reply(res,503,{error:'Sorgente statistiche non ancora collegata'});
  const user=process.env.INJ_INSIGHTS_USERNAME||process.env.INJ_ADMIN_USERNAME;
  const pass=process.env.INJ_INSIGHTS_PASSWORD||process.env.INJ_ADMIN_PASSWORD;
  const days=Math.max(1,Math.min(90,Math.floor(Number(req.query?.days)||30)));
  const ctrl=new AbortController(), timer=setTimeout(()=>ctrl.abort(),11000);
  try{
   const r=await fetch(base+'/api/overview?days='+days,{headers:{Authorization:'Basic '+Buffer.from(user+':'+pass).toString('base64'),Accept:'application/json'},signal:ctrl.signal,cache:'no-store'});
   if(r.status===401)return reply(res,502,{error:'Credenziali del servizio Insights non riconosciute'});
   if(r.status===503)return reply(res,503,{error:'Configurazione dati del servizio Insights incompleta'});
   if(!r.ok)return reply(res,502,{error:'Errore servizio Insights: '+r.status});
   const data=await r.json();if(!data||typeof data!=='object'||!data.summary)return reply(res,502,{error:'Formato dati Insights non valido'});
   return reply(res,200,data);
  }catch(_){return reply(res,502,{error:'Servizio Insights non raggiungibile'});}
  finally{clearTimeout(timer)}
 }
 return reply(res,405,{error:'Azione non consentita'});
}