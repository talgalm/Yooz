import { useParams } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { useTranslations } from '../../context/LanguageContext';
import { texts } from './ManagePlaceholderPage.i18n';
import { texts as navTexts } from './nav.i18n';
import { MANAGE_NAV } from './nav';
import { BORDER, TEXT_LIGHT } from '../../components/styled';

const MOBILE = '@media (max-width: 900px)';

const Title = styled('h1')({
  margin: 0,
  fontSize: 26,
  fontWeight: 700,
  [MOBILE]: { display: 'none' },
});

const Empty = styled('div')({
  marginTop: 20,
  padding: 40,
  background: '#fff',
  border: `1px dashed ${BORDER}`,
  borderRadius: 14,
  color: TEXT_LIGHT,
  textAlign: 'center',
  [MOBILE]: { marginTop: 0, padding: 28 },
});

export default function ManagePlaceholderPage() {
  const { section } = useParams<{ section: string }>();
  const t = useTranslations(texts);
  const nav = useTranslations(navTexts);
  const item = MANAGE_NAV.find((i) => i.path === section);
  const title = item ? nav[item.path] : section;

  return (
    <>
      <Title>{title}</Title>
      <Empty>{t.empty}</Empty>
    </>
  );
}
