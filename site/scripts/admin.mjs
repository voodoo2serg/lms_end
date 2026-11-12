#!/usr/bin/env node
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,existsSync} from 'node:fs';
import path from 'node:path';
import {randomUUID,randomBytes,scryptSync} from 'node:crypto';
import {createInterface} from 'node:readline/promises';
const args=process.argv.slice(2);const reset=args[0]==='reset-password';const dir=process.env.DATA_DIR||path.join(process.cwd(),'data');mkdirSync(dir,{recursive:true,mode:0o700});
if(!existsSync(path.join(dir,'community.sqlite'))){console.error('Сначала запустите сайт и откройте главную страницу, чтобы создать базу.');process.exit(1);}
const rl=createInterface({input:process.stdin,output:process.stdout});
const email=(process.env.ADMIN_EMAIL||await rl.question('Email: ')).trim().toLowerCase();
rl.close();
let password=process.env.ADMIN_PASSWORD;
if(!password){if(!process.stdin.isTTY){console.error('Передайте ADMIN_PASSWORD через окружение.');process.exit(1);}process.stdout.write('Пароль (ввод скрыт): ');password=await new Promise(resolve=>{let s='';process.stdin.setRawMode(true);function onData(chunk){for(const c of chunk.toString()){if(c==='\r'||c==='\n'){process.stdin.setRawMode(false);process.stdin.removeListener('data',onData);process.stdout.write('\n');resolve(s);return;}if(c==='\u0003')process.exit(130);if(c==='\u007f')s=s.slice(0,-1);else s+=c;}}process.stdin.on('data',onData);});}
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<12||password.length>128){console.error('Нужен корректный email и пароль от 12 до 128 символов.');process.exit(1);}
const db=new DatabaseSync(path.join(dir,'community.sqlite'));db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');const salt=randomBytes(16).toString('hex'),hash=salt+':'+scryptSync(password,salt,64).toString('hex');
if(reset){const u=db.prepare('SELECT id FROM users WHERE email=?').get(email);if(!u){console.error('Пользователь не найден');process.exit(1);}db.prepare('UPDATE users SET password=? WHERE id=?').run(hash,u.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(u.id);console.log('Пароль обновлён, сеансы завершены.');}
else {const existing=db.prepare('SELECT id FROM users WHERE email=?').get(email);if(existing){db.prepare("UPDATE users SET role='admin',club=1,password=? WHERE id=?").run(hash,existing.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(existing.id);}else{const username=process.env.ADMIN_USERNAME||'admin';db.prepare("INSERT INTO users(id,email,username,name,password,role,club,created,consent) VALUES(?,?,?,?,?,'admin',1,?,?)").run(randomUUID(),email,username,'Администратор',hash,new Date().toISOString(),'server-owner');}console.log('Администратор настроен. Вход: /#/login. Редактор: /#/admin.');}
db.close();
