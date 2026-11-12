import type {Metadata,Viewport} from 'next';
import '@fontsource-variable/golos-text';
import '@fontsource-variable/unbounded';
import './globals.css';
export const metadata:Metadata={title:'Соло-PR — сообщество самостоятельных специалистов',description:'Профессиональная самостоятельность, экспертная позиция и поддержка коллег. Открытая библиотека, клуб, обучение и встречи специалистов по коммуникациям.',icons:{icon:'/favicon.svg'},openGraph:{title:'Соло-PR — больше свободы и опоры',description:'От исполнителя к партнёру. Сообщество специалистов по коммуникациям.',locale:'ru_RU',type:'website'}};
export const viewport:Viewport={themeColor:'#f7f7f7'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ru" suppressHydrationWarning><body>{children}</body></html>}
