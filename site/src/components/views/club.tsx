'use client';

import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { SiteLink, scrollToId } from '@/lib/router';
import { PageHook, NearestEventLine, ConsentCheckbox, Field, SuccessCard } from '@/components/site/forms';
import { getCentralEvent, formatEventDate, upcomingEvents } from '@/lib/events';

const RULES = [
  'Заходишь, чтобы давать, а не только брать.',
  'Не продавать, не зазывать, не использовать это как канал лидов.',
  'Тем, кто снаружи, не нужно знать, что происходит внутри.',
  'Можно молчать, но не притворяться, что ты здесь.',
  'Можно уйти в любой момент, без объяснений.',
];

const TEASERS = [
  {
    title: 'Круглый стол раз в месяц',
    text: 'PR-человек, уже ставший независимым, рассказывает, что реально происходило в первый год.',
  },
  {
    title: 'Канал глупых вопросов',
    text: 'Задать можно любой — без страха, что скриншот утечёт.',
  },
  {
    title: 'Карта участников',
    text: 'Не адресная книга, а карта «кто делает похожие вещи».',
  },
  {
    title: 'Записи прошлых встреч',
    text: 'Если пропустил круглый стол — запись ждёт внутри.',
  },
];

const MONTHLY = 1500;
const YEARLY = 13000;
const YEARLY_SAVING = MONTHLY * 12 - YEARLY; // 5 000 ₽

function ClubApplicationForm() {
  const [sent, setSent] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [doing, setDoing] = useState('');
  const [why, setWhy] = useState('');
  const [consent, setConsent] = useState(false);

  const valid = name.trim() && /.+@.+\..+/.test(email) && doing.trim() && why.trim() && consent;

  if (sent) {
    return (
      <SuccessCard title="Заявка отправлена.">
        Я читаю каждую заявку лично и отвечаю в течение трёх дней — «да» или «нет», без «мы вам
        перезвоним». Если ответ «да», внутри уже будет письмо о том, как всё устроено.
      </SuccessCard>
    );
  }

  return (
    <form
      className="card-lite p-7 sm:p-9"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) setSent(true);
      }}
    >
      <h3 className="serif text-[22px] text-ink">Заявка</h3>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
        Минимум вопросов: два обязательных и два поля для ответа.
      </p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field label="Как вас звать">
          <input
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Имя"
            autoComplete="name"
          />
        </Field>
        <Field label="Почта для ответа">
          <input
            className="input-field"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Чем занимаешься сейчас">
            <textarea
              className="input-field min-h-24"
              value={doing}
              onChange={(e) => setDoing(e.target.value)}
              placeholder="Одной-двумя фразами, без официального тона"
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Почему хочешь войти">
            <textarea
              className="input-field min-h-24"
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              placeholder="Чего не хватает — и что готов(а) давать взамен"
            />
          </Field>
        </div>
      </div>
      <div className="mt-6">
        <ConsentCheckbox checked={consent} onChange={setConsent} />
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-5">
        <button type="submit" className="btn btn-brand" disabled={!valid}>
          Отправить заявку
        </button>
        <p className="text-[13px] text-ink-soft">
          Кнопка станет активной, когда отметите согласие.
        </p>
      </div>
    </form>
  );
}

