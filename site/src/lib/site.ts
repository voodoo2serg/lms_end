/**
 * Общие данные сайта «Соло-PR».
 * Значения в квадратных скобках — места, которые владелец сайта заполняет
 * перед публикацией (реквизиты и контакты нигде не выдуманы).
 */

export const SITE = {
  name: 'Соло-PR',
  tagline: 'Помогаю PR-специалистам выйти в независимую позицию',
  email: '[email]',
  phone: '[телефон]',
  telegram: '[ссылка на телеграм-канал]',
  vk: '[ссылка на страницу ВКонтакте]',
  city: 'Москва',
} as const;

export const REQUISITES = {
  fullName: '[ФИО оператора / наименование ИП]',
  legalForm: '[правовая форма: ИП / самозанятый / физическое лицо]',
  inn: '[ИНН]',
  ogrnip: '[ОГРНИП — если есть]',
  address: '[адрес для обращений]',
  registered: '[дата регистрации в реестре операторов Роскомнадзора — при наличии]',
} as const;

export const LEGAL_LINKS: { title: string; path: string }[] = [
  { title: 'Политика конфиденциальности', path: '/privacy' },
  { title: 'Согласие на обработку персональных данных', path: '/consent' },
  { title: 'Политика cookie', path: '/cookies' },
  { title: 'Условия использования', path: '/terms' },
  { title: 'Реквизиты и контакты', path: '/contacts' },
];

export const NAV_GROUPS: { items: { title: string; path: string }[] }[] = [
  { items: [{ title: 'Обо мне', path: '/about' }] },
  {
    items: [
      { title: 'Курсы', path: '/courses' },
      { title: 'Клуб', path: '/club' },
      { title: 'Менторство', path: '/mentoring' },
      { title: 'Консалтинг', path: '/consulting' },
    ],
  },
  { items: [{ title: 'Мероприятия', path: '/events' }] },
];
