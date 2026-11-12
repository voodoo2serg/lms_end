/** Reflective guide. Answers stay in the browser and are not a professional assessment. */
export type DiagnosticOption={text:string};
export type DiagnosticQuestion={question:string;options:DiagnosticOption[]};
export const QUESTIONS:DiagnosticQuestion[]=[
 {question:'В каком формате вы сейчас работаете?',options:[{text:'Работаю внутри компании'},{text:'Веду независимую практику'},{text:'Совмещаю несколько форматов'},{text:'Развиваю собственную команду или проект'}]},
 {question:'Что хочется укрепить в первую очередь?',options:[{text:'Связь своей работы с задачами бизнеса'},{text:'Умение объяснять профессиональную ценность'},{text:'Собственные ресурсы и устойчивость'},{text:'Сотрудничество и обмен опытом'}]},
 {question:'Как вам удобнее начать?',options:[{text:'Почитать и подумать самостоятельно'},{text:'Поработать над своей задачей'},{text:'Обсудить ситуацию с одним коллегой'},{text:'Познакомиться с сообществом'}]}
];
export type RouteStep={text:string;linkTo?:string;linkText?:string};
export type DiagnosticResult={label:string;interpretation:string[];route:RouteStep[];trackId:'a'|'b'|null;trackNote:string|null};
export function buildResult(stage:number,focus:number,format:number):DiagnosticResult{
 const starts=[{label:'Начать с бизнес-контекста',text:'Вы выбрали связь коммуникаций с задачами бизнеса. Попробуйте записать, какое изменение нужно заказчику, кто должен принять решение и какие основания у вашей рекомендации.',link:'/materials/business-question',linkText:'С какого вопроса начинается партнёрство'},{label:'Сформулировать свою ценность',text:'Вы выбрали профессиональную ценность. Опишите одну задачу, которую умеете решать, свой вклад и условия работы. Сопоставьте это описание с тем, что важно вашему заказчику.',link:'/materials/solo-position',linkText:'Что значит быть соло-пиарщиком'},{label:'Собрать собственные опоры',text:'Вы выбрали устойчивость. Составьте карту знаний, отношений, кейсов и инструментов, которые остаются с вами между проектами и должностями.',link:'/materials/professional-assets',linkText:'Ваши профессиональные опоры'},{label:'Найти пространство для обмена',text:'Вы выбрали сотрудничество. Подумайте, какой опыт вы готовы предложить коллегам и с каким вопросом хотели бы к ним обратиться.',link:'/club',linkText:'Познакомиться с клубом'}];
 const s=starts[focus]||starts[0];const route:RouteStep[]=[{text:'Материал для начала самостоятельной работы.',linkTo:s.link,linkText:s.linkText}];
 if(format===1)route.push({text:'Посмотрите, как устроены практические программы.',linkTo:'/courses',linkText:'Обучение'});
 if(format===2)route.push({text:'Можно обсудить индивидуальный формат под вашу задачу.',linkTo:'/mentoring',linkText:'О менторстве'});
 if(format===3&&s.link!=='/club')route.push({text:'Познакомьтесь с принципами сообщества.',linkTo:'/club',linkText:'О клубе'});
 return {label:s.label,interpretation:[s.text,stage===0?'Самостоятельную позицию можно развивать внутри компании. Менять формат занятости для этого необязательно.':'Выбранный формат работы не определяет вашу профессиональную ценность. Учитывайте свои ресурсы и обстоятельства при выборе следующего шага.'],route,trackId:null,trackNote:'Это ориентир для размышления, а не оценка компетентности. Вы можете выбрать любой другой маршрут.'};
}
