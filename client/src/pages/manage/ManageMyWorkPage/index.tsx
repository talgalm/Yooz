import { useTranslations } from '../../../context/LanguageContext';
import { useManageAuth } from '../../../context/ManageAuthContext';
import { texts } from '../time.i18n';
import MonthSheet from '../MonthSheet';
import { PageHeader, SectionTitle, EmptyState } from '../manageUi';

/**
 * Every employee's default landing screen: the timer bar above, their own week
 * below. Nothing else — this is the screen they open twenty times a day.
 */
export default function ManageMyWorkPage() {
  const t = useTranslations(texts);
  const { user } = useManageAuth();

  return (
    <>
      <PageHeader>
        <SectionTitle>{t.myWork}</SectionTitle>
      </PageHeader>
      {user?.tracksTime
        ? <MonthSheet />
        : <EmptyState>{t.ownerNoTrack}</EmptyState>}
    </>
  );
}
