'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import { SiteLink } from '@/lib/router';
import { TRACKS, type CourseModule, type Track } from '@/lib/courses';
import { PageHook, NearestEventLine } from '@/components/site/forms';
import { getCentralEvent, formatEventDate } from '@/lib/events';

function ModuleRow({ track, module }: { track: Track; module: CourseModule }) {
  return (
    <div className="grid grid-cols-12 items-center gap-x-4 gap-y-3 border-b border-line py-7 sm:px-2">
      <div className="col-span-12 sm:col-span-6">
        <p className="serif text-[13px] italic text-brand">{module.index}</p>
        <h4 className="serif mt-1 text-[20px] leading-snug text-ink sm:text-[22px]">
          {module.title}
        </h4>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{module.oneLine}</p>
      </div>
      <div className="col-span-8 sm:col-span-4">
        <p className="text-[14px] text-ink-soft">
          <span className="text-ink">{module.duration}</span> · {module.format.split('+')[0].trim()}
        </p>
      </div>
      <div className="col-span-12 sm:col-span-2 sm:justify-self-end">
        <SiteLink to={`/courses/${module.slug}`} className="btn btn-outline !px-4 !py-2 text-sm">
          Посмотреть этот раздел
        </SiteLink>
      </div>
      <span className="sr-only">Модуль трека {track.label}</span>
    </div>
  );
}

function TrackSection({ track }: { track: Track }) {
  return (
    <section className="mt-16" aria-label={`Трек: ${track.title}`}>
      <div className="flex flex-wrap items-baseline gap-x-3">
        <p className="eyebrow">{track.label}</p>
        <p className="text-[13px] text-ink-soft">· {track.audience}</p>
      </div>
      <h3 className="serif mt-3 max-w-2xl text-[clamp(1.5rem,2.8vw,2rem)] leading-snug text-ink">
        {track.title}
      </h3>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">{track.intro}</p>
      <div className="mt-8 border-t border-line">
        {track.modules.map((m) => (
          <ModuleRow key={m.slug} track={track} module={m} />
        ))}
      </div>
    </section>
  );
}

export function CoursesView() {
  const central = getCentralEvent();

  return (
    <div className="view-enter">
      <section className="container-site pt-14 sm:pt-20">
        <p className="eyebrow">Курсы</p>
        <h1 className="serif mt-5 max-w-3xl text-[clamp(2rem,4.4vw,3rem)] leading-[1.18] text-ink">
          Твоя ситуация определяет, чему учиться
        </h1>
        <p className="mt-6 max-w-xl text-[17px] leading-[1.8] text-ink-soft">
          Без единого расписания для всех. Сначала быстрая диагностика, потом — маршрут.
        </p>
        <div className="mt-9">
          <SiteLink to="/courses/diagnostika" className="btn btn-brand">
            Диагностика ситуации за 10 минут
            <ArrowRight className="size-4" />
          </SiteLink>
        </div>
      </section>

      <section className="container-site mt-16 sm:mt-20">
        <div className="max-w-2xl space-y-4 text-[16px] leading-[1.8] text-ink-soft">
          <p>
            Два трека, в каждом — три модуля. Трек A — для PR-специалистов, которые переходят от
            «говорить за других» к «говорить за себя». Трек B — для молодых предпринимателей,
            которым нужен PR уровня агентства, но без агентства.
          </p>
          <p className="text-ink">
            Модули проходят в составе трека: состав собирается после диагностики — чтобы вы не
            учились тому, что уже умеете.
          </p>
        </div>
      </section>

      <section className="container-site pb-6">
        {TRACKS.map((track) => (
          <TrackSection key={track.id} track={track} />
        ))}

        <PageHook>
          Прошёл диагностику, но всё равно не уверен? В{' '}
          <SiteLink to="/club" className="underline decoration-brand/50 underline-offset-2 hover:text-ink">
            клубе
          </SiteLink>{' '}
          есть люди, прошедшие тот же путь.
          {central && (
            <NearestEventLine
              title={central.title}
              dateLabel={formatEventDate(central.dateISO)}
              slug={central.slug}
            />
          )}
        </PageHook>
      </section>
    </div>
  );
}

