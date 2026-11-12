'use client';

import { SiteLink } from '@/lib/router';
import { CONTACTS_BLOCKS, CONSENT_DOC, COOKIES_DOC, PRIVACY_DOC, TERMS_DOC, type LegalDoc } from '@/lib/legal';

function LegalLayout({ doc, children }: { doc: LegalDoc; children: React.ReactNode }) {
  return (
    <div className="view-enter">
      <section className="container-site py-14 sm:py-20">
        <div className="mx-auto max-w-[720px]">
          <p className="eyebrow-muted">{doc.meta}</p>
          <h1 className="serif mt-3 text-[clamp(1.9rem,4vw,2.7rem)] leading-[1.2] text-ink">
            {doc.title}
          </h1>
          {doc.intro && (
            <div className="mt-7 space-y-4">
              {doc.intro.map((p, i) => (
                <p key={i} className="text-[16px] leading-[1.8] text-ink-soft">
                  {p}
                </p>
              ))}
            </div>
          )}
          <div className="prose-legal mt-6 text-[15px] leading-[1.8]">{children}</div>
          <div className="mt-14 border-t border-line pt-6 text-[14px] text-ink-soft">
            Все юридические документы:{' '}
            <SiteLink to="/privacy" className="underline decoration-brand/50 underline-offset-2 hover:text-ink">
              Политика конфиденциальности
            </SiteLink>{' '}
            ·{' '}
            <SiteLink to="/consent" className="underline decoration-brand/50 underline-offset-2 hover:text-ink">
              Согласие на обработку данных
            </SiteLink>{' '}
            ·{' '}
            <SiteLink to="/cookies" className="underline decoration-brand/50 underline-offset-2 hover:text-ink">
              Политика cookie
            </SiteLink>{' '}
            ·{' '}
            <SiteLink to="/terms" className="underline decoration-brand/50 underline-offset-2 hover:text-ink">
              Условия использования
            </SiteLink>{' '}
            ·{' '}
            <SiteLink to="/contacts" className="underline decoration-brand/50 underline-offset-2 hover:text-ink">
              Реквизиты и контакты
            </SiteLink>
          </div>
        </div>
      </section>
    </div>
  );
}

function DocBlocks({ doc }: { doc: LegalDoc }) {
  return (
    <>
      {doc.blocks.map((b, i) => (
        <section key={i}>
          {b.heading && <h2>{b.heading}</h2>}
          {b.paragraphs?.map((p, j) => <p key={j}>{p}</p>)}
          {b.bullets && (
            <ul>
              {b.bullets.map((li, j) => (
                <li key={j}>{li}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </>
  );
}

export function PrivacyView() {
  return (
    <LegalLayout doc={PRIVACY_DOC}>
      <DocBlocks doc={PRIVACY_DOC} />
    </LegalLayout>
  );
}

export function ConsentView() {
  return (
    <LegalLayout doc={CONSENT_DOC}>
      <DocBlocks doc={CONSENT_DOC} />
    </LegalLayout>
  );
}

export function CookiesView() {
  return (
    <LegalLayout doc={COOKIES_DOC}>
      <DocBlocks doc={COOKIES_DOC} />
    </LegalLayout>
  );
}

export function TermsView() {
  return (
    <LegalLayout doc={TERMS_DOC}>
      <DocBlocks doc={TERMS_DOC} />
    </LegalLayout>
  );
}

export function ContactsView() {
  return (
    <LegalLayout
      doc={{
        title: 'Реквизиты и контакты',
        meta: 'Редакция от 7 ноября 2026 года',
        intro: [
          'Сайт «Соло-PR» собирает персональные данные, поэтому его владелец должен быть идентифицируем — этого требуют 152-ФЗ «О персональных данных» и 149-ФЗ «Об информации».',
        ],
        blocks: [],
      }}
    >
      {CONTACTS_BLOCKS.map((b, i) => (
        <section key={i}>
          {b.heading && <h2>{b.heading}</h2>}
          {b.paragraphs?.map((p, j) => <p key={j}>{p}</p>)}
          {b.bullets && (
            <ul>
              {b.bullets.map((li, j) => (
                <li key={j}>{li}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
      <section>
        <h2>Примечание для владельца сайта</h2>
        <p>
          Значения в квадратных скобках — места для ваших реквизитов. После заполнения проверьте,
          что ФИО и организационная форма совпадают во всех юридических документах и в футере
          сайта. Если вы зарегистрированы как оператор в Роскомнадзоре — укажите дату включения в
          реестр.
        </p>
      </section>
    </LegalLayout>
  );
}

export function NotFoundView() {
  return (
    <div className="view-enter container-site py-24 text-center">
      <p className="eyebrow">Ошибка 404</p>
      <h1 className="serif mt-4 text-[clamp(1.9rem,4vw,2.6rem)] text-ink">Такой страницы нет</h1>
      <p className="mx-auto mt-4 max-w-md text-[16px] leading-[1.8] text-ink-soft">
        Дверь, в которую вы толкнули, ведёт в другую комнату. Вернитесь на главную или выберите
        любой вход заново.
      </p>
      <div className="mt-9 flex flex-wrap justify-center gap-x-6 gap-y-3">
        <SiteLink to="/" className="btn btn-brand">
          На главную
        </SiteLink>
        <SiteLink to="/events" className="btn btn-outline">
          Мероприятия
        </SiteLink>
        <SiteLink to="/courses" className="btn btn-outline">
          Курсы
        </SiteLink>
      </div>
    </div>
  );
}
