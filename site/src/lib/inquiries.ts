export type ContactType='email'|'telegram'|'max';
export function parseContact(type:unknown,value:unknown){
 if(!['email','telegram','max'].includes(String(type)))return null;
 const kind=String(type) as ContactType;const raw=String(value||'').trim();
 if(!raw||raw.length>254)return null;
 if(kind==='email')return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)?{type:kind,value:raw.toLowerCase(),email:raw.toLowerCase()}:null;
 if(kind==='telegram'){
  const name=raw.replace(/^https?:\/\/(?:www\.)?t\.me\//i,'').replace(/^@/,'').replace(/\/$/,'');
  return /^[a-zA-Z0-9_]{5,32}$/.test(name)?{type:kind,value:'@'+name,email:''}:null;
 }
 const phone=raw.replace(/[\s()\-]/g,'');
 if(/^\+?\d{7,15}$/.test(phone))return {type:kind,value:phone,email:''};
 try{const u=new URL(raw);if(u.protocol==='https:'&&u.hostname==='max.ru'&&u.pathname.length>1&&!u.username&&!u.password)return {type:kind,value:u.href,email:''};}catch{}
 return null;
}
export function inquiryTopic(kind:string,service:string,courses:{id:string;title:string}[]=[]){
 if(kind==='club')return 'Присоединиться к сообществу';
 if(kind==='course'){const course=courses.find(c=>c.id===service);return course?'Информация о курсе «'+course.title+'»':'Информация о курсах';}
 return service?'Заявка: '+service:'Информация об услугах';
}
