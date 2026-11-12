'use client';
import {createContext,useContext,useEffect,useState,useCallback,type ReactNode} from 'react';
import type {CommunityContent} from '@/lib/content-types';
export type Member={id:string;email:string;username:string;name:string;about:string;role:string;club:boolean;theme:string;hasAvatar:boolean};
export type PublicContent=Omit<CommunityContent,'materials'|'events'>&{materials:Omit<CommunityContent['materials'][number],'body'>[];events:Omit<CommunityContent['events'][number],'roomUrl'|'recordingUrl'>[]};
export async function api(path:string,data?:unknown){const res=await fetch('/api/portal/'+path,{method:data===undefined?'GET':'POST',headers:data===undefined?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data),cache:'no-store'});const body=await res.json();if(!res.ok)throw new Error(body.error||'Не удалось выполнить запрос');return body;}
const Context=createContext<{content:PublicContent|null;user:Member|null;loading:boolean;error:string;refresh:()=>Promise<void>;setUser:(u:Member|null)=>void;theme:string;resolvedTheme:'light'|'dark';setTheme:(t:string)=>void}>({content:null,user:null,loading:true,error:'',refresh:async()=>{},setUser:()=>{},theme:'system',resolvedTheme:'light',setTheme:()=>{}});
export function CommunityProvider({children}:{children:ReactNode}){
 const [content,setContent]=useState<PublicContent|null>(null),[user,setUser]=useState<Member|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[theme,setTheme]=useState('system'),[resolvedTheme,setResolvedTheme]=useState<'light'|'dark'>('light'),[themeReady,setThemeReady]=useState(false);
 const refresh=useCallback(async()=>{try{const [c,m]=await Promise.all([api('content'),api('me')]);setContent(c);setUser(m.user);setError('');if(m.user)setTheme(m.user.theme);}catch(e){setError((e as Error).message);}finally{setLoading(false);}},[]);
 useEffect(()=>{setTheme(localStorage.getItem('solo-theme')||'system');setThemeReady(true);refresh();},[refresh]);
 useEffect(()=>{if(user)setTheme(user.theme);},[user?.theme]);
 useEffect(()=>{if(!themeReady)return;const mq=matchMedia('(prefers-color-scheme: dark)');const apply=()=>{const dark=theme==='dark'||theme==='system'&&mq.matches;document.documentElement.classList.toggle('dark',dark);document.documentElement.dataset.theme=dark?'dark':'light';document.documentElement.style.colorScheme=dark?'dark':'light';setResolvedTheme(dark?'dark':'light');};apply();mq.addEventListener('change',apply);localStorage.setItem('solo-theme',theme);return()=>mq.removeEventListener('change',apply);},[theme,themeReady]);
 useEffect(()=>{if(themeReady)api('content').then(setContent).catch(()=>{});},[user?.id,themeReady]);
 return <Context.Provider value={{content,user,loading,error,refresh,setUser,theme,resolvedTheme,setTheme}}>{children}</Context.Provider>;
}
export const useCommunity=()=>useContext(Context);
