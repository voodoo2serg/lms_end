import {parseContact,inquiryTopic} from '@/lib/inquiries';
import {NextRequest,NextResponse} from 'next/server';
import {randomBytes,randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {db,content,saveContent,publicUser,sessionUser,hashPassword,verifyPassword,tokenHash,limit,type User} from '@/lib/server/store';
import type {CommunityContent} from '@/lib/content-types';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const COOKIE='solo_session';
const TTL=7*24*60*60*1000;
function json(data:unknown,status=200){return NextResponse.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
function error(message:string,status=400){return json({error:message},status);}
const emailOK=(s:string)=>s.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const loginOK=(s:string)=>/^[a-z0-9_.-]{3,40}$/.test(s);
function safeLink(s:string){if(!s)return true;try{return new URL(s).protocol==='https:';}catch{return false;}}
function cookieOptions(){return {httpOnly:true,secure:process.env.COOKIE_SECURE==='true'||(process.env.NODE_ENV==='production'&&process.env.COOKIE_SECURE!=='false'),sameSite:'lax' as const,path:'/',maxAge:TTL/1000};}
function startSession(u:User){const token=randomBytes(32).toString('base64url');db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(tokenHash(token),u.id,Date.now()+TTL);const res=json({user:publicUser(u)});res.cookies.set(COOKIE,token,cookieOptions());return res;}
export async function GET(req:NextRequest,{params}:{params:Promise<{path:string[]}>}){
 const route=(await params).path.join('/');const user=sessionUser(req.cookies.get(COOKIE)?.value);const c=content();
 if(route==='content'){return json({...c,materials:c.materials.map(({body,...m})=>m),events:user?c.events.map(({roomUrl,recordingUrl,...e})=>e):[]});}
 if(route==='me')return json({user:user?publicUser(user):null});
 if(route==='avatar'){if(!user?.avatar)return error('Фото не найдено',404);return new NextResponse(new Uint8Array(user.avatar),{headers:{'Content-Type':'image/webp','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}
 if(route.startsWith('materials/')){const m=c.materials.find(m=>m.id===route.slice(10));if(!m)return error('Материал не найден',404);if(m.access==='club'&&!user?.club&&user?.role!=='admin')return error('Материал доступен участникам клуба',403);return json({material:m});}
 if(!user)return error('Войдите в аккаунт',401);
 if(route==='dashboard'){const saved=db.prepare('SELECT material_id,done FROM saved WHERE user_id=?').all(user.id);const attendance=db.prepare('SELECT event_id FROM attendance WHERE user_id=?').all(user.id) as {event_id:string}[];return json({saved,events:c.events.filter(e=>attendance.some(a=>a.event_id===e.id)).map(e=>({...e,roomUrl:undefined,recordingUrl:undefined})),courses:db.prepare('SELECT course_id,purchased FROM purchases WHERE user_id=?').all(user.id),documents:db.prepare('SELECT id,title,url,created FROM documents WHERE user_id=?').all(user.id),requests:db.prepare('SELECT kind,created FROM requests WHERE user_id=?').all(user.id)});}
 if(route==='admin'){if(user.role!=='admin')return error('Недостаточно прав',403);return json({content:c,users:db.prepare('SELECT id,name,username,email,club,role FROM users ORDER BY created DESC').all(),requests:[...db.prepare('SELECT r.*,u.name,u.email FROM requests r JOIN users u ON u.id=r.user_id ORDER BY r.created DESC').all(),...db.prepare('SELECT * FROM leads ORDER BY created DESC').all()]});}
 return error('Не найдено',404);
}
export async function POST(req:NextRequest,{params}:{params:Promise<{path:string[]}>}){
 // All writes must originate from the same browser origin. Host is supplied by our reverse proxy.
 const origin=req.headers.get('origin');let originAllowed=false;try{const parsed=new URL(origin||'');originAllowed=['http:','https:'].includes(parsed.protocol)&&(process.env.SITE_ORIGIN?parsed.origin===process.env.SITE_ORIGIN:parsed.origin===new URL(req.url).origin||parsed.host===req.headers.get('host'));}catch{}if(!originAllowed)return error('Недопустимый источник запроса',403);
 const route=(await params).path.join('/');const token=req.cookies.get(COOKIE)?.value;const user=sessionUser(token);
 if(Number(req.headers.get('content-length')||0)>3_000_000)return error('Слишком большой запрос',413);
 let b:Record<string,unknown>;try{const raw=await req.text();if(Buffer.byteLength(raw)>3_000_000)return error('Слишком большой запрос',413);b=JSON.parse(raw);if(!b||Array.isArray(b)||typeof b!=='object')return error('Некорректный запрос');}catch{return error('Некорректный запрос');}
 try{
 if(route==='register'||route==='login'){
  const login=String(b.login||b.email||'').trim().toLowerCase();const pass=String(b.password||'');
  if(!limit('auth:'+tokenHash(login),10,15)||!limit('auth-global',200,15))return error('Слишком много попыток. Попробуйте через 15 минут.',429);
  if(pass.length>128)return error('Пароль слишком длинный');
  if(route==='register'){
   const username=String(b.username||'').trim().toLowerCase();const name=String(b.name||'').trim();
   if(!emailOK(login)||!loginOK(username)||name.length<2||name.length>80||pass.length<12||b.consent!==true)return error('Укажите имя, email, логин и пароль от 12 символов. Подтвердите согласие.');
   const id=randomUUID();const password=await hashPassword(pass);
   db.prepare('INSERT INTO users(id,email,username,name,password,created,consent) VALUES(?,?,?,?,?,?,?)').run(id,login,username,name,password,new Date().toISOString(),JSON.stringify({acceptedAt:new Date().toISOString(),version:'2026-11-06'}));
   return startSession(db.prepare('SELECT * FROM users WHERE id=?').get(id) as User);
  }
  const u=db.prepare('SELECT * FROM users WHERE email=? OR username=?').get(login,login) as User|undefined;
  const valid=await verifyPassword(pass,u?.password||'00000000000000000000000000000000:'+ '00'.repeat(64));
  if(!u||!valid)return error('Неверный логин или пароль',401);return startSession(u);
 }
 if(route==='lead'){
 const name=String(b.name||'').trim()||'Гость',kind=String(b.kind||''),service=String(b.service||'').trim();
 const contact=parseContact(b.contactType||'email',b.contact??b.email);
 if(b.consent!==true||!contact||name.length>80||service.length>120||!['business','club','course'].includes(kind))return error('Укажите контакт и подтвердите согласие на обработку данных.');
 const message=inquiryTopic(kind,service,content().courses);
 const now=new Date().toISOString();
 const ip=req.headers.get('x-forwarded-for')?.split(',')[0]||'unknown';if(!limit('lead:'+tokenHash(contact.type+':'+contact.value),3,60)||!limit('lead-ip:'+tokenHash(ip),20,60))return error('Заявка уже отправлена. Повторите позже.',429);
 db.prepare('INSERT INTO leads(id,name,email,kind,service,message,consent,ads_consent,created,contact_type,contact) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(randomUUID(),name,contact.email,kind,service,message,JSON.stringify({acceptedAt:now,version:'2026-11-12',document:'/consent',privacy:'/privacy',adsConsent:b.adsConsent===true}),b.adsConsent===true?1:0,now,contact.type,contact.value);
 return json({ok:true});
 }
 if(!user)return error('Войдите в аккаунт',401);
 if(route==='logout'){db.prepare('DELETE FROM sessions WHERE token=?').run(tokenHash(token!));const res=json({ok:true});res.cookies.set(COOKIE,'',{...cookieOptions(),maxAge:0});return res;}
 if(route==='profile'){
 const name=String(b.name||'').trim(),username=String(b.username||'').toLowerCase().trim(),about=String(b.about||''),theme=String(b.theme||'system');
 if(name.length<2||name.length>80||!loginOK(username)||about.length>1500||!['light','dark','system'].includes(theme))return error('Проверьте имя, логин и описание профиля.');
 db.prepare('UPDATE users SET name=?,username=?,about=?,theme=? WHERE id=?').run(name,username,about,theme,user.id);return json({user:publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(user.id) as User)});
 }
 if(route==='password'){
 const next=String(b.password||'');if(next.length<12||next.length>128)return error('Пароль должен содержать от 12 до 128 символов');
 if(!limit('password:'+user.id,8,15))return error('Слишком много попыток',429);
 if(!await verifyPassword(String(b.current||''),user.password))return error('Текущий пароль неверен');
 db.prepare('UPDATE users SET password=? WHERE id=?').run(await hashPassword(next),user.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);return startSession(user);
 }
 if(route==='avatar'){
 const data=String(b.data||'');if(!/^data:image\/(png|jpeg|webp);base64,/.test(data)||data.length>2_800_000)return error('Выберите JPG, PNG или WebP до 2 МБ');
 const buffer=Buffer.from(data.split(',')[1],'base64');if(buffer.length>2*1024*1024)return error('Размер фото больше 2 МБ');
 const image=await sharp(buffer,{limitInputPixels:20_000_000}).rotate().resize(320,320,{fit:'cover'}).webp({quality:85}).toBuffer();db.prepare('UPDATE users SET avatar=? WHERE id=?').run(image,user.id);return json({ok:true});
 }
 if(route==='save'){
 const id=String(b.id);const m=content().materials.find(m=>m.id===id);if(!m)return error('Материал не найден',404);if(m.access==='club'&&!user.club&&user.role!=='admin')return error('Нужен доступ в клуб',403);
 if(b.remove)db.prepare('DELETE FROM saved WHERE user_id=? AND material_id=?').run(user.id,id);else db.prepare('INSERT INTO saved VALUES(?,?,?) ON CONFLICT(user_id,material_id) DO UPDATE SET done=excluded.done').run(user.id,id,b.done?1:0);return json({ok:true});
 }
 if(route==='enroll'||route==='join'){
 const e=content().events.find(e=>e.id===String(b.id));if(!e)return error('Событие не найдено',404);if(e.access==='club'&&!user.club&&user.role!=='admin')return error('Нужен доступ в клуб',403);
 if(route==='enroll'){if(b.remove)db.prepare('DELETE FROM attendance WHERE user_id=? AND event_id=?').run(user.id,e.id);else db.prepare('INSERT OR IGNORE INTO attendance VALUES(?,?)').run(user.id,e.id);return json({ok:true});}
 const enrolled=db.prepare('SELECT 1 FROM attendance WHERE user_id=? AND event_id=?').get(user.id,e.id);if(!enrolled)return error('Сначала добавьте событие в свой календарь',403);
 const now=Date.now();const active=now>=new Date(e.start).getTime()-15*60000&&now<=new Date(e.end).getTime();const url=active?e.roomUrl:now>new Date(e.end).getTime()?e.recordingUrl:'';
 if(!url||!safeLink(url))return error('Ссылка пока не добавлена или встреча ещё не началась',409);return json({url});
 }
 if(route==='request'){
 const kind=String(b.kind||''),message=String(b.message||'');if(!['club','mentoring','consulting'].includes(kind)||message.length>3000)return error('Некорректная заявка');
 if(!limit('request:'+user.id,3,60))return error('Заявка уже отправлена. Повторите позже.',429);
 db.prepare('INSERT INTO requests VALUES(?,?,?,?,?)').run(randomUUID(),user.id,kind,message,new Date().toISOString());return json({ok:true});
 }
 if(user.role!=='admin')return error('Недостаточно прав',403);
 if(route==='admin/content'){
 const c=b.content as CommunityContent;
 if(!c||!c.home||!c.brand||!c.pages||!c.legal||!Array.isArray(c.materials)||!Array.isArray(c.events)||c.materials.length>300||c.events.length>300)return error('Некорректное содержимое');
 if(JSON.stringify(c).length>1_500_000)return error('Слишком много данных');
 const ids=new Set<string>();for(const m of c.materials){if(!/^[a-z0-9-]{1,80}$/.test(m.id)||ids.has(m.id)||!['open','club'].includes(m.access)||!m.title||typeof m.body!=='string')return error('Проверьте материалы и уникальность их кодов');ids.add(m.id);}
 ids.clear();for(const e of c.events){if(!/^[a-z0-9-]{1,80}$/.test(e.id)||ids.has(e.id)||!e.title||!['open','club'].includes(e.access)||!Number.isFinite(Date.parse(e.start))||Date.parse(e.end)<=Date.parse(e.start)||!safeLink(e.roomUrl)||!safeLink(e.recordingUrl))return error('Проверьте даты и HTTPS-ссылки событий');ids.add(e.id);}
 if(!Array.isArray(c.courses)||c.courses.length>300)return error('Проверьте программы');
 for(const v of c.videos||[])if(!v.id||!v.title||!v.url||!safeLink(v.url))return error('Проверьте HTTPS-ссылки видео');
 if(!safeLink(c.brand.telegram)||!safeLink(c.brand.vk)||!safeLink(c.brand.max||''))return error('Контактные ссылки должны начинаться с https://');
 saveContent(c);db.prepare('INSERT INTO audit(actor,action,created) VALUES(?,?,?)').run(user.id,'content.update',new Date().toISOString());return json({ok:true});
 }
 if(route==='admin/purchase'){
 const id=String(b.id),course=String(b.course);
 if(!content().courses.some(c=>c.id===course))return error('Курс не найден');
 if(b.remove)db.prepare('DELETE FROM purchases WHERE user_id=? AND course_id=?').run(id,course);
 else db.prepare('INSERT OR IGNORE INTO purchases VALUES(?,?,?)').run(id,course,new Date().toISOString());
 return json({ok:true});
 }
 if(route==='admin/document'){
 const id=String(b.id),title=String(b.title||''),url=String(b.url||'');
 if(title.length<2||title.length>200||!safeLink(url)||!url)return error('Укажите название и HTTPS-ссылку');
 db.prepare('INSERT INTO documents VALUES(?,?,?,?,?)').run(randomUUID(),id,title,url,new Date().toISOString());return json({ok:true});
 }
 if(route==='admin/member'){
 const id=String(b.id);db.prepare('UPDATE users SET club=? WHERE id=?').run(b.club?1:0,id);db.prepare('INSERT INTO audit(actor,action,created) VALUES(?,?,?)').run(user.id,'membership.update:'+id,new Date().toISOString());return json({ok:true});
 }
 return error('Не найдено',404);
 }catch(e){if(String(e).includes('UNIQUE'))return error('Этот email или логин уже занят',409);console.error('Portal operation failed',route,e instanceof Error?e.message:'unknown');return error('Не удалось выполнить действие. Проверьте данные и повторите.',500);}
}
