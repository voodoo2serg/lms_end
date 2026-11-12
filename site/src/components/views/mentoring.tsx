'use client';

import Image from 'next/image';
import { useState } from 'react';
import { SiteLink } from '@/lib/router';
import { PageHook, ConsentCheckbox, Field, SuccessCard } from '@/components/site/forms';

const BLOCKS = [
  {
    num: '01',
    title: 'Кому подходит',
    text: 'Тем, кто уже решил идти или уже идёт, но чувствует изоляцию: решения есть, а поговорить «вслух» не с кем. Тем, кому нужен не курс, а человек, который будет рядом часть пути.',
    note: 'Не беру тех, кто «ещё сомневается, уходить ли» — это к курсам и диагностике.',
  },
  {
    num: '02',
    title: 'Как это устроено',
    text: 'Один-два раза в месяц. Офлайн — в вашем городе или вы приезжаете ко мне. По два часа, место — не офис: угол кафе, скамейка в парке или тихий бар.',
    note: 'Вертикальный формат в отличие от клуба: клуб — горизонтальный, менторство — один на один, офлайн.',
  },
  {
    num: '03',
    title: 'Чего я не делаю',
    text: 'Не даю стандартных решений, не выдаю шаблонов, не пишу за вас. Делаю одно: чтобы между встречами у вас был более ясный следующий шаг.',
    note: 'Если нужен исполнитель — это не ко мне. Если нужен трезвый взгляд со стороны — добро пожаловать.',
  },
];

function MentoringForm() {
  const [sent, setSent] = useState(false);
  const [story, setStory] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);

  const valid = story.trim() && name.trim() && /.+@.+\..+/.test(email) && consent;

  if (sent) {
    return (
      <SuccessCard title="Письмо отправлено.">
        Я читаю сам и отвечаю лично — обычно в течение пары дней. В письме будет честный ответ:
        смогу ли взяться, и если да — как выглядит первый шаг.
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
      <div className="space-y-5">
        <Field label="Расскажи, где ты сейчас и куда хочешь">
          <textarea
            className="input-field min-h-32"
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder="Пара абзацев обычным языком. Это не анкета — просто расскажи."
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Как тебя звать">
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
        </div>
      </div>
      <div className="mt-6">
        <ConsentCheckbox checked={consent} onChange={setConsent} />
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-5">
        <button type="submit" className="btn btn-brand" disabled={!valid}>
          Напиши мне
        </button>
        <p className="text-[13px] text-ink-soft">Я отвечу, смогу ли взяться. Без воронок и автоответчиков.</p>
      </div>
    </form>
  );
}

export default function MentoringView() {
  return (
    <div className="view-enter">
      <section className="container-site pt-14 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="eyebrow">Менторство</p>
            <h1 className="serif mt-5 text-[clamp(2rem,4.4vw,3rem)] leading-[1.18] text-ink">
              Некоторые вещи можно сказать только глядя в глаза.
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-[1.8] text-ink-soft">
              Офлайн-менторство. Не курс, не консалтинг. Раз в месяц встречаемся и разбираем то,
              на чём ты реально застрял на пути к независимости.
            </p>
          </div>
          <div className="lg:col-span-5">
            <figure className="relative aspect-[4/5] overflow-hidden rounded-[6px] border border-line">
              <Image
                src="/images/mentoring-bench.jpg"
                alt="Скамейка в парке, осенний свет — место для разговора"
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
              />
            </figure>
            <figcaption className="mt-2.5 text-[13px] italic text-ink-soft">
              Угол кафе, скамейка в парке или тихий бар — офис не считается.
            </figcaption>
          </div>
        </div>
      </section>

      <section className="container-site mt-16 sm:mt-24">
        <div className="border-t border-line">
          {BLOCKS.map((b) => (
            <div key={b.num} className="grid grid-cols-12 gap-x-4 gap-y-3 border-b border-line py-8">
              <span className="serif col-span-2 text-[15px] italic text-brand sm:col-span-1">
                {b.num}
              </span>
              <h2 className="serif col-span-10 text-[22px] text-ink sm:col-span-4">{b.title}</h2>
              <div className="col-span-10 col-start-3 sm:col-span-6 sm:col-start-6">
                <p className="text-[15px] leading-[1.8] text-ink-soft">{b.text}</p>
                <p className="mt-2 text-[14px] italic leading-relaxed text-ink-soft/90">{b.note}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container-site mt-16 sm:mt-20" id="napishi">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 className="serif text-[clamp(1.6rem,3vw,2.1rem)] text-ink">Напиши мне</h2>
            <p className="mt-4 max-w-md text-[16px] leading-[1.8] text-ink-soft">
              Расскажи, где ты сейчас и куда хочешь. Я отвечу, смогу ли взяться. Если нет — скажу
              прямо и, если смогу, подскажу, к кому идти.
            </p>
          </div>
          <div className="lg:col-span-7">
            <div className="max-w-xl">
              <MentoringForm />
            </div>
          </div>
        </div>
      </section>

      <div className="container-site pb-6">
        <PageHook>
          Если ты представляешь компанию, а не себя — иди в{' '}
          <SiteLink
            to="/consulting"
            className="underline decoration-brand/50 underline-offset-2 hover:text-ink"
          >
            консалтинг
          </SiteLink>
          : там про аудит, воркшопы и обучение команд.
        </PageHook>
      </div>
    </div>
  );
}