export function CourseModuleView({ slug }: { slug: string }) {
  const found = TRACKS.flatMap((t) => t.modules.map((m) => ({ track: t, module: m }))).find(
    (x) => x.module.slug === slug
  );

  if (!found) {
    return (
      <div className="container-site py-24 text-center">
        <h1 className="serif text-3xl text-ink">Раздел не найден</h1>
        <p className="mt-4 text-ink-soft">
          Возможно, адрес устарел.{' '}
          <SiteLink to="/courses" className="underline decoration-brand/50 underline-offset-2 hover:text-ink">
            Посмотреть все курсы
          </SiteLink>
          .
        </p>
      </div>
    );
  }

  const { track, module } = found;
  const central = getCentralEvent();

  return (
    <div className="view-enter">
      <section className="container-site pt-10 sm:pt-14">
        <SiteLink
          to="/courses"
          className="inline-flex items-center gap-2 text-[14px] text-ink-soft transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" />
          Все модули · {track.label}
        </SiteLink>

        <div className="mt-8 grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <p className="eyebrow">
              Модуль {module.index} · {track.label} · {track.audience}
            </p>
            <h1 className="serif mt-4 text-[clamp(1.8rem,3.8vw,2.6rem)] leading-[1.2] text-ink">
              {module.title}
            </h1>
            <p className="mt-5 max-w-2xl text-[17px] leading-[1.8] text-ink-soft">
              {module.oneLine}
            </p>

            <div className="mt-7 flex flex-wrap gap-2">
              <span className="rounded-[4px] border border-line bg-white px-3 py-1 text-[13px] text-ink-soft">
                {module.duration}
              </span>
              <span className="rounded-[4px] border border-line bg-white px-3 py-1 text-[13px] text-ink-soft">
                {module.format}
              </span>
            </div>

            <div className="mt-10 max-w-2xl space-y-5 text-[16px] leading-[1.8] text-ink-soft">
              {module.about.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            <h2 className="serif mt-14 text-[22px] text-ink">Программа модуля</h2>
            <ol className="mt-5 border-t border-line">
              {module.program.map((lesson, i) => (
                <li key={i} className="flex items-baseline gap-5 border-b border-line py-4">
                  <span className="serif shrink-0 text-[14px] italic text-brand">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[15px] leading-relaxed text-ink">
                    {lesson.title}
                    {lesson.note && (
                      <span className="ml-2 text-[13px] text-ink-soft">· {lesson.note}</span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <aside className="lg:col-span-4">
            <div className="card-lite p-7 lg:sticky lg:top-24">
              <h3 className="serif text-[19px] text-ink">Кому подходит</h3>
              <ul className="mt-4 space-y-3 text-[15px] leading-relaxed text-ink-soft">
                {module.forWhom.map((w, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                    {w}
                  </li>
                ))}
              </ul>
              <div className="my-6 h-px bg-line" aria-hidden="true" />
              <h3 className="serif text-[19px] text-ink">Что останется после</h3>
              <ul className="mt-4 space-y-3 text-[15px] leading-relaxed text-ink-soft">
                {module.outcome.map((w, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-sage" aria-hidden="true" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        <div className="mt-14 rounded-[6px] border border-brand/25 bg-brand-soft/60 p-7 sm:p-9">
          <h2 className="serif text-[22px] text-ink">Как попасть в модуль</h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
            Модули проходят в составе трека — состав собирается после диагностики, чтобы не учить
            вас тому, что вы уже умеете. Если сомневаетесь — начните с диагностики: десять минут,
            без правильных ответов.
          </p>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
            <SiteLink to="/courses/diagnostika" className="btn btn-brand">
              Пройти диагностику
            </SiteLink>
            <SiteLink to="/club" className="btn-quiet">
              Спросить в клубе
            </SiteLink>
          </div>
        </div>

        <PageHook>
          {central && (
            <NearestEventLine
              title={central.title}
              dateLabel={formatEventDate(central.dateISO)}
              slug={central.slug}
            />
          )}
        </PageHook>
      </section>
    </div>
  );
}
