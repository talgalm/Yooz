import { styled } from '@mui/material/styles';
import FileUploadButton from '../../../components/FileUploadButton';
import { useTranslations } from '../../../context/LanguageContext';
import { MAP_LOOKS } from '../../../utils/mapDesign';
import { texts } from './MapIconSection.i18n';

const ICON_ACCEPT = 'image/svg+xml,image/png,image/webp,image/jpeg';

const Section = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  paddingTop: 14,
  borderTop: '1px solid #f0f0f0',
});

const Title = styled('div')({ fontSize: 14, fontWeight: 700, color: '#333' });
const Hint = styled('div')({ fontSize: 12, color: '#888' });
const Row = styled('div')({ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' });
const PreviewLabel = styled('span')({ fontSize: 12, color: '#666' });

const PinPreview = styled('span')({
  width: 36,
  height: 36,
  borderRadius: '50%',
  background: MAP_LOOKS.standard.pins.next,
  border: '3px solid #fff',
  boxShadow: '0 0 0 1px #ddd',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  '& img': { width: 22, height: 22, objectFit: 'contain' },
});

const RemoveBtn = styled('button')({
  background: 'none',
  color: '#c0392b',
  border: '1px solid #e3bdb8',
  borderRadius: 8,
  padding: '8px 14px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  '&:hover': { background: '#fdeeea', borderColor: '#c0392b' },
});

export default function MapIconSection({ icon, onChange }: {
  icon?: string;
  onChange: (icon: string | undefined) => void;
}) {
  const t = useTranslations(texts);
  return (
    <Section>
      <Title>{t.title}</Title>
      <Hint>{t.hint}</Hint>
      {icon && (
        <Row>
          <PreviewLabel>{t.preview}</PreviewLabel>
          <PinPreview><img src={icon} alt="" /></PinPreview>
        </Row>
      )}
      <Row>
        <FileUploadButton
          accept={ICON_ACCEPT}
          onUploaded={(url) => onChange(url)}
          label={icon ? t.replace : t.upload}
          uploadingLabel={t.uploading}
        />
        {icon && <RemoveBtn type="button" onClick={() => onChange(undefined)}>{t.remove}</RemoveBtn>}
      </Row>
    </Section>
  );
}
