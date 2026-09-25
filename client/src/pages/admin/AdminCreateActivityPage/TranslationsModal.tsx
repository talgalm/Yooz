import { styled } from '@mui/material/styles';
import ContentLanguageTabs from '../../../components/TranslationsPanel/ContentLanguageTabs';
import { texts } from './TranslationsModal.i18n';
import { useTranslations } from '../../../context/LanguageContext';

interface TranslationsModalProps {
  kind: 'stations' | 'games';
  id: string;
  title: string;
  onClose: () => void;
}

const Backdrop = styled('div')({
  position: 'fixed',
  inset: 0,
  background: 'rgba(28,22,48,0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1200,
  padding: 20,
});

const Panel = styled('div')({
  background: '#fff',
  borderRadius: 16,
  width: 'min(760px, 100%)',
  maxHeight: '86dvh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 18px 48px rgba(40,30,70,0.28)',
});

const Head = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '18px 22px',
  borderBottom: '1px solid #ece8f3',
});

const Title = styled('div')({ fontSize: 17, fontWeight: 800, color: '#2d2540' });

const Close = styled('button')({
  padding: '8px 16px',
  borderRadius: 10,
  border: '1.5px solid #ded7f0',
  background: '#fff',
  color: '#2d2540',
  fontSize: 14,
  fontWeight: 700,
  fontFamily: 'inherit',
  cursor: 'pointer',
});

const Body = styled('div')({ padding: '16px 22px 20px', overflowY: 'auto' });

/**
 * The same translation editor as the one on the station's own page, reached
 * from the module builder without leaving it.
 *
 * The editor itself lives in `components/TranslationsPanel`, so the two places
 * cannot drift apart; this only supplies the frame.
 */
export default function TranslationsModal({ kind, id, title, onClose }: TranslationsModalProps) {
  const t = useTranslations(texts);

  return (
    <Backdrop onClick={onClose}>
      <Panel onClick={(e) => e.stopPropagation()}>
        <Head>
          <Title>{t.title.replace('{name}', title)}</Title>
          <Close type="button" onClick={onClose}>
            {t.close}
          </Close>
        </Head>
        <Body>
          <ContentLanguageTabs kind={kind} id={id} plain />
        </Body>
      </Panel>
    </Backdrop>
  );
}
