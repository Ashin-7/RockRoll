import { useI18n } from '../../i18n/I18nProvider';
import './InboxPage.css';

export function InboxDisabledPage() {
  const { t } = useI18n();

  return (
    <section className="inbox-page">
      <div className="inbox-hero">
        <div>
          <p className="eyebrow">{t('inbox.disabledEyebrow')}</p>
          <h1>{t('inbox.disabledTitle')}</h1>
          <p>{t('inbox.disabledDescription')}</p>
        </div>
      </div>
      <div className="inbox-workflow">
        <a href="#archive">{t('inbox.disabledOpenArchive')}</a>
      </div>
    </section>
  );
}
