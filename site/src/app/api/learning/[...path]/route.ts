import {NextRequest,NextResponse} from 'next/server';
import {access,beginFlow,finishFlow,endSession,flushLeads,configured,serverUrl,LEARNING_COOKIE,FLOW_COOKIE,cookieOptions} from '@/lib/server/learning';
export const runtime='nodejs';
export const dynamic='force-dynamic';
function reply(data:unknown,status=200){return NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});}
async function handle(req:NextRequest,ctx:{params:Promise<{path:string[]}>}){const path=(await ctx.params).path.join('/');if(path==='status'&&req.method==='GET')return reply({configured:configured()});if(!configured())return reply({error:'Учебные сервисы ещё не настроены'},503);
try{
 if(path==='auth/login'&&req.method==='GET'){const flow=beginFlow(),r=NextResponse.redirect(flow.url);r.cookies.set(FLOW_COOKIE,flow.state,{...cookieOptions,maxAge:600});r.headers.set('Cache-Control','no-store');return r;}
 if(path==='auth/callback'&&req.method==='GET'){const state=req.nextUrl.searchParams.get('state')||'',code=req.nextUrl.searchParams.get('code')||'';if(!state||!code||state!==req.cookies.get(FLOW_COOKIE)?.value)return reply({error:'Недействительный вход'},401);const session=await finishFlow(state,code),r=NextResponse.redirect(serverUrl('SITE_ORIGIN')+'/learning');r.cookies.set(LEARNING_COOKIE,session.learning,{...cookieOptions,maxAge:7*86400});r.cookies.set('solo_session',session.community,{...cookieOptions,maxAge:7*86400});r.cookies.delete(FLOW_COOKIE);return r;}
 if(req.method!=='GET'&&req.headers.get('origin')!==serverUrl('SITE_ORIGIN'))return reply({error:'Недопустимый источник запроса'},403);
 if(path==='auth/logout'&&req.method==='POST'){await endSession(req.cookies.get(LEARNING_COOKIE)?.value,req.cookies.get('solo_session')?.value);const r=reply({ok:true});r.cookies.delete(LEARNING_COOKIE);r.cookies.delete('solo_session');return r;}
 if(path==='crm-session'&&req.method==='POST'){const token=await access(req.cookies.get(LEARNING_COOKIE)?.value),up=await fetch(serverUrl('LEARNING_API_URL')+'/api/learning/crm-session',{method:'POST',headers:{Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(10000)});if(!up.ok)return reply({error:'Нет доступа к CRM'},up.status);const data=await up.json(),r=reply({url:'/crm/'});r.cookies.set('crm_session',data.token,{...cookieOptions,maxAge:300});return r;}
 if(path==='bridge/flush'&&req.method==='POST'){// Local admin authorization is checked upstream through verified OIDC.
  const token=await access(req.cookies.get(LEARNING_COOKIE)?.value),r=await fetch(serverUrl('LEARNING_API_URL')+'/api/learning/admin',{headers:{Authorization:'Bearer '+token},cache:'no-store',redirect:'error'});if(!r.ok)return reply({error:'Нет доступа'},r.status);await flushLeads();return reply({ok:true});}
 const allowed=/^(me|dashboard|catalog|checkout|bindings|preferences|chat|chat\/[a-zA-Z0-9-]+|courses\/[a-z0-9-]+\/launch|admin|admin\/(courses|reminders|reconcile)|admin\/reminders\/[a-zA-Z0-9-]+|admin\/jobs\/[a-zA-Z0-9-]+\/retry)$/;
 if(!allowed.test(path))return reply({error:'Не найдено'},404);
 const token=await access(req.cookies.get(LEARNING_COOKIE)?.value);const body=req.method==='GET'?undefined:await req.text();if(body&&body.length>20000)return reply({error:'Слишком большой запрос'},413);
 const r=await fetch(serverUrl('LEARNING_API_URL')+'/api/learning/'+path,{method:req.method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)});return new NextResponse(await r.text(),{status:r.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
}catch{return reply({error:'Не удалось выполнить запрос. Проверьте вход и состояние сервиса.'},401);}}
export const GET=handle;export const POST=handle;export const PUT=handle;export const DELETE=handle;
