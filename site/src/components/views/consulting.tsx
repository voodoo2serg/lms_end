'use client';

import { useState } from 'react';
import { SiteLink } from '@/lib/router';
import { PageHook, ConsentCheckbox, Field, SuccessCard } from '@/components/site/forms';

const STEPS = [
  {
    num: 'Шаг 1',
    title: 'Аудит коммуникаций',
    phrase:
      'За 1–2 недели увидеть, что ваши коммуникации реально делают, а чего не делают.',
    details: [
      ['Результат', 'Документ не длиннее 5 страниц. Не «рекомендуем усилить», а: какой канал сжигает бюджет, какая информация не доходит до нужных людей.'],
      ['Срок', '1–2 недели, с минимальным участием вашей команды.'],
    ],
  },
  {
    num: 'Шаг 2',
    title: 'Стратегический воркшоп',
    phrase: 'Полдня с вашей командой коммуникаций, чтобы превратить результаты аудита в следующий шаг.',
    details: [
      ['Формат', 'Офлайн или онлайн, не более 8 человек.'],
      ['Материал', 'Только реальные материалы компании — никаких абстрактных кейсов.'],
    ],
  },
  {
    num: 'Шаг 3',
    title: 'Внутреннее обучение',
    phrase:
      'Не «курс по PR-техникам». Научить команду относиться к себе как к объекту, который нужно понимать.',
    details: [
      ['Формат', '2–4 сессии по 90 минут, онлайн или офлайн.'],
      ['Состав', 'Может собираться на базе модулей курса; на сайте курс напрямую не продаётся — только как часть B2B-контракта.'],
    ],
  },
];

function ConsultingForm() {
  const [sent, setSent] = useState(false);
  const [company, setCompany] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [situation, setSituation] = useState('');
  const [consent, setConsent] = useState(false);

  const valid = company.trim() && name.trim() && /.+@.+\..+/.test(email) && situation.trim() && consent;

  if (sent) {
    return (
      <SuccessCard title="Рассказ получен.">
        Я прочитаю его лично и отвечу в течение двух рабочих дней: что вижу в ситуации, что можно
        сделать и имеет ли смысл встречаться. Без презентаций и коммерческих предложений по
        шаблону.
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
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Компания">
          <input
            className="input-field"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Название"
            autoComplete="organization"
          />
        </Field>
        <Field label="Как вас зовут">
          <input
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Имя и фамилия"
            autoComplete="name"
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Рабочая почта">
            <input
              className="input-field"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.ru"
              autoComplete="email"
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field
            label="Расскажите о вашей ситуации"
            hint="Что сейчас не работает в коммуникациях — своими словами, без брифа."
          >
            <textarea
              className="input-field min-h-32"
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              placeholder="Например: пресс-служба выпускает новости, но продаж это не касается; или отдел уволился, и некому…"
            />
          </Field>
        </div>
      </div>
      <div className="mt-6">
        <ConsentCheckbox checked={consent} onChange={setConsent} />
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-5">
        <button type="submit" className="btn btn-brand" disabled={!valid}>
          Отправить
        </button>
        <p className="text-[13px] text-ink-soft">
          Стоимость не публикую — она зависит от объёма. Обсудим после знакомства с ситуацией.
        </p>
      </div>
    </form>
  );
}

export default function ConsultingView() {
  return (
    <div className="view-enter">
      <section className="container-site pt-14 sm:pt-20">
        <p className="eyebrow">Консалтинг для компаний</p>
        <h1 className="serif mt-5 max-w-3xl text-[clamp(2rem,4.4vw,3rem)] leading-[1.18] text-ink">
          Ваш PR-отдел делает PR для себя?
        </h1>
        <p className="mt-6 max-w-2xl text-[17px] leading-[1.8] text-ink-soft">
          Внешний аудит коммуникаций, стратегические воркшопы, внутреннее обучение. Для компаний,
          которые хотят превратить коммуникации из «сдать отчёт» в «работает».
        </p>
      </section>

      <section className="container-site mt-16 sm:mt-24">
        <div className="border-t border-line">
          {STEPS.map((s) => (
            <div key={s.num} className="grid grid-cols-12 gap-x-4 gap-y-4 border-b border-line py-9">
              <span className="eyebrow-muted col-span-12 sm:col-span-1">{s.num}</span>
              <h2 className="serif col-span-12 text-[23px] text-ink sm:col-span-4">
                {s.title}
              </h2>
              <div className="col-span-12 sm:col-span-7">
                <p className="max-w-xl text-[16px] leading-[1.8] text-ink">{s.phrase}</p>
                <dl className="mt-4 space-y-2.5">
                  {s.details.map(([k, v]) => (
                    <div key={k} className="grid gap-x-4 gap-y-0.5 sm:grid-cols-12">
                      <dt className="text-[13px] uppercase tracking-[0.12em] text-ink-soft sm:col-span-2 sm:pt-0.5">
                        {k}
                      </dt>
                      <dd className="text-[15px] leading-relaxed text-ink-soft sm:col-span-10">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container-site mt-16 sm:mt-20">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 className="serif text-[clamp(1.6rem,3vw,2.1rem)] text-ink">
              Расскажите о вашей ситуации
            </h2>
            <p className="mt-4 max-w-md text-[16px] leading-[1.8] text-ink-soft">
              Достаточно пяти строк обычным языком. Я прочитаю сам и отвечу честно: есть ли смысл
              встречаться. Иногда честный ответ — «вам пока не нужен консультант».
            </p>
          </div>
          <div className="lg:col-span-7">
            <div className="max-w-xl">
              <ConsultingForm />
            </div>
          </div>
        </div>
      </section>

      <div className="container-site pb-6">
        <PageHook>
          Если хочешь сначала разобраться сам —{' '}
          <SiteLink
            to="/courses/diagnostika"
            className="underline decoration-brand/50 underline-offset-2 hover:text-ink"
          >
            начни с диагностики
          </SiteLink>
          : десять минут про личную позицию, а не про компанию.
        </PageHook>
      </div>
    </div>
  );
}
