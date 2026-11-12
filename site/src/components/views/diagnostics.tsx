'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { SiteLink } from '@/lib/router';
import { QUESTIONS, buildResult, type DiagnosticResult } from '@/lib/diagnostics';
import { SuccessCard } from '@/components/site/forms';

export default function DiagnosticsView() {
  const [phase, setPhase] = useState<'intro' | 'questions' | 'result'>('intro');
  const [step, setStep] = useState(0); // 0..2
  const [answers, setAnswers] = useState<number[]>([null, null, null] as unknown as number[]);
  const [result, setResult] = useState<DiagnosticResult | null>(null);

  const answered = answers.filter((a) => a !== null && a !== undefined).length;

  function pick(optionIndex: number) {
    const next = [...answers];
    next[step] = optionIndex;
    setAnswers(next);
  }

  function nextStep() {
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
      return;
    }
    // Всё отвечено — показываем результат
    const [stage, stuck, desire] = answers;
    setResult(buildResult(stage!, stuck!, desire!));
    setPhase('result');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function restart() {
    setAnswers([null, null, null] as unknown as number[]);
    setStep(0);
    setResult(null);
    setPhase('intro');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (phase === 'intro') {
    return (
      <div className="view-enter container-site py-16 sm:py-24">
        <div className="mx-auto max-w-xl">
          <p className="eyebrow">Экспресс-диагностика</p>
          <h1 className="serif mt-4 text-[clamp(1.9rem,4vw,2.6rem)] leading-[1.2] text-ink">
            С чего начать свой маршрут
          </h1>
          <p className="mt-5 text-[16px] leading-[1.8] text-ink-soft">
            Три вопроса — о том, где вы сейчас, что хочется укрепить и чего хотите. Без правильных
            ответов, без регистрации и без баллов. В конце — краткая подсказка и
            рекомендованный маршрут: что смотреть в первую очередь.
          </p>
          <div className="mt-9">
            <button type="button" className="btn btn-brand" onClick={() => setPhase('questions')}>
              Начать
              <ArrowRight className="size-4" />
            </button>
          </div>
          <p className="mt-6 text-[13px] text-ink-soft">
            Ответы остаются в браузере. Это способ выбрать материал, а не оценка профессионализма.
          </p>
        </div>
      </div>
    );
  }

  if (phase === 'questions') {
    const q = QUESTIONS[step];
    const selected = answers[step];

    return (
      <div className="view-enter container-site py-14 sm:py-20">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between">
            <p className="eyebrow">
              Шаг {step + 1} / {QUESTIONS.length}
            </p>
            <button
              type="button"
              className="text-[13px] text-ink-soft transition-colors hover:text-ink"
              onClick={() => (step > 0 ? setStep(step - 1) : setPhase('intro'))}
            >
              Назад
            </button>
          </div>
          <div className="mt-3 h-px w-full bg-line" role="presentation">
            <div
              className="h-px bg-brand transition-all duration-300"
              style={{ width: `${((answered / QUESTIONS.length) * 100).toFixed(0)}%` }}
            />
          </div>

          <h1 className="serif mt-10 text-[clamp(1.8rem,3.8vw,2.4rem)] text-ink">{q.question}</h1>

          <div className="mt-8 space-y-3" role="radiogroup" aria-label={q.question}>
            {q.options.map((opt, i) => {
              const isSel = selected === i;
              return (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={isSel}
                  onClick={() => pick(i)}
                  className={`flex w-full items-center justify-between gap-4 rounded-[6px] border p-5 text-left text-[16px] leading-relaxed transition-colors duration-200 ${
                    isSel
                      ? 'border-brand bg-brand-soft/70 text-ink'
                      : 'border-line bg-white text-ink-soft hover:border-brand/50 hover:text-ink'
                  }`}
                >
                  <span>{opt.text}</span>
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 size-4 shrink-0 rounded-full border transition-colors ${
                      isSel ? 'border-brand bg-brand' : 'border-line bg-white'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          <div className="mt-10 flex justify-end">
            <button
              type="button"
              className="btn btn-brand"
              disabled={selected === null || selected === undefined}
              onClick={nextStep}
            >
              {step < QUESTIONS.length - 1 ? 'Далее' : 'Показать результат'}
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Результат: без баллов — ярлык ситуации, интерпретация, маршрут
  return (
    <div className="view-enter container-site py-14 sm:py-20">
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow">Твоя ситуация</p>
        <h1 className="serif mt-4 text-[clamp(1.9rem,4vw,2.7rem)] leading-[1.2] text-ink">
          {result?.label}
        </h1>

        <div className="mt-7 space-y-5 text-[16px] leading-[1.8] text-ink-soft">
          {result?.interpretation.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <h2 className="serif mt-12 text-[22px] text-ink">Рекомендованный маршрут</h2>
        <ol className="mt-5 border-t border-line">
          {result?.route.map((r, i) => (
            <li key={i} className="flex items-baseline gap-5 border-b border-line py-5">
              <span className="serif shrink-0 text-[14px] italic text-brand">
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="text-[15px] leading-relaxed text-ink">
                {r.text}{' '}
                {r.linkTo && (
                  <SiteLink
                    to={r.linkTo}
                    className="ml-1 whitespace-nowrap underline decoration-brand/50 underline-offset-2 hover:text-ink"
                  >
                    {r.linkText} →
                  </SiteLink>
                )}
              </p>
            </li>
          ))}
        </ol>

        {result?.trackNote && (
          <p className="mt-5 text-[15px] leading-relaxed text-ink-soft">{result.trackNote}</p>
        )}

        <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3">
          <SiteLink to="/courses" className="btn btn-brand">
            Посмотреть курсы
          </SiteLink>
          <SiteLink to="/club" className="btn btn-outline">
            Подать заявку в клуб
          </SiteLink>
          <button type="button" className="btn-quiet" onClick={restart}>
            Пройти ещё раз
          </button>
        </div>

        <div className="mt-14">
          <SuccessCard title="Диагностика завершена">
            Результат никуда не отправлялся и ни с кем не делился: он только ваш. Если захотите
            обсудить его лично — напишите мне.
          </SuccessCard>
        </div>

        <p className="mt-10 text-[13px] text-ink-soft">
          <SiteLink
            to="/courses"
            className="inline-flex items-center gap-1.5 underline decoration-brand/50 underline-offset-2 hover:text-ink"
          >
            <ArrowLeft className="size-4" />
            Ко всем курсам
          </SiteLink>
        </p>
      </div>
    </div>
  );
}
