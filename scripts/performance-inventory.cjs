#!/usr/bin/env node
'use strict';
// Static inventory only. Results are candidates for review, not authorization
// to delete a file: CSS @imports, runtime path assembly and PWA routes matter.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const ignored=new Set(['.git','node_modules','.vercel','.next','dist']);
function scan(dir=''){
 const entries=fs.readdirSync(path.join(root,dir),{withFileTypes:true}),out=[];
 for(const e of entries){
  if(ignored.has(e.name))continue;
  const relative=path.posix.join(dir,e.name);
  if(e.isDirectory())out.push(...scan(relative));
  else if(e.isFile())out.push(relative);
 }
 return out;
}
const files=scan().sort();
const sizeOf=name=>fs.statSync(path.join(root,name)).size;
const groupExt=name=>path.extname(name).toLowerCase()||'[none]';
const summary={},byPath=new Map();
for(const file of files){
 const size=sizeOf(file),ext=groupExt(file);
 const entry=summary[ext]??={count:0,bytes:0};
 entry.count++;entry.bytes+=size;byPath.set(file,size);
}
const textExt=new Set(['.html','.css','.js','.mjs','.cjs','.json','.webmanifest']);
const runtime=files.filter(f=>textExt.has(groupExt(f))&&!f.endsWith('.test.cjs'));
const text=runtime.map(file=>({file,content:fs.readFileSync(path.join(root,file),'utf8')}));
const html=text.filter(x=>x.file.endsWith('.html'));
const pages=[];
const missing=[];
for(const {file,content} of html){
 const scripts=[...content.matchAll(/<script\b[^>]*?\bsrc=["']([^"'#]+)["']/gi)].map(m=>m[1]);
 const styles=[...content.matchAll(/<link\b[^>]*?\bhref=["']([^"'#]+\.css(?:\?[^"']*)?)["']/gi)].map(m=>m[1]);
 const own=[...scripts,...styles].map(ref=>{
  const raw=ref.split('?')[0];
  if(/^(?:https?:|data:|\/\/)/i.test(raw))return null;
  const resolved=path.posix.normalize(path.posix.join(path.posix.dirname(file),raw));
  if(!byPath.has(resolved))missing.push({page:file,asset:ref});
  return resolved;
 }).filter(Boolean);
 pages.push({page:file,scripts:scripts.length,styles:styles.length,linkedRawBytes:own.reduce((a,p)=>a+(byPath.get(p)||0),0)});
}
const duplicateHash=new Map();
for(const file of files.filter(f=>['.css','.js','.html','.png','.svg'].includes(groupExt(f)))){
 const digest=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
 const key=groupExt(file)+'/'+digest;
 if(!duplicateHash.has(key))duplicateHash.set(key,[]);
 duplicateHash.get(key).push(file);
}
const duplicates=[...duplicateHash.values()].filter(g=>g.length>1).sort((a,b)=>b.length-a.length);
const candidates=files.filter(f=>['.css','.js'].includes(groupExt(f))&&
 !f.startsWith('api/')&&!f.startsWith('scripts/')&&
 !text.some(x=>x.file!==f&&x.content.includes(path.posix.basename(f))));
const top=files.slice().sort((a,b)=>sizeOf(b)-sizeOf(a)).slice(0,12).map(f=>({file:f,bytes:sizeOf(f)}));
const timerFiles=text.filter(x=>x.file.endsWith('.js')||x.file.endsWith('.html')).map(x=>({
 file:x.file,
 intervals:(x.content.match(/\bsetInterval\s*\(/g)||[]).length,
 frames:(x.content.match(/\brequestAnimationFrame\s*\(/g)||[]).length,
 observers:(x.content.match(/new\s+(?:MutationObserver|ResizeObserver|IntersectionObserver)\s*\(/g)||[]).length
})).filter(x=>x.intervals||x.frames||x.observers);
const output={
 files:files.length,bytes:[...byPath.values()].reduce((s,n)=>s+n,0),
 extensions:summary,
 home:pages.find(p=>p.page==='index.html'), 
 heaviestPages:pages.slice().sort((a,b)=>b.linkedRawBytes-a.linkedRawBytes).slice(0,8),
 topFiles:top,
 duplicateGroups:duplicates.slice(0,15),
 candidateUnreferenced:candidates.slice(0,60),
 candidatesCount:candidates.length,
 missingPageAssets:missing.slice(0,50),
 timerTotals:timerFiles.reduce((a,b)=>({intervals:a.intervals+b.intervals,frames:a.frames+b.frames,observers:a.observers+b.observers}),{intervals:0,frames:0,observers:0}),
 timerHeavy:timerFiles.sort((a,b)=>(b.intervals+b.frames+b.observers)-(a.intervals+a.frames+a.observers)).slice(0,12),
 notes:'Raw sizes and static text references are approximations, not device timings or safe deletion proofs.'
};
console.log(JSON.stringify(output,null,2));
