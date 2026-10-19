export default {
 async fetch(request, env) {
  const origin = 'https://jojotaytay.github.io';
  const cors = {'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Content-Type':'application/json'};
  const respond=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
  if(request.method==='OPTIONS')return new Response(null,{headers:cors});
  const url=new URL(request.url);
  if(url.pathname==='/health')return respond({ok:true});
  if(!env.BOT_TOKEN||!env.DB)return respond({error:'Server not configured'},503);
  if(request.method!=='POST')return respond({error:'Use POST'},405);
  let input;try{input=await request.json()}catch{return respond({error:'Invalid JSON'},400)}
  const user=await verify(input.initData,env.BOT_TOKEN);
  if(!user)return respond({error:'Open this game from Telegram to join the leaderboard'},401);
  const group=env.GROUP_ID;
  if(!group)return respond({error:'Set GROUP_ID to your Telegram group ID'},503);
  if(url.pathname==='/leaderboard'){
   const rows=await env.DB.prepare('SELECT name, MAX(score) AS score FROM rounds WHERE group_id=? GROUP BY user_id ORDER BY score DESC LIMIT 10').bind(group).all();
   return respond({leaders:rows.results});
  }
  if(url.pathname==='/start'){
   const id=crypto.randomUUID(), seed=crypto.randomUUID(), now=Date.now();
   await env.DB.prepare('INSERT INTO sessions(id,user_id,group_id,seed,started_at,expires_at) VALUES(?,?,?,?,?,?)').bind(id,String(user.id),group,seed,now,now+90000).run();
   return respond({sessionId:id,seed,duration:60});
  }
  if(url.pathname==='/finish'){
   const {sessionId,events}=input;
   if(typeof sessionId!=='string'||!Array.isArray(events)||events.length>150)return respond({error:'Invalid round'},400);
   const session=await env.DB.prepare('SELECT * FROM sessions WHERE id=? AND user_id=?').bind(sessionId,String(user.id)).first();
   if(!session||session.used||Date.now()>session.expires_at||Date.now()-session.started_at<55000)return respond({error:'Invalid or unfinished round'},400);
   // Client-side events are not authoritative. Keep these results explicitly provisional until server-side game simulation is implemented.
   return respond({error:'Competitive score verification is not enabled yet. Practice rounds remain local.'},501);
  }
  return respond({error:'Not found'},404);
 }
};
async function verify(initData,token){
 if(typeof initData!=='string'||!initData)return null;
 const p=new URLSearchParams(initData), hash=p.get('hash');if(!hash||!/^[a-f0-9]{64}$/i.test(hash))return null;
 p.delete('hash');const auth=Number(p.get('auth_date'));if(!auth||Math.abs(Date.now()/1000-auth)>86400)return null;
 const data=[...p.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+'='+v).join('\n');
 const enc=new TextEncoder();
 const secret=await crypto.subtle.sign('HMAC',await crypto.subtle.importKey('raw',enc.encode('WebAppData'),{name:'HMAC',hash:'SHA-256'},false,['sign']),enc.encode(token));
 const key=await crypto.subtle.importKey('raw',secret,{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const mac=await crypto.subtle.sign('HMAC',key,enc.encode(data));
 const expected=[...new Uint8Array(mac)].map(x=>x.toString(16).padStart(2,'0')).join('');
 if(expected!==hash.toLowerCase())return null;
 try{const user=JSON.parse(p.get('user'));return user&&Number.isSafeInteger(user.id)?user:null}catch{return null}
}
