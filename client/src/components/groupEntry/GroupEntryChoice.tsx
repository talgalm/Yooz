import { useTranslations } from '../../context/LanguageContext';
import { texts } from './groupEntry.i18n';
import { GroupEntryButton, GroupEntrySecondaryButton } from './styled';

interface Props {
  onCreate: () => void;
  onJoin: () => void;
}

export default function GroupEntryChoice({ onCreate, onJoin }: Props) {
  const t = useTranslations(texts);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
      <GroupEntryButton type="button" onClick={onCreate}>
        {t.createGroup}
      </GroupEntryButton>
      <GroupEntryButton type="button" onClick={onJoin}>
        {t.joinExisting}
      </GroupEntryButton>
    </div>
  );
}

export function GroupEntryBackButton({ onBack }: { onBack: () => void }) {
  const t = useTranslations(texts);
  return (
    <GroupEntrySecondaryButton type="button" onClick={onBack}>
      {t.back}
    </GroupEntrySecondaryButton>
  );
}
