'use client';

import { useEffect, useState } from 'react';
import { SiteLink } from '@/lib/router';
import { Switch } from '@/components/ui/switch';

const STORAGE_KEY = 'solo-pr-cookie-consent';

type Consent = {
  decided: boolean;
  analytics: boolean;
  marketing: boolean;
};

function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Consent;
    if (typeof parsed.decided !== 'boolean') return null;
    return parsed;
  } catch {
    return null;
  }
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      if (cancelled) return;
      const saved = readConsent();
      if (!saved || !saved.decided) {
        setVisible(true);
      } else {
        setAnalytics(saved.analytics);
        setMarketing(saved.marketing);
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  useEffect(() => { const open = () => { setVisible(true); setSettingsOpen(true); }; window.addEventListener('solo-cookie-settings', open); return () => window.removeEventListener('solo-cookie-settings', open); }, []);

  function save(consent: Consent) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    } catch {
      /* приватный режим — просто не сохраняем */
    }
    setVisible(false);
    setSettingsOpen(false);
  }

  if (!visible) return null;

  return (
    <>
      <div
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-paper shadow-[0_-10px_40px_-20px_rgba(44,44,44,0.25)]"
        role="dialog"
        aria-label="Настройки cookie"
      >
        <div className="container-site flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
          <p className="max-w-xl text-sm leading-relaxed text-ink-soft">
            Необходимые cookie поддерживают вход и настройки сайта. Аналитика и маркетинговые сервисы сейчас не подключены. Вы можете выбрать категории на будущее.{' '}
            <SiteLink
              to="/cookies"
              className="whitespace-nowrap underline decoration-brand/40 underline-offset-4 hover:text-ink"
            >
              Политика cookie
            </SiteLink>
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <button type="button" className="btn btn-brand !py-2 text-sm" onClick={() => save({ decided: true, analytics: true, marketing: true })}>
              Принять все
            </button>
            <button
              type="button"
              className="btn btn-outline !py-2 text-sm"
              onClick={() => save({ decided: true, analytics: false, marketing: false })}
            >
              Только необходимые
            </button>
            <button
              type="button"
              className="btn-quiet !text-sm"
              onClick={() => {
                setSettingsOpen(true);
              }}
            >
              Настроить
            </button>
          </div>
        </div>
      </div>

      {settingsOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/30 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Настройка категорий cookie"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-[6px] border border-line bg-paper p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="serif text-xl text-ink">Категории cookie</h3>
            <p className="mt-2 text-sm text-ink-soft">
              Необходимые cookie включены всегда — без них сайт не работает. Остальные категории вы
              включаете по желанию.
            </p>

            <div className="mt-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[15px] font-medium text-ink">Необходимые</p>
                  <p className="text-sm text-ink-soft">Безопасность и работа интерфейса.</p>
                </div>
                <Switch checked disabled aria-label="Необходимые cookie всегда включены" />
              </div>
              <div className="h-px bg-line" aria-hidden="true" />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[15px] font-medium text-ink">Аналитические</p>
                  <p className="text-sm text-ink-soft">
                    Обезличенная статистика посещений — чтобы понимать, что улучшать.
                  </p>
                </div>
                <Switch
                  checked={analytics}
                  onCheckedChange={setAnalytics}
                  aria-label="Аналитические cookie"
                />
              </div>
              <div className="h-px bg-line" aria-hidden="true" />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[15px] font-medium text-ink">Маркетинговые</p>
                  <p className="text-sm text-ink-soft">
                    Оценка эффективности рассылок и публикаций.
                  </p>
                </div>
                <Switch
                  checked={marketing}
                  onCheckedChange={setMarketing}
                  aria-label="Маркетинговые cookie"
                />
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="btn btn-brand !py-2 text-sm"
                onClick={() => save({ decided: true, analytics, marketing })}
              >
                Сохранить настройки
              </button>
              <button type="button" className="btn-quiet !text-sm" onClick={() => setSettingsOpen(false)}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
