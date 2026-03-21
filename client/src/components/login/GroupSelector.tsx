import { useState } from 'react';
import { useTranslations } from '../../context/LanguageContext';
import { texts } from './GroupSelector.i18n';
import { styled, keyframes } from '@mui/material/styles';
import { PRIMARY, PRIMARY_LIGHT, BORDER, TEXT, TEXT_LIGHT } from '../styled';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
`;

const Backdrop = styled('div')({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.3)',
  zIndex: 100,
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
  animation: `${fadeIn} 0.15s ease-out`,
});

const DrawerPanel = styled('div')({
  background: '#fff',
  borderRadius: '16px 16px 0 0',
  width: '100%',
  maxWidth: 480,
  padding: '12px 20px 24px',
  animation: `${slideUp} 0.2s ease-out`,
  maxHeight: '60vh',
  overflowY: 'auto',
});

const DrawerHandle = styled('div')({
  width: 36,
  height: 4,
  background: '#ddd',
  borderRadius: 2,
  margin: '0 auto 16px',
});

const DrawerTitle = styled('p')({
  fontWeight: 600,
  fontSize: 16,
  color: TEXT,
  margin: '0 0 12px',
  textAlign: 'center',
});

const GroupList = styled('ul')({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
});

const GroupOption = styled('button')<{ active?: boolean }>(({ active }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  padding: '14px 16px',
  fontSize: 16,
  fontWeight: 500,
  background: active ? PRIMARY_LIGHT : 'none',
  border: 'none',
  borderRadius: 12,
  cursor: 'pointer',
  textAlign: 'start' as const,
  fontFamily: 'inherit',
  color: TEXT,
  '&:active': {
    background: '#f5f5f5',
  },
}));

const Check = styled('span')({
  color: PRIMARY,
  fontWeight: 700,
  fontSize: 18,
});

const TriggerButton = styled('button')<{ hasValue?: boolean }>(({ hasValue }) => ({
  width: '100%',
  padding: '14px 16px',
  fontSize: 16,
  fontWeight: hasValue ? 600 : 400,
  border: `2px solid ${hasValue ? PRIMARY : BORDER}`,
  borderRadius: 12,
  background: hasValue ? PRIMARY_LIGHT : '#fafafa',
  color: hasValue ? PRIMARY : TEXT_LIGHT,
  cursor: 'pointer',
  textAlign: 'start' as const,
  fontFamily: 'inherit',
  transition: 'all 0.2s',
}));

interface GroupConfig {
  name: string;
}

interface Props {
  groups: GroupConfig[];
  value: string;
  onChange: (groupName: string) => void;
}

export default function GroupSelector({ groups, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const t = useTranslations(texts);

  const handleSelect = (groupName: string) => {
    onChange(groupName);
    setOpen(false);
  };

  return (
    <>
      <div>
        <TriggerButton
          type="button"
          hasValue={!!value}
          onClick={() => setOpen(true)}
        >
          {value || t.chooseGroup}
        </TriggerButton>
      </div>

      {open && (
        <Backdrop onClick={() => setOpen(false)}>
          <DrawerPanel onClick={(e) => e.stopPropagation()}>
            <DrawerHandle />
            <DrawerTitle>{t.chooseGroup}</DrawerTitle>
            <GroupList>
              {groups.map((g) => (
                <li key={g.name}>
                  <GroupOption
                    active={value === g.name}
                    onClick={() => handleSelect(g.name)}
                  >
                    <span>{g.name}</span>
                    {value === g.name && <Check>✓</Check>}
                  </GroupOption>
                </li>
              ))}
            </GroupList>
          </DrawerPanel>
        </Backdrop>
      )}
    </>
  );
}
