import { useI18n } from '../../i18n/I18nProvider';

export function InboxPage() {
  const { t } = useI18n();

  return (
    <section>
      <p className="eyebrow">{t('inbox.eyebrow')}</p>
      <h1>{t('inbox.title')}</h1>
      <p>{t('inbox.description')}</p>
    </section>
  );
}
