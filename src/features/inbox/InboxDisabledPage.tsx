import { Panel, SectionHeading } from '../../components/ui';
import { useI18n } from '../../i18n/I18nProvider';
import './InboxPage.css';

export function InboxDisabledPage() {
  const { t } = useI18n();

  return (
    <section className="inbox-page">
      <Panel className="inbox-hero" variant="hero">
        <div>
          <SectionHeading
            as="h1"
            className="inbox-hero__heading"
            eyebrow={t('inbox.disabledEyebrow')}
            title={t('inbox.disabledTitle')}
          />
          <p>{t('inbox.disabledDescription')}</p>
        </div>
      </Panel>
      <div className="inbox-workflow">
        <a href="#archive">{t('inbox.disabledOpenArchive')}</a>
      </div>
    </section>
  );
}
