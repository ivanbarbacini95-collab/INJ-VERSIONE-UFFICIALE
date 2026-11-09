/* INJ Node Cash Reserve · public read-only cross-chain portfolio scanners.
 * Fixed watch-only accounts deliberately not shown in the UI. Public blockchain
 * identifiers are inspectable in client-side JavaScript; no secrecy is implied. */
(() => {
  'use strict';
  const INJ_ACCOUNT = 'inj1nj4ahf4p96ulu7r7n3h27u4rlud5qlc2jy3zyg';
  const SOL_ACCOUNT = '5atuLUBzVvj8EBJKt4oeTd1Ci9cZqcX6LKELSypNQGpK';
  const INJ_USDC = 'erc20:0xa00c59ff5a080d2b954d0c75e46e22a0c371235a';
  const SOL_PROGRAMS = [
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
  ];
  const MINTS = Object.freeze({
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v':{symbol:'USDC', name:'USD Coin', kind:'stable'},
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB':{symbol:'USDT', name:'Tether USD', kind:'stable'},
    'So11111111111111111111111111111111111111112':{symbol:'wSOL',name:'Wrapped SOL',kind:'token'},
    '9BEcn9aPEmhSPbPQeFGjidRiEKki46fVQDyPpSQXPA2D':{symbol:'jlUSDC',name:'Jupiter Lend USDC',kind:'receipt'}
  });
  const INJ_LCD = ['https://sentry.lcd.injective.network:443','https://lcd.injective.network','https://1rpc.io/inj-lcd'];
  const SOL_RPC = ['https://public.rpc.solanavibestation.com','https://api.mainnet-beta.solana.com','https://rpc.solanatracker.io/public','https://solana-rpc.publicnode.com'];
  const JUP_LEND = 'https://api.jup.ag/lend/v1/earn';
  const JUP_TOKENS = 'https://api.jup.ag/tokens/v2/search?query=';
  const USDC_SOL_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  const USDT_SOL_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
  const TRUST = 'https://assets-cdn.trustwallet.com/blockchains/';
  const LOGOS = Object.freeze({
    inj: TRUST+'injective/info/logo.png',
    sol: TRUST+'solana/info/logo.png',
    usdc: TRUST+'solana/assets/'+USDC_SOL_MINT+'/logo.png',
    usdt: TRUST+'solana/assets/'+USDT_SOL_MINT+'/logo.png'
  });
  const solTokenCache = new Map();
  let lendMarkets = null, lendMarketsTime = 0;

  async function json(url, options = {}, ms = 6700) {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), ms);
    try {
      const response = await fetch(url,{cache:'no-store',...options,signal:abort.signal});
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return await response.json();
    } finally { clearTimeout(timer); }
  }
  async function lcd(path) {
    let err;
    for (const host of INJ_LCD) {
      try {return await json(host+path,{},6000);}
      catch (e) {err=e;}
    }
    throw err || new Error('Injective LCD unavailable');
  }
  async function rpc(host, method, params, id) {
    const result = await json(host,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({jsonrpc:'2.0',id:id || 1,method,params})
    },9500);
    if (result.error || !result.result) throw new Error(result.error && result.error.message || 'Solana RPC unavailable');
    return result.result;
  }
  function qty(raw,decimals=0) {
    if(!/^\d+$/.test(String(raw ?? ''))) throw new Error('Non-numeric balance');
    const n=BigInt(raw),d=Math.max(0,Math.min(30,Number(decimals)||0)),p=10n**BigInt(d);
    const whole=n/p,frac=(n%p).toString().padStart(d,'0');
    const significant=frac.slice(0,10).replace(/0+$/,'');
    const extra=n>0n&&whole===0n&&!significant;
    const numberValue=Number(n)/Number(p);
    return {
      positive:n>0n,
      text:extra?'<0,0000000001':whole.toLocaleString('it-IT')+(significant?','+significant:''),
      value:Number.isFinite(numberValue)?numberValue:null
    };
  }
  function token(name,symbol,kind,raw,decimals,note,logoUrl=null,mint=null) {
    return {name,symbol,kind,amount:qty(raw,decimals),note:note||'',logoUrl,mint};
  }
  function validLogo(url) {
    try {
      const u=new URL(String(url));
      return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&
        !/(?:^|\\.)(?:localhost|local|internal)$/.test(u.hostname)&&
        ['assets-cdn.trustwallet.com','raw.githubusercontent.com','static.jup.ag',
         'cdn.jup.ag','token.jup.ag','tokens.jup.ag','arweave.net','gateway.irys.xyz'].includes(u.hostname)
        ?u.href:null;
    } catch (_) {return null;}
  }
  async function enrichSolanaMetadata(mints) {
    const unknown=mints.filter(m=>(!MINTS[m]||MINTS[m].kind==='receipt')&&!solTokenCache.has(m));
    if(unknown.length) {
      try {
        // Resolve against the exact mint, never the token symbol.
        const data=await json(JUP_TOKENS+encodeURIComponent(unknown.slice(0,75).join(',')),{},6000);
        const found=new Map(Array.isArray(data)?data.filter(x=>x&&unknown.includes(x.id)).map(x=>[x.id,x]):[]);
        for(const mint of unknown){
          const x=found.get(mint);
          solTokenCache.set(mint,x?{
            symbol:String(x.symbol||'TOK').slice(0,20),
            name:String(x.name||'Token Solana').slice(0,70),
            verified:x.isVerified===true,
            logoUrl:validLogo(x.icon)
          }:null);
        }
      } catch (_) { /* Keep balances visible even if token metadata is offline. */ }
    }
  }
  async function injectiveBank() {
    const items=[];
    let key='', pages=0;
    const seen=new Set();
    do {
      const path='/cosmos/bank/v1beta1/balances/'+encodeURIComponent(INJ_ACCOUNT)+'?pagination.limit=200'+(key?'&pagination.key='+encodeURIComponent(key):'');
      const response=await lcd(path);
      if(!Array.isArray(response.balances)) throw new Error('Invalid Injective balances');
      items.push(...response.balances);
      key=response.pagination?.next_key||'';
      if(key&&seen.has(key))throw new Error('Injective pagination repeated');
      if(key)seen.add(key);
      pages++;
      if(pages===25&&key)throw new Error('Injective balances truncated');
    }while(key);
    const active=items.filter(b=>/^\d+$/.test(String(b.amount))&&BigInt(b.amount)>0n);
    const results=await Promise.all(active.map(async(b,i)=>{
      const denom=String(b.denom||'');
      if(denom==='inj')return token('Injective','INJ','native',b.amount,18,'Disponibile',LOGOS.inj,'inj');
      if(denom.toLowerCase()===INJ_USDC)return token('USD Coin','USDC','stable',b.amount,6,'USDC nativo Circle',LOGOS.usdc,INJ_USDC);
      try {
        const r=await lcd('/cosmos/bank/v1beta1/denoms_metadata/'+encodeURIComponent(denom));
        const m=r.metadata;
        const unit=m?.denom_units?.find(row=>row.denom===m.display);
        if(m&&unit) {
          const label=String(m.symbol||m.name||'Token').slice(0,50);
          const short=String(m.symbol||'TOK').slice(0,12);
          return token(label,short,'token',b.amount,unit.exponent,'Disponibile',null,denom);
        }
      }catch(_){}
      const v=token('Token Injective '+(i+1),'TOK','token',b.amount,0,'Unità base · metadati non disponibili');
      v.unformatted=true;
      return v;
    }));
    return {assets:results,usdc:results.find(a=>a.kind==='stable'&&a.symbol==='USDC')?.amount.value||0};
  }
  async function solanaBank() {
    let responses, error;
    for (const host of SOL_RPC) {
      try {
        responses=await Promise.all([
          rpc(host,'getBalance',[SOL_ACCOUNT,{commitment:'confirmed'}],1),
          rpc(host,'getTokenAccountsByOwner',[SOL_ACCOUNT,{programId:SOL_PROGRAMS[0]},{encoding:'jsonParsed',commitment:'confirmed'}],2),
          rpc(host,'getTokenAccountsByOwner',[SOL_ACCOUNT,{programId:SOL_PROGRAMS[1]},{encoding:'jsonParsed',commitment:'confirmed'}],3)
        ]);
        if(!Array.isArray(responses[1].value)||!Array.isArray(responses[2].value))throw new Error('Invalid SPL accounts');
        break;
      } catch(e){responses=null;error=e;}
    }
    if(!responses)throw error||new Error('Solana unavailable');
    const assets=[];
    const lamports=String(responses[0].value??'0');
    if(qty(lamports,9).positive)assets.push(token('Solana','SOL','native',lamports,9,'SOL disponibile',LOGOS.sol,'SOL'));
    const byMint=new Map();
    let unsupported=0;
    for(const arr of [responses[1].value,responses[2].value]) {
      for(const row of arr) {
        const info=row?.account?.data?.parsed?.info;
        const mint=info?.mint;
        const bal=info?.tokenAmount;
        if(!mint||!bal||!/^\d+$/.test(String(bal.amount))){unsupported++;continue;}
        const dec=Number(bal.decimals)||0, existing=byMint.get(mint);
        if(existing&&existing.dec!==dec)throw new Error('Inconsistent token decimals');
        byMint.set(mint,{dec,raw:(existing?.raw||0n)+BigInt(bal.amount)});
      }
    }
    await enrichSolanaMetadata([...byMint.keys()]);
    let missing=0;
    for(const [mint,amount]of byMint){
      if(amount.raw===0n)continue;
      const official=MINTS[mint];
      // Never infer stablecoin identity from an unverified token symbol.
      const meta=solTokenCache.get(mint);
      const label=official||meta||{symbol:'TOK',name:'Token Solana '+(++missing),kind:'token'};
      const logo=official?.kind==='stable'?(mint===USDC_SOL_MINT?LOGOS.usdc:LOGOS.usdt):
        mint==='So11111111111111111111111111111111111111112'?LOGOS.sol:
        meta?.logoUrl||TRUST+'solana/assets/'+mint+'/logo.png';
      assets.push(token(label.name,label.symbol,label.kind||'token',amount.raw.toString(),amount.dec,
        official?.kind==='receipt'?'Quota Jupiter Earn · il valore USDC è nella sezione DeFi':official?'Token ufficiale':meta?.verified?'Token verificato · Jupiter':'Token SPL · identità non verificata',
        logo,mint));
    }
    return {
      assets,
      usdc:assets.find(a=>a.kind==='stable'&&a.symbol==='USDC')?.amount.value||0,
      usdt:assets.find(a=>a.kind==='stable'&&a.symbol==='USDT')?.amount.value||0,
      unsupported
    };
  }
  function asRatePercent(raw) {
    // Jupiter REST data has historically used fractions (0.06=6%) and 1e4 basis points.
    const n=Number(raw);
    if(!Number.isFinite(n)||n<0)return null;
    const v=n>100?n/100:n<=1?n*100:n;
    return v>=0&&v<=100?v:null;
  }
  function marketMint(market) {
    return String(market?.assetAddress||market?.asset?.address||market?.asset?.id||'');
  }
  async function jupiterEarn() {
    // Read-only Jupiter Lend Earn API. Does not require wallet connection or signatures.
    // A failed API must NOT silently turn an invested balance into zero.
    const raw=await json(JUP_LEND+'/positions?users='+encodeURIComponent(SOL_ACCOUNT),{},11000);
    const rows=Array.isArray(raw)?raw:raw?.data;
    if(!Array.isArray(rows))throw new Error('Unexpected Jupiter positions response');
    let markets=lendMarkets;
    if(!markets||Date.now()-lendMarketsTime>600000) {
      try {
        const fetched=await json(JUP_LEND+'/tokens',{},10000);
        if(Array.isArray(fetched)) {
          markets=fetched;lendMarkets=fetched;lendMarketsTime=Date.now();
        }
      } catch (_) { /* Position balances can still be displayed without APY. */ }
    }
    const positions=[];
    let usdc=0,usdt=0;
    for(const row of rows){
      if(row?.ownerAddress&&row.ownerAddress!==SOL_ACCOUNT)continue;
      const rowToken=row?.token||{};
      const tokenId=String(rowToken.address||rowToken.id||'');
      const market=markets?.find(x=>x.address===tokenId||marketMint(x)===tokenId);
      const asset=String(rowToken.assetAddress||rowToken.asset?.address||marketMint(market)||tokenId);
      const decimals=Number(rowToken.decimals??market?.asset?.decimals??market?.decimals);
      if(!Number.isInteger(decimals)||decimals<0||decimals>30)continue;
      let amount;
      try { amount=qty(String(row.underlyingAssets),decimals).value; } catch (_) {continue;}
      if(!Number.isFinite(amount)||amount<=0)continue;
      const symbol=asset===USDC_SOL_MINT?'USDC':asset===USDT_SOL_MINT?'USDT':
        String(market?.asset?.symbol||rowToken.symbol||'TOKEN').replace(/^jl/i,'').slice(0,15);
      const stable=asset===USDC_SOL_MINT||asset===USDT_SOL_MINT;
      const apr=asRatePercent(market?.totalRate);
      const logoUrl=stable?(asset===USDC_SOL_MINT?LOGOS.usdc:LOGOS.usdt):
        validLogo(market?.asset?.logo_url)||null;
      positions.push({
        kind:'jupiter',name:'Jupiter Earn · '+symbol,network:'Solana',asset:symbol,
        amount,apr,rateKind:'APY',rewards:null,day:apr==null?null:amount*(Math.pow(1+apr/100,1/365)-1),
        logoUrl,assetMint:asset,shareMint:String(rowToken.address||market?.address||''),decimals,stable,source:'Jupiter Lend · on-chain shares'
      });
      if(asset===USDC_SOL_MINT)usdc+=amount;
      if(asset===USDT_SOL_MINT)usdt+=amount;
    }
    // The Earnings API requires jlToken (share) mint addresses, not underlying USDC/USDT mints.
    // The response is an array on the API, although the published schema also depicts one object.
    // UnderlyingAssets already includes the interest: never add rewards to the reserve twice.
    if(positions.length){
      const shares=[...new Set(positions.map(p=>p.shareMint)
        .filter(m=>/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(m)))];
      if(shares.length){
        try {
          const earn=await json(JUP_LEND+'/earnings?user='+encodeURIComponent(SOL_ACCOUNT)+'&positions='+encodeURIComponent(shares.join(',')),{},6500);
          const entries=Array.isArray(earn)?earn:Array.isArray(earn?.data)?earn.data:
            earn&&typeof earn==='object'?[earn]:[];
          for(const p of positions){
            const e=entries.find(x=>x&&(!x.ownerAddress||x.ownerAddress===SOL_ACCOUNT)&&
              (x.address===p.shareMint||x.address===p.assetMint));
            if(!e)continue;
            const raw=Number(e.earnings);
            if(!Number.isFinite(raw)||raw<0)continue;
            const decimals=p.stable?6:p.decimals;
            const earned=raw/Math.pow(10,decimals);
            if(Number.isFinite(earned)&&earned>=0)p.rewards=earned;
          }
        } catch (_) { /* Do not replace unavailable interest with invented zeroes. */ }
      }
    }
    return {positions,usdc,usdt,available:true};
  }
  async function injectiveYield() {
    const [delegated,rewards,stakingRate]=await Promise.allSettled([
      lcd('/cosmos/staking/v1beta1/delegations/'+encodeURIComponent(INJ_ACCOUNT)+'?pagination.limit=200'),
      lcd('/cosmos/distribution/v1beta1/delegators/'+encodeURIComponent(INJ_ACCOUNT)+'/rewards'),
      window.INJ_STAKING_APR.wallet(INJ_ACCOUNT)
    ]);
    if(delegated.status==='rejected')throw new Error('Staking Injective non verificabile');
    const delegations=delegated.value?.delegation_responses;
    if(!Array.isArray(delegations))throw new Error('Risposta delegazioni non valida');
    let staked=0;
    for(const entry of delegations) {
      if(entry.balance?.denom==='inj')staked+=qty(entry.balance.amount,18).value||0;
    }
    const totalRewards=rewards.status==='fulfilled' ? (rewards.value.total||[])
      .filter(x=>x.denom==='inj')
      .reduce((acc,x)=>acc+(qty(String(x.amount||'0').split('.')[0],18).value||0),0) : null;
    const verified=stakingRate.status==='fulfilled'&&!stakingRate.value?.stale?stakingRate.value:null;
    const apr=verified&&Number.isFinite(verified.apr)?verified.apr:null;
    return {
      positions:staked>0?[{
        name:'Staking Injective',network:'Injective',amount:staked,asset:'INJ',
        apr, rewards:totalRewards,
        day:apr==null?null:staked*(apr/100)/365,
        rewardNote:'Reward osservate on-chain · APR netto per validatore verificato'
      }]:[],
      stakingObserved:staked>0,
      aprAvailable:apr!=null,
      rewardsAvailable:totalRewards!=null
    };
  }
  async function scan() {
    const done=await Promise.allSettled([injectiveBank(),solanaBank(),injectiveYield(),jupiterEarn()]);
    return {
      inj:done[0].status==='fulfilled'?done[0].value:null,
      sol:done[1].status==='fulfilled'?done[1].value:null,
      yield:done[2].status==='fulfilled'?done[2].value:null,
      jupiter:done[3].status==='fulfilled'?done[3].value:null,
      errors:{
        inj:done[0].status==='rejected',
        sol:done[1].status==='rejected',
        yield:done[2].status==='rejected',
        jupiter:done[3].status==='rejected'
      }
    };
  }
  window.INJ_CASH_PORTFOLIO=Object.freeze({scan});
})();
