'use client';
import {useEffect} from 'react';
import Header from './Header';
import Footer from './Footer';
import CookieBanner from './CookieBanner';
import {ProjectPage,OrderPage,JoinPage,CoursePage,ExpressDiagnostics} from '@/components/views/project';
import HomeView from '@/components/views/home';
import DiagnosticsView from '@/components/views/diagnostics';
import {LibraryView,MaterialView} from '@/components/views/library';
import {CommunityPage,CommunityEvents,CommunityLegal,CommunityContacts} from '@/components/views/community';
import {AuthView,AccountView} from '@/components/views/account';
import {AdminView} from '@/components/views/admin';
import {CommunityProvider,useCommunity} from './CommunityProvider';
import {useHashRoute,SiteLink} from '@/lib/router';
function View({route}:{route:string}){const segments=route.split('/').filter(Boolean);if(!segments.length)return <HomeView/>;if(segments[0]==='order')return <OrderPage service={segments[1]||'business'}/>;if(route==='/club/join')return <JoinPage/>;if(route==='/consulting/diagnostics')return <ExpressDiagnostics/>;if(segments[0]==='courses'&&segments[1]&&segments[1]!=='diagnostika')return <CoursePage id={segments[1]}/>;if(segments[0]==='materials')return segments[1]?<MaterialView key={segments[1]} id={segments[1]}/>:<LibraryView/>;if(route==='/courses/diagnostika')return <DiagnosticsView/>;if(['about','courses','club','mentoring','consulting'].includes(segments[0]))return <ProjectPage key={segments[0]} page={segments[0]}/>;if(segments[0]==='events')return <CommunityEvents id={segments[1]}/>;if(['privacy','consent','cookies','terms'].includes(segments[0]))return <CommunityLegal slug={segments[0]}/>;if(route==='/contacts')return <CommunityContacts/>;if(route==='/login'||route==='/register')return <AuthView key={route} register={route==='/register'}/>;if(route==='/account')return <AccountView/>;if(route==='/admin')return <AdminView/>;return <section className="container-site page-space"><h1 className="page-title">Такой страницы нет.</h1><SiteLink to="/" className="text-link">На главную ↗</SiteLink></section>}
const titles:Record<string,string>={about:'Идея',courses:'Обучение',materials:'Библиотека',club:'Сообщество',events:'Встречи',mentoring:'Менторство',consulting:'Бизнесу',account:'Личный кабинет',admin:'Управление',login:'Вход',register:'Регистрация'};
function Shell(){const route=useHashRoute();const {loading,error,refresh}=useCommunity();useEffect(()=>{if(route!==null){document.title=(titles[route.split('/')[1]]||'Профессиональное сообщество')+' — Соло-PR';window.scrollTo({top:0,behavior:'instant'});}},[route]);return <div className="site-wrapper"><a href="#main" className="skip-link" onClick={e=>{e.preventDefault();document.getElementById('main')?.focus();}}>К содержанию</a><Header route={route}/><main id="main" tabIndex={-1}>{error?<section className="container-site page-space"><h1 className="page-title">Не удалось загрузить сайт.</h1><p>{error}</p><button className="btn btn-outline" onClick={refresh}>Попробовать снова</button></section>:loading||route===null?<div className="container-site loading-state" role="status">Открываем пространство Соло-PR…</div>:<View route={route}/>}</main><Footer/><CookieBanner/></div>}
export default function SiteShell(){return <CommunityProvider><Shell/></CommunityProvider>}
