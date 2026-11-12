import assert from 'node:assert/strict';
import {AsyncLocalStorage} from 'node:async_hooks';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
globalThis.AsyncLocalStorage=AsyncLocalStorage;
const temp=mkdtempSync(path.join(tmpdir(),'solo-learning-'));
Object.assign(process.env,{DATA_DIR:temp,COOKIE_SECURE:'false',SITE_ORIGIN:'https://site.test',
 OIDC_ISSUER:'https://auth.test/realms/solo-pr',OIDC_CLIENT_ID:'solo-site',OIDC_CLIENT_SECRET:'test-only-client',
 LEARNING_API_URL:'https://api.test',LEARNING_SESSION_KEY:'a'.repeat(64)});
const require=createRequire(import.meta.url),{NextRequest}=require('next/server');
const oldFetch=globalThis.fetch;
let tokenCalls=0,apiCalls=0;
globalThis.fetch=async(url,opts)=>{
 if(String(url).endsWith('/token')){tokenCalls++;const p=new URLSearchParams(opts.body);assert.equal(p.get('grant_type'),'authorization_code');assert.ok(p.get('code_verifier').length>40);return Response.json({access_token:'test-only-access',refresh_token:'test-only-refresh',expires_in:300});}
 if(String(url).endsWith('/logout'))return Response.json({});
 assert.equal(opts.headers.Authorization,'Bearer test-only-access');apiCalls++;
 return Response.json({id:'learner',subject:'test-subject',email:'learner@example.test',name:'Участник',roles:['student'],bots:[]});
};
try{
 const {routeModule}=require('../.next/server/app/api/learning/[...path]/route.js');await routeModule.ensureUserland();const {GET,POST}=routeModule.userland;
 const call=async(route,method='GET',body,cookie='',origin='https://site.test')=>{
  const req=new NextRequest('https://site.test/api/learning/'+route,{method,headers:{origin,'content-type':'application/json',cookie},body:body===undefined?undefined:JSON.stringify(body)});
  const pathname=route.split('?')[0];return await (method==='GET'?GET:POST)(req,{params:Promise.resolve({path:pathname.split('/')})});
 };
 assert.equal((await call('status')).status,200);
 const login=await call('auth/login');assert.equal(login.status,307);
 const redirect=new URL(login.headers.get('location'));
 assert.equal(redirect.searchParams.get('code_challenge_method'),'S256');
 assert.equal(redirect.searchParams.get('redirect_uri'),'https://site.test/api/learning/auth/callback');
 const state=redirect.searchParams.get('state');
 const flow=login.headers.get('set-cookie').split(';')[0];assert.ok(flow.startsWith('solo_learning_flow='));
 assert.equal((await call('auth/callback?state=bad&code=code','GET',undefined,flow)).status,401);
 assert.equal(tokenCalls,0);
 const callback=await call('auth/callback?state='+state+'&code=code','GET',undefined,flow);
 assert.equal(callback.status,307);
 const cookies=callback.headers.getSetCookie();
 const session=cookies.find(c=>c.startsWith('solo_learning=')).split(';')[0];
 const community=cookies.find(c=>c.startsWith('solo_session=')).split(';')[0];
 assert.ok(session&&community);
 assert.equal((await call('auth/callback?state='+state+'&code=code','GET',undefined,flow)).status,401);
 const db=new DatabaseSync(path.join(temp,'community.sqlite'));
 const stored=db.prepare('SELECT encrypted FROM learning_sessions').get();
 assert.ok(!stored.encrypted.includes('test-only-access')&&!stored.encrypted.includes('test-only-refresh'));
 assert.equal(db.prepare('SELECT role FROM users').get().role,'member');
 assert.equal((await call('me','GET',undefined,session)).status,200);
 assert.equal((await call('preferences','POST',{},session,'https://attacker.test')).status,403);
 assert.equal((await call('https://attacker.test','GET',undefined,session)).status,404);
 assert.equal((await call('auth/logout','POST',{},session+'; '+community)).status,200);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM learning_sessions').get().n,0);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n,0);
 db.close();
 console.log('Learning BFF: PKCE, state/replay, session encryption, shared account, CSRF, path allowlist and logout passed. External HTTP mocked.');
}finally{globalThis.fetch=oldFetch;rmSync(temp,{recursive:true,force:true});}
