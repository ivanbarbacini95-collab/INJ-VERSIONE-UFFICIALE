// TESTNET ONLY. No mnemonic, no production credentials. Node 20+ and injectived required.
import {atoms,inj,fmtAtoms,planCompound,validateGrants} from './smart-compound-core.mjs';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const RPC='https://testnet.sentry.tm.injective.network:443';
const LCD='https://sentry.lcd.testnet.injective.network:443';
const CHAIN='injective-888';
const [granter,grantee,validator,feeText,...flags]=process.argv.slice(2);
const account=/^inj1[023456789acdefghjklmnpqrstuvwxyz]{38}$/;
const val=/^injvaloper1[023456789acdefghjklmnpqrstuvwxyz]{38}$/;
if(!account.test(granter||'')||!account.test(grantee||'')||granter===grantee||!val.test(validator||'')||!feeText||flags.some(f=>f!=='--broadcast-testnet'))throw Error('Usage: node smart-compound-testnet.mjs GRAN TER GRANTEE VALIDATOR ESTIMATED_FEE_INJ [--broadcast-testnet]'.replace('GRAN TER','GRANTER'));
const fee=inj(feeText);
async function get(base,path){const r=await fetch(base+path,{signal:AbortSignal.timeout(15000),cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status+' '+path);return r.json();}
const status=await get(RPC,'/status');
if(status.result?.node_info?.network!==CHAIN||status.result?.sync_info?.catching_up!==false||Math.abs(Date.now()-Date.parse(status.result.sync_info.latest_block_time))>120000||!Number.isFinite(Date.parse(status.result.sync_info.latest_block_time)))throw Error('Testnet chain/freshness check failed');
const [reward,withdraw,grant,v]=await Promise.all([
get(LCD,'/cosmos/distribution/v1beta1/delegators/'+granter+'/rewards/'+validator),
get(LCD,'/cosmos/distribution/v1beta1/delegators/'+granter+'/withdraw_address'),
get(LCD,'/cosmos/authz/v1beta1/grants?granter='+granter+'&grantee='+grantee),
get(LCD,'/cosmos/staking/v1beta1/validators/'+validator)]);
const g=validateGrants(grant.grants||[],validator);
const coin=reward.rewards?.find(c=>c.denom==='inj');
const p=planCompound({reward:atoms(coin?.amount||'0'),limit:inj('0.01'),minimum:inj('0.0001'),fee,grantLimit:g.limit,withdrawMatches:withdraw.withdraw_address===granter,grantsOK:g.ok,validatorOK:v.validator?.status==='BOND_STATUS_BONDED'&&!v.validator.jailed});
console.log(JSON.stringify({chain:CHAIN,block:status.result.sync_info.latest_block_height,amount:fmtAtoms(p.amount),reason:p.reason,mode:flags.includes('--broadcast-testnet')?'testnet broadcast':'preview'},null,2));
if(p.amount===0n||!flags.includes('--broadcast-testnet'))process.exit(0);
// The grantee pays the fee; user supplies a hard fee cap, never gas-auto at broadcast.
// Cap is also enforced in the eligibility calculation above. Fixed gas may fail.
const tx={body:{messages:[{'@type':'/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',delegator_address:granter,validator_address:validator},{'@type':'/cosmos.staking.v1beta1.MsgDelegate',delegator_address:granter,validator_address:validator,amount:{denom:'inj',amount:p.amount.toString()}}],memo:'INJ Node testnet compound',timeout_height:'0',extension_options:[],non_critical_extension_options:[]},auth_info:{signer_infos:[],fee:{amount:[],gas_limit:'0',payer:'',granter:''}},signatures:[]};
const dir=mkdtempSync(join(tmpdir(),'inj-compound-'));
try{const file=join(dir,'tx.json');writeFileSync(file,JSON.stringify(tx),{mode:0o600});const args=['tx','authz','exec',file,'--from',grantee,'--chain-id',CHAIN,'--node',RPC,'--gas','500000','--fees',fee.toString()+'inj','--broadcast-mode','sync','--output','json','--yes'];const result=spawnSync('injectived',args,{encoding:'utf8',timeout:60000,stdio:['inherit','pipe','pipe']});if(result.error||result.status!==0)throw Error('Broadcast uncertain or failed; inspect chain before retry. '+(result.stderr||result.error||''));const response=JSON.parse(result.stdout);if(Number(response.code)!==0||!/^[0-9a-f]{64}$/i.test(response.txhash||''))throw Error('CheckTx failed or ambiguous; do not retry automatically');console.log('Submitted, not confirmed: '+response.txhash);for(let i=0;i<12;i++){await new Promise(r=>setTimeout(r,2500));try{const data=await get(LCD,'/cosmos/tx/v1beta1/txs/'+response.txhash);const t=data.tx_response;if(t&&t.txhash?.toUpperCase()===response.txhash.toUpperCase()&&Number.isInteger(Number(t.code))){console.log(JSON.stringify({txhash:t.txhash,height:t.height,code:t.code}));if(Number(t.code)!==0)process.exitCode=1;break;}}catch(e){if(i===11){console.warn('Confirmation unknown; check explorer, do not repeat automatically.');process.exitCode=2;}}}}finally{rmSync(dir,{recursive:true,force:true});}
