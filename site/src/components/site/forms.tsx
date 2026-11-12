'use client';

import { Check } from 'lucide-react';
import { SiteLink } from '@/lib/router';

/** Строка поля формы. */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[13px] text-ink-soft">{hint}</span>}
    </label>
  );
}

/** Обязательный чекбокс согласия на обработку персональных данных (152-ФЗ). */
export function ConsentCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        type="checkbox"
        required
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-4 shrink-0 cursor-pointer accent-[#b9705f]"
      />
      <span className="text-sm leading-snug text-ink-soft">
        Я согласен на обработку персональных данных в соответствии с{' '}
        <SiteLink
          to="/consent"
          className="underline decoration-brand/50 underline-offset-2 hover:text-ink"
        >
          условиями согласия
        </SiteLink>{' '}
        и{' '}
        <SiteLink
          to="/privacy"
          className="underline decoration-brand/50 underline-offset-2 hover:text-ink"
        >
          политикой конфиденциальности
        </SiteLink>
        .
      </span>
    </label>
  );
}

/** Отдельное согласие на информационные и рекламные сообщения (ст. 18 ФЗ «О рекламе»). */
export function AdsConsentCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-4 shrink-0 cursor-pointer accent-[#b9705f]"
      />
      <span className="text-sm leading-snug text-ink-soft">
        Отдельно согласен получать информационные и рекламные сообщения. Необязательно: без этой
        отметки письма приходят только по предмету обращения.
      </span>
    </label>
  );
}

/** Экран успешной отправки формы. */
export function SuccessCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[6px] border border-line bg-white p-8" role="status">
      <span className="flex size-10 items-center justify-center rounded-full bg-sage-soft text-sage">
        <Check className="size-5" />
      </span>
      <h3 className="serif mt-4 text-2xl text-ink">{title}</h3>
      <div className="mt-2 max-w-md text-[15px] leading-relaxed text-ink-soft">{children}</div>
    </div>
  );
}

/** Сквозной «крючок» внизу страницы — тихая строка со ссылками, не баннер. */
export function PageHook({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-20 border-t border-line pt-6 text-[15px] leading-relaxed text-ink-soft">
      {children}
    </div>
  );
}

/** Строка «Ближайшее открытое мероприятие — …» для страниц курсов и клуба. */
export function NearestEventLine({
  title,
  dateLabel,
  slug,
}: {
  title: string;
  dateLabel: string;
  slug: string;
}) {
  return (
    <p className="mt-3 text-sm text-ink-soft">
      Ближайшее открытое мероприятие — «{title}», {dateLabel}.{' '}
      <SiteLink
        to={`/events/${slug}`}
        className="underline decoration-brand/50 underline-offset-2 hover:text-ink"
      >
        Записаться
      </SiteLink>
      .
    </p>
  );
}