export function ClubJoinView() {
  const central = getCentralEvent();

  return (
    <div className="view-enter">
      <section className="container-site pt-14 sm:pt-20">
        <div className="grid gap-14 lg:grid-cols-12">
          {/* Левая колонка: hero, правила, что внутри */}
          <div className="lg:col-span-8">
            <p className="eyebrow">Клуб</p>
            <h1 className="serif mt-5 text-[clamp(2rem,4.4vw,3rem)] leading-[1.18] text-ink">
              Это не групповой чат.
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-[1.8] text-ink-soft">
              Закрытое пространство для PR-людей и коммуникаторов, которые идут (или уже прошли)
              путь к независимости. Не публично, не архивируется, не скриншотится.
            </p>

            <h2 className="serif mt-14 text-[22px] text-ink">Правила</h2>
            <ol className="mt-5 max-w-xl border-t border-line">
              {RULES.map((rule, i) => (
                <li key={i} className="flex items-baseline gap-5 border-b border-line py-4">
                  <span className="serif shrink-0 text-[14px] italic text-brand">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[15px] leading-relaxed text-ink">{rule}</span>
                </li>
              ))}
            </ol>

            <h2 className="serif mt-14 text-[22px] text-ink">Что внутри</h2>
            <p className="mt-2 text-[14px] text-ink-soft">
              Превью под замком — смотреть целиком можно только изнутри.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {TEASERS.map((t) => (
                <div key={t.title} className="card-lite p-6">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="serif text-[18px] leading-snug text-ink">{t.title}</h3>
                    <Lock className="mt-1 size-4 shrink-0 text-brand" aria-label="Закрыто" />
                  </div>
                  <p
                    className="mt-3 select-none text-[14px] text-ink-soft blur-[3px]"
                    aria-hidden="true"
                  >
                    Разбираем, что произошло за месяц: сделки, отказы, неожиданные повороты — и что
                    из этого стоит забрать себе…
                  </p>
                  <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">{t.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Правая колонка: цена и заявка */}
          <aside className="lg:col-span-4">
            <div className="card-lite p-7 lg:sticky lg:top-24" id="price">
              <p className="eyebrow">Участие</p>
              <div className="mt-5 space-y-5">
                <div>
                  <p className="serif text-[26px] text-ink">
                    {MONTHLY.toLocaleString('ru-RU')} ₽ <span className="text-[16px] text-ink-soft">в месяц</span>
                  </p>
                  <p className="mt-1 text-[14px] text-ink-soft">Отменить можно в любой момент.</p>
                </div>
                <div className="h-px bg-line" aria-hidden="true" />
                <div>
                  <p className="serif text-[26px] text-ink">
                    {YEARLY.toLocaleString('ru-RU')} ₽ <span className="text-[16px] text-ink-soft">в год</span>
                  </p>
                  <p className="mt-1 text-[14px] text-ink-soft">
                    Выходит ≈1 083 ₽ в месяц. Экономия {YEARLY_SAVING.toLocaleString('ru-RU')} ₽.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-brand mt-7 w-full"
                onClick={() => scrollToId('zayavka')}
              >
                Подать заявку
              </button>
              <p className="mt-4 text-[13px] leading-relaxed text-ink-soft">
                После заявки — два вопроса. Я читаю их лично и отвечаю в течение трёх дней.
                «Подписаться» тут нельзя: дверь открыта, но в неё входят по одному.
              </p>
            </div>
          </aside>
        </div>
      </section>

      {/* Форма заявки */}
      <section className="container-site mt-16 sm:mt-24" id="zayavka">
        <div className="max-w-3xl">
          <ClubApplicationForm />
        </div>
      </section>

      <div className="container-site pb-6">
        <PageHook>
          Если хочешь, чтобы рядом был один человек, а не группа для разговоров — смотри{' '}
          <SiteLink
            to="/mentoring"
            className="underline decoration-brand/50 underline-offset-2 hover:text-ink"
          >
            менторство
          </SiteLink>
          .
          {central && (
            <NearestEventLine
              title={central.title}
              dateLabel={formatEventDate(central.dateISO)}
              slug={central.slug}
            />
          )}
        </PageHook>
      </div>
    </div>
  );
}

/** Домашняя страница члена клуба: доступна только с активной сессией. */
export function ClubHomeView() {
  const [state, setState] = useState<'checking' | 'member' | 'guest'>('checking');

  useEffect(() => {
    // Точка интеграции Memberful / Outseta: здесь проверяется реальная сессия члена клуба.
    // В демо-сборке флаг выставляется вручную: localStorage.setItem('solo-pr-member-demo', '1')
    let cancelled = false;
    const t = setTimeout(() => {
      if (cancelled) return;
      const isMember = localStorage.getItem('solo-pr-member-demo') === '1';
      setState(isMember ? 'member' : 'guest');
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (state === 'guest') {
      // Не член клуба → редирект на страницу заявки
      const t = setTimeout(() => {
        window.location.hash = '/club/join';
      }, 600);
      return () => clearTimeout(t);
    }
  }, [state]);

  if (state !== 'member') {
    return (
      <div className="view-enter container-site py-24 text-center">
        <p className="serif text-2xl text-ink">Дверь пока закрыта</p>
        <p className="mx-auto mt-3 max-w-md text-[15px] text-ink-soft">
          Домашняя страница клуба открывается после подтверждения заявки. Перенаправляем на
          страницу заявки…
        </p>
        <SiteLink to="/club/join" className="btn btn-outline mt-8">
          Перейти к заявке
        </SiteLink>
      </div>
    );
  }

  const clubEvent = upcomingEvents().find((e) => e.clubOnly);

  return (
    <div className="view-enter">
      <section className="container-site pt-14 sm:pt-20">
        <p className="eyebrow">Клуб · вы внутри</p>
        <h1 className="serif mt-5 text-[clamp(2rem,4vw,2.8rem)] text-ink">Ты внутри.</h1>
        <p className="mt-4 max-w-xl text-[16px] leading-[1.8] text-ink-soft">
          Здесь тихо и без публичности. Ниже — то, что происходит в этом месяце, и то, что можно
          брать в любой момент.
        </p>
        <p className="mt-3 inline-block rounded-[4px] border border-line bg-white px-2.5 py-1 text-[12px] text-ink-soft">
          Демо-режим домашней страницы
        </p>
      </section>

      <section className="container-site mt-12 sm:mt-16">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="card-lite p-7">
            <p className="eyebrow">Круглый стол этого месяца</p>
            {clubEvent ? (
              <>
                <h2 className="serif mt-3 text-[21px] leading-snug text-ink">{clubEvent.title}</h2>
                <p className="mt-2 text-[15px] text-ink-soft">
                  {formatEventDate(clubEvent.dateISO)} по Москве · {clubEvent.format}
                </p>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{clubEvent.short}</p>
                <button type="button" className="btn btn-brand mt-6 !py-2 text-sm">
                  Зарегистрироваться
                </button>
              </>
            ) : (
              <p className="mt-3 text-[15px] text-ink-soft">
                Даты ближайшего круглого стола пока нет — следите за каналом объявлений.
              </p>
            )}
          </div>

          <div className="card-lite p-7">
            <p className="eyebrow">Записи прошлых встреч</p>
            <ul className="mt-4 space-y-4">
              {[
                ['Первый год без корпорации: деньги, клиенты, страхи', '1 ч 12 мин'],
                ['Как я называл(а) цены: три истории и одна ошибка', '48 мин'],
                ['Клиенты по знакомству: как выйти за пределы круга', '1 ч 03 мин'],
              ].map(([title, dur]) => (
                <li key={title} className="flex items-baseline justify-between gap-4 border-b border-line pb-3 last:border-0 last:pb-0">
                  <span className="text-[15px] text-ink">{title}</span>
                  <span className="shrink-0 text-[13px] text-ink-soft">{dur}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card-lite p-7">
            <p className="eyebrow">Канал глупых вопросов</p>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
              Задать можно любой: «как назвать цену», «что ответить», «я один так чувствую?».
              Без страха, что скриншот утечёт — это правило №3.
            </p>
            <button type="button" className="btn btn-outline mt-6 !py-2 text-sm">
              Открыть канал
            </button>
          </div>

          <div className="card-lite p-7">
            <p className="eyebrow">Карта участников</p>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
              Не адресная книга, а карта «кто делает похожие вещи»: кому можно написать, чтобы
              просто поговорить о работе.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {['корпоративные медиа', 'внутренние коммуникации', 'продуктовый PR', 'персональные стратегии', 'B2B-технологии'].map(
                (tag) => (
                  <span
                    key={tag}
                    className="rounded-[4px] border border-line bg-sage-soft px-2.5 py-1 text-[13px] text-ink-soft"
                  >
                    {tag}
                  </span>
                )
              )}
            </div>
          </div>
        </div>

        <PageHook>
          Если хочешь, чтобы рядом был один человек, а не группа для разговоров — смотри{' '}
          <SiteLink
            to="/mentoring"
            className="underline decoration-brand/50 underline-offset-2 hover:text-ink"
          >
            менторство
          </SiteLink>
          .
        </PageHook>
      </section>
    </div>
  );
}
