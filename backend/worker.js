export default {
 async fetch(request,env){
  const cors={'Access-Control-Allow-Origin':'https://jojotaytay.github.io','Access-Control-Allow-Methods':'POST, OPTIONS, GET','Access-Control-Allow-Headers':'Content-Type','Content-Type':'application/json'};
  const out=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
  if(request.method==='OPTIONS')return new Response(null,{headers:cors});
  const path=new URL(request.url).pathname;
  if(path==='/health')return out({ok:true,db:!!env.DB,bot:!!env.BOT_TOKEN,group:!!env.GROUP_ID});
  if(!env.DB||!env.BOT_TOKEN||!env.GROUP_ID)return out({error:'Backend configuration incomplete'},503);
  if(request.method!=='POST')return out({error:'Use POST'},405);
  let body;try{body=await request.json()}catch{return out({error:'Invalid JSON'},400)}
  const user=await verify(body.initData,env.BOT_TOKEN);
  if(!user)return out({error:'Open the Mini App through Telegram to join the leaderboard'},401);
  const uid=String(user.id), group=String(env.GROUP_ID), now=Date.now();
  const monday=weekStart(now);
  try{
   if(path==='/leaderboard'){
    const result=await env.DB.prepare('SELECT name, MAX(score) AS score FROM rounds WHERE group_id=? AND created_at>=? GROUP BY user_id ORDER BY score DESC LIMIT 10').bind(group,monday).all();
    return out({leaders:result.results,weekStart:monday,verified:false});
   }
   if(path==='/start'){
    const id=crypto.randomUUID();
    await env.DB.prepare('INSERT INTO sessions(id,user_id,group_id,seed,started_at,expires_at) VALUES(?,?,?,?,?,?)').bind(id,uid,group,'v1',now,now+120000).run();
    return out({sessionId:id,duration:60});
   }
   if(path==='/finish'){
    const {sessionId,events,casts,score}=body;
    if(typeof sessionId!=='string'||!Array.isArray(events)||events.length>90||!Number.isInteger(casts)||casts<0||casts>90||!Number.isInteger(score)||score<0)return out({error:'Invalid score submission'},400);
    const session=await env.DB.prepare('SELECT * FROM sessions WHERE id=? AND user_id=? AND group_id=?').bind(sessionId,uid,group).first();
    if(!session||session.used||now>session.expires_at||now-session.started_at<58000)return out({error:'Round incomplete or already submitted'},400);
    let sum=0,prev=-1,seen=new Set();
    for(const e of events){
     if(!e||!Number.isInteger(e.t)||e.t<0||e.t>60000||e.t<prev||!Number.isInteger(e.points)||![10,25,50,100].includes(e.points)||!Number.isInteger(e.cast)||e.cast<1||e.cast>casts||seen.has(e.cast))return out({error:'Invalid catch events'},400);
     prev=e.t;seen.add(e.cast);sum+=e.points;
    }
    if(sum!==score||events.length>casts)return out({error:'Score mismatch'},400);
    const updated=await env.DB.prepare('UPDATE sessions SET used=1 WHERE id=? AND used=0').bind(sessionId).run();
    if(updated.meta.changes!==1)return out({error:'Round already submitted'},409);
    const name=String(user.first_name||user.username||'Fisher').slice(0,40);
    await env.DB.prepare('INSERT INTO rounds(id,user_id,group_id,name,score,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),uid,group,name,score,now).run();
    return out({saved:true,score,provisional:true});
   }
   return out({error:'Not found'},404);
  }catch(e){return out({error:'Database request failed'},500)}
 }
};
function weekStart(now){const d=new Date(now+8*3600000),day=(d.getUTCDay()+6)%7;return Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()-day)-8*3600000}
async function verify(initData,token){
 if(typeof initData!=='string'||!initData)return null;
 const p=new URLSearchParams(initData),hash=p.get('hash');if(!hash||!/^[0-9a-f]{64}$/i.test(hash))return null;
 p.delete('hash');const auth=Number(p.get('auth_date'));if(!auth||Math.abs(Date.now()/1000-auth)>86400)return null;
 const data=[...p.entries()].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>k+'='+v).join('\n');
 const enc=new TextEncoder(),h={name:'HMAC',hash:'SHA-256'};
 const s=await crypto.subtle.sign('HMAC',await crypto.subtle.importKey('raw',enc.encode('WebAppData'),h,false,['sign']),enc.encode(token));
 const mac=await crypto.subtle.sign('HMAC',await crypto.subtle.importKey('raw',s,h,false,['sign']),enc.encode(data));
 const expected=[...new Uint8Array(mac)].map(x=>x.toString(16).padStart(2,'0')).join('');
 if(expected!==hash.toLowerCase())return null;
 try{const u=JSON.parse(p.get('user'));return u&&Number.isSafeInteger(u.id)?u:null}catch{return null}
}
