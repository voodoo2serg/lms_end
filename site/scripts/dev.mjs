import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
const args=process.argv.slice(2);const portIndex=args.lastIndexOf('--port');const port=portIndex>=0?args[portIndex+1]:process.env.PORT||'3000';
const child=spawn(process.execPath,['node_modules/next/dist/bin/next',(args.includes('--strictPort')&&existsSync('.next/BUILD_ID')?'start':'dev'),'--hostname','0.0.0.0','--port',port],{stdio:'inherit',env:{...process.env,...(args.includes('--strictPort')?{COOKIE_SECURE:'false'}:{})}});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));child.on('exit',code=>process.exit(code??0));
