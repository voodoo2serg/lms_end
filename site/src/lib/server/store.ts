import 'server-only';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,existsSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import path from 'node:path';
import {randomBytes,createHash,scrypt as scryptCallback,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {withBranding,withPresentation} from '../brand-content';
import {seed} from './seed';
import type {CommunityContent} from '../content-types';
const dir=process.env.DATA_DIR||path.join(process.cwd(),'data');
mkdirSync(dir,{recursive:true,mode:0o700});
const globalDb=globalThis as unknown as {soloDb?:DatabaseSync};
export const db=globalDb.soloDb??new DatabaseSync(path.join(dir,'community.sqlite'));
globalDb.soloDb=db;
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,username TEXT UNIQUE NOT NULL,name TEXT NOT NULL,about TEXT NOT NULL DEFAULT '',password TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'member',club INTEGER NOT NULL DEFAULT 0,theme TEXT NOT NULL DEFAULT 'system',avatar BLOB,created TEXT NOT NULL,consent TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS saved(user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,material_id TEXT NOT NULL,done INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(user_id,material_id));
CREATE TABLE IF NOT EXISTS attendance(user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,event_id TEXT NOT NULL,PRIMARY KEY(user_id,event_id));
CREATE TABLE IF NOT EXISTS limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS requests(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,kind TEXT NOT NULL,message TEXT NOT NULL,created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS leads(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL,kind TEXT NOT NULL,service TEXT NOT NULL,message TEXT NOT NULL,consent TEXT NOT NULL,ads_consent INTEGER NOT NULL DEFAULT 0,created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS purchases(user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,course_id TEXT NOT NULL,purchased TEXT NOT NULL,PRIMARY KEY(user_id,course_id));
CREATE TABLE IF NOT EXISTS documents(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,title TEXT NOT NULL,url TEXT NOT NULL,created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,actor TEXT NOT NULL,action TEXT NOT NULL,created TEXT NOT NULL);`);
const leadColumns=db.prepare('PRAGMA table_info(leads)').all() as {name:string}[];
if(!leadColumns.some(c=>c.name==='contact_type'))db.exec("ALTER TABLE leads ADD COLUMN contact_type TEXT NOT NULL DEFAULT 'email'");
if(!leadColumns.some(c=>c.name==='contact'))db.exec("ALTER TABLE leads ADD COLUMN contact TEXT NOT NULL DEFAULT ''");
const file=path.join(dir,'content.json');
export function content():CommunityContent {if(!existsSync(file)){writeFileSync(file,JSON.stringify(seed,null,2),{mode:0o600});}const current=JSON.parse(readFileSync(file,'utf8'));
if(!current.designRevision){current.home=seed.home;current.pages=seed.pages;current.courses=seed.courses;current.brand.name='Соло-PR';current.designRevision=2;saveContent(current);}
const branded=withPresentation(withBranding(current));if(branded!==current)saveContent(branded);return branded;}
export function saveContent(next:CommunityContent){const tmp=file+'.'+randomBytes(6).toString('hex')+'.tmp';writeFileSync(tmp,JSON.stringify(next,null,2),{mode:0o600});renameSync(tmp,file);}
export type User={id:string;email:string;username:string;name:string;about:string;password:string;role:string;club:number;theme:string;avatar:Uint8Array|null;created:string};
export function publicUser(u:User){return {id:u.id,email:u.email,username:u.username,name:u.name,about:u.about,role:u.role,club:!!u.club,theme:u.theme,hasAvatar:!!u.avatar};}
const scrypt=promisify(scryptCallback);
export async function hashPassword(password:string){const salt=randomBytes(16).toString('hex');const key=await scrypt(password,salt,64) as Buffer;return salt+':'+key.toString('hex');}
export async function verifyPassword(password:string,encoded:string){const [salt,hex]=encoded.split(':');if(!salt||!hex)return false;const key=await scrypt(password,salt,64) as Buffer;const expected=Buffer.from(hex,'hex');return key.length===expected.length&&timingSafeEqual(key,expected);}
export function tokenHash(t:string){return createHash('sha256').update(t).digest('hex');}
export function sessionUser(token?:string):User|null {if(!token)return null;return (db.prepare('SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=? AND s.expires>?').get(tokenHash(token),Date.now()) as User|undefined)||null;}
export function limit(key:string,max:number,minutes:number){const now=Date.now();db.prepare('DELETE FROM limits WHERE expires<?').run(now);db.prepare('INSERT INTO limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(key,now+minutes*60000);return Number((db.prepare('SELECT count FROM limits WHERE key=?').get(key) as {count:number}).count)<=max;}
