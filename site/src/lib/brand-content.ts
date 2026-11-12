import type {CommunityContent} from './content-types';
export const brandDetails={email:'serg@vodopetov.ru',telegram:'https://t.me/prvodo',max:'',operator:'ИП Водопетов Сергей Вячеславович',inn:'526014116108',ogrnip:'320774600237564',address:'Москва',registered:'29.06.2020',activity:'Деятельность в сфере связей с общественностью'};
/** Apply this requested brand revision once; later CMS edits retain their values. */
export function withBranding(input:CommunityContent):CommunityContent{
 if((input.brandRevision||0)>=1)return input;
 return {...input,brandRevision:1,brand:{...input.brand,...brandDetails},courses:input.courses.some(c=>c.id==='digital-transformation')?input.courses:[...input.courses,{id:'digital-transformation',title:'Цифровая трансформация пиарщика',description:'Свяжите коммуникации, данные и ИИ с реальной задачей бизнеса. Соберите собственную систему работы.',image:'/images/mountain-horizon.webp',dateLabel:'Даты набора уточняются',status:'planned',format:'Программа · 12 недель',topics:['Профессиональная позиция и карта ценности','Данные и исследование открытых источников','ИИ-агенты и проверка результатов','Собственный продакшен и рабочий IT-контур','Дорожная карта трансформации']} ]};
}

/** Refresh only the requested hero copy once; subsequent CMS edits stay intact. */
export function withPresentation(input:CommunityContent):CommunityContent{
 if((input.presentationRevision||0)>=1)return input;
 return {...input,presentationRevision:1,home:{...input.home,title:'Ваша PR-экспертиза',italic:'для бизнеса.'}};
}
