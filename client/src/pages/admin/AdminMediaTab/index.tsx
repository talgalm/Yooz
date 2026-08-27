import { useState } from 'react';
import { styled } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import MediaBrowser from '../../../components/MediaBrowser';
import FileUploadButton from '../../../components/FileUploadButton';
import { PageTitle } from '../styled';
import { texts } from './AdminMediaTab.i18n';

const Container = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
});

const Head = styled('div')({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 16,
  flexWrap: 'wrap',
});

const Subtitle = styled('div')({
  fontSize: 13,
  color: '#888',
  marginTop: 4,
});

export default function AdminMediaTab() {
  const t = useTranslations(texts);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <Container>
      <Head>
        <div>
          <PageTitle>{t.title}</PageTitle>
          <Subtitle>{t.subtitle}</Subtitle>
        </div>
        <FileUploadButton
          accept="image/*,video/*"
          label={t.upload}
          uploadingLabel={t.uploading}
          onUploaded={() => setRefreshKey((n) => n + 1)}
        />
      </Head>

      <MediaBrowser allowDelete refreshKey={refreshKey} />
    </Container>
  );
}
