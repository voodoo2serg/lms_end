'use client';

import { useEffect, useState, type ReactNode, type MouseEventHandler } from 'react';

/**
 * Лёгкий роутер на хэше: сервер отдаёт только «/», вся навигация живёт в адресной строке
 * вида #/courses, #/club/join и т.д. При выносе в продакшн каждая view превращается
 * в отдельную страницу App Router без изменения содержимого.
 */

export function normalizeHash(): string {
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw) return '/';
  return raw.startsWith('/') ? raw : `/${raw}`;
}

/** Возвращает текущий путь хэша; null — пока страница не смонтирована на клиенте. */
export function useHashRoute(): string | null {
  const [route, setRoute] = useState<string | null>(null);

  useEffect(() => {
    const read = () => setRoute(normalizeHash());
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

  return route;
}

export function navigate(to: string) {
  const target = to.startsWith('/') ? to : `/${to}`;
  if (normalizeHash() === target) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  window.location.hash = target;
}

/** Плавный скролл к блоку на текущей странице (внутренние якоря конфликтуют с хэш-роутом). */
export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function SiteLink({
  to,
  children,
  className,
  ariaLabel,
  onClick,
}: {
  to: string;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}) {
  return (
    <a href={`#${to}`} aria-label={ariaLabel} className={className} onClick={onClick}>
      {children}
    </a>
  );
}
