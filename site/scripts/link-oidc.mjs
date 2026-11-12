// Run only after verifying that the existing community account and Keycloak subject belong to the same person.
import {DatabaseSync} from 'node:sqlite';
import path from 'node:path';
const [email,subject]=process.argv.slice(2);
if(!email||!subject)throw Error('Usage: node scripts/link-oidc.mjs verified-email verified-keycloak-subject');
const db=new DatabaseSync(path.join(process.env.DATA_DIR||'data','community.sqlite'));
db.exec('PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS community_oidc_links(subject TEXT PRIMARY KEY,user_id TEXT NOT NULL UNIQUE REFERENCES users(id));');
const user=db.prepare('SELECT id FROM users WHERE email=? COLLATE NOCASE').get(email);
if(!user)throw Error('Community user not found');
db.prepare('INSERT INTO community_oidc_links(subject,user_id) VALUES(?,?)').run(subject,user.id);
console.log('Identity linked. Passwords were not copied.');
