import { useParams } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { useLang } from '../../context/LanguageContext';
import { MANAGE_NAV } from './nav';
import { BORDER, TEXT_LIGHT } from '../../components/styled';

const MOBILE = '@media (max-width: 900px)';

const Title = styled('h1')({
  margin: 0,
  fontSize: 26,
  fontWeight: 700,
  // The mobile top bar already names the section.
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

/** Every menu entry lands here until its milestone builds the real screen. */
export default function ManagePlaceholderPage() {
  const { section } = useParams<{ section: string }>();
  const { lang } = useLang();
  const item = MANAGE_NAV.find((i) => i.path === section);
  const title = item ? (lang === 'he' ? item.labelHe : item.labelEn) : section;

  return (
    <>
      <Title>{title}</Title>
      <Empty>{lang === 'he' ? 'המסך הזה ייבנה באבן הדרך הבאה.' : 'This screen arrives in a later milestone.'}</Empty>
    </>
  );
}
