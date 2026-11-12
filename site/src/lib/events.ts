/**
 * Мероприятия «Соло-PR». Даты — в московском времени (Europe/Moscow).
 * Центральное событие на главной: помечено featured; если оно прошло,
 * берётся ближайшее предстоящее; если предстоящих нет — состояние «скоро анонсируем».
 */

export type EventItem = {
  slug: string;
  title: string;
  dateISO: string;
  format: 'онлайн' | 'офлайн';
  city?: string;
  priceLabel: string;
  free: boolean;
  clubOnly?: boolean;
  short: string;
  description: string[];
  program?: { time: string; title: string; note?: string }[];
  speakers?: { name: string; role: string }[];
  featured?: boolean;
};

export const EVENTS: EventItem[] = [
  {
    slug: 'kak-nazvat-svoyu-tsenu',
    title: 'Открытый разбор: как PR-специалисту назвать свою цену',
    dateISO: '2026-12-12T19:00:00+03:00',
    format: 'онлайн',
    priceLabel: 'Бесплатно',
    free: true,
    featured: true,
    short:
      'Разбираем на живых примерах, из чего складывается цена часа PR-специалиста — и почему называть её страшно даже опытным людям.',
    description: [
      'Это открытая встреча для тех, кто умеет делать PR для других, но каждый раз зависает, когда речь заходит о собственных деньгах. Мы разберём, почему «ставка как в штате» — ловушка, как от часа перейти к проекту и ценности, и что сказать, когда клиент спрашивает «почему так дорого».',
      'Формат — живой разбор: вы присылаете свою ситуацию при регистрации, три из них мы разбираем прямо на встрече. Запись останется у зарегистрировавшихся.',
    ],
    program: [
      { time: '19:00', title: 'Контекст: почему PR-людям трудно называть цену' },
      { time: '19:10', title: 'Три ошибки в ценообразовании независимого консультанта' },
      { time: '19:35', title: 'Разбор трёх ситуаций участников', note: 'по заявкам при регистрации' },
      { time: '20:05', title: 'Ответы на вопросы' },
      { time: '20:20', title: 'Что дальше: маршруты на курсах и в клубе' },
    ],
  },
  {
    slug: 'pervyi-god-bez-korporacii',
    title: 'Круглый стол клуба: первый год без корпорации',
    dateISO: '2026-12-18T19:30:00+03:00',
    format: 'онлайн',
    priceLabel: 'Для членов клуба',
    free: false,
    clubOnly: true,
    short:
      'PR-человек, ставший независимым год назад, честно рассказывает, что происходило на самом деле: деньги, клиенты, страхи, ошибки.',
    description: [
      'Ежемесячный круглый стол клуба. Никаких «историй успеха» — только то, как это было на самом деле: сколько удалось заработать в первые месяцы, откуда пришли первые клиенты, что пришлось пересобрать в голове.',
      'Встреча не публична, не архивируется в открытом доступе и не скриншотится — это одно из правил клуба.',
    ],
  },
  {
    slug: 'kommunikacii-bez-byudzheta',
    title: 'Воркшоп: коммуникации без бюджета',
    dateISO: '2027-01-22T11:00:00+03:00',
    format: 'офлайн',
    city: 'Москва',
    priceLabel: '3 500 ₽',
    free: false,
    short:
      'Полдня практики для небольших команд: как строить коммуникации, когда нет ни агентства, ни бюджета на него.',
    description: [
      'Воркшоп для основателей небольших компаний и единственных PR-специалистов в команде. Работаем на ваших реальных материалах: продукт, аудитория, каналы.',
      'Количество мест ограничено — до двенадцати участников, чтобы каждому хватило разбора.',
    ],
    program: [
      { time: '11:00', title: 'Диагностика: что ваши коммуникации делают сейчас' },
      { time: '12:00', title: 'Практика: сообщение, которое доходит без бюджета' },
      { time: '13:00', title: 'Перерыв' },
      { time: '13:30', title: 'Разбор материалов участников' },
      { time: '15:00', title: 'Следующий шаг: план на квартал' },
    ],
  },
  {
    slug: 'zhurnalisty-ne-otvechayut',
    title: 'Открытый разбор: что делать, когда журналисты не отвечают',
    dateISO: '2026-09-17T19:00:00+03:00',
    format: 'онлайн',
    priceLabel: 'Бесплатно',
    free: true,
    short:
      'Почему рассылки не работают и как достучаться до медиа без «спама по базе» — разбор на реальных письмах участников.',
    description: [
      'Событие уже прошло. Разбирали: почему пиар-рассылки попадают в «прочитано и забыто», чем отличается новость от инфоповода и как писать так, чтобы отвечали.',
      'Запись и материалы доступны членам клуба.',
    ],
  },
  {
    slug: 'ujti-i-ne-poteryat-sebya',
    title: 'Как уйти из корпорации и не потерять себя',
    dateISO: '2026-06-11T19:00:00+03:00',
    format: 'офлайн',
    city: 'Москва',
    priceLabel: 'Бесплатно',
    free: true,
    short:
      'Офлайн-встреча о переходе из штата в независимость: страхи, деньги, первый год — с людьми, которые уже прошли этот путь.',
    description: [
      'Событие уже прошло. Говорили о том, что происходит с самоощущением после ухода из корпорации, и почему «сделать сайт» — не самый важный первый шаг.',
      'Конспект встречи опубликован в клубе.',
    ],
  },
];

function now(): Date {
  return new Date();
}

export function isUpcoming(event: EventItem): boolean {
  return new Date(event.dateISO).getTime() >= now().getTime();
}

export function upcomingEvents(): EventItem[] {
  return EVENTS.filter(isUpcoming).sort(
    (a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime()
  );
}

export function pastEvents(): EventItem[] {
  return EVENTS.filter((e) => !isUpcoming(e)).sort(
    (a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime()
  );
}

export function getEvent(slug: string): EventItem | undefined {
  return EVENTS.find((e) => e.slug === slug);
}

export function getCentralEvent(): EventItem | null {
  const up = upcomingEvents();
  if (up.length === 0) return null;
  return up.find((e) => e.featured) ?? up[0];
}

const MSK_TIME = 'Europe/Moscow';

/** «12 декабря, 19:00» — всегда московское время, независимо от таймзоны посетителя. */
export function formatEventDate(iso: string, withYear = false): string {
  const d = new Date(iso);
  const dayMonth = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    timeZone: MSK_TIME,
  }).format(d);
  const time = new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: MSK_TIME,
  }).format(d);
  const year = withYear ? ` ${new Intl.DateTimeFormat('ru-RU', { year: 'numeric', timeZone: MSK_TIME }).format(d)}` : '';
  return `${dayMonth}${year}, ${time}`;
}

/** «12 декабря» — для карточек. */
export function formatEventDay(iso: string, withYear = false): string {
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', timeZone: MSK_TIME };
  if (withYear) opts.year = 'numeric';
  return new Intl.DateTimeFormat('ru-RU', opts).format(d);
}

export function formatEventTime(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: MSK_TIME,
  }).format(d);
}
