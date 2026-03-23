import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './AdminStationConfigPage.i18n';
import { adminApiFetch } from '../../../utils/adminApi';
import FileUploadButton from '../../../components/FileUploadButton';
import {
  AdminPage,
  AdminHeader,
  AdminContent,
  Form,
  Input,
  PrimaryButton,
  ErrorText,
  SelectionButton,
  SelectionGroup,
} from '../../../components/styled';
import {
  AdminCardWide,
  PageTitle,
  PageTopRow,
  DesktopFormGrid,
  FormSectionCard,
  FormSectionCardWide,
  SectionLabel,
  SectionLabelNoMargin,
  SmallOutlineButton,
  ToggleButton,
  InlineRow,
  InlineRowGap12,
  FlexInput,
  VerticalStack,
  SelectionSubtextSmall,
} from '../styled';

type StationTypeOption = 'text' | 'video' | 'image' | 'narrative' | 'badge';

interface StationData {
  _id: string;
  name: string;
  type: StationTypeOption;
  description?: string;
  customer?: string;
  theme?: string;
  settings: Record<string, unknown>;
}

const HintToggleRow = styled(InlineRowGap12)({
  marginBottom: 8,
});

const RandomButton = styled('button')({
  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  color: '#fff',
  fontSize: 13,
  fontWeight: 700,
  padding: '8px 18px',
  borderRadius: 8,
  border: '2px solid #b45309',
  cursor: 'pointer',
  fontFamily: 'inherit',
  boxShadow: '0 2px 0 #92400e',
  transition: 'all 0.1s ease',
  '&:active': { transform: 'translateY(2px)', boxShadow: 'none' },
});

export default function AdminStationConfigPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const t = useTranslations(texts);

  const validTypes: StationTypeOption[] = ['text', 'video', 'image', 'narrative', 'badge'];
  const typeFromUrl = searchParams.get('type') as StationTypeOption | null;
  const defaultType: StationTypeOption = typeFromUrl && validTypes.includes(typeFromUrl) ? typeFromUrl : 'text';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [customer, setCustomer] = useState('');
  const [theme, setTheme] = useState('');
  const [stationType, setStationType] = useState<StationTypeOption>(defaultType);

  // Hint
  const [hintEnabled, setHintEnabled] = useState(false);
  const [hintText, setHintText] = useState('');

  // Text station
  const [textContent, setTextContent] = useState('');
  // Video/Image station
  const [mediaUrl, setMediaUrl] = useState('');
  // Narrative station
  const [narrativeTitle, setNarrativeTitle] = useState('');
  const [narrativeBody, setNarrativeBody] = useState('');
  const [narrativeButtonText, setNarrativeButtonText] = useState('');
  const [narrativeBgImage, setNarrativeBgImage] = useState('');
  // Badge station
  const [badgeTitle, setBadgeTitle] = useState('');
  const [badgeSubtitle, setBadgeSubtitle] = useState('');
  const [badgeImageUrl, setBadgeImageUrl] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);

  useEffect(() => {
    if (!id) return;
    adminApiFetch<{ station: StationData }>(`/api/admin/stations/${id}`)
      .then((data) => {
        const s = data.station;
        setName(s.name);
        setStationType(s.type || 'text');
        setDescription(s.description || '');
        setCustomer(s.customer || '');
        setTheme(s.theme || '');

        const settings = s.settings || {};
        if (settings.hint && typeof settings.hint === 'object') {
          const h = settings.hint as Record<string, unknown>;
          setHintEnabled(!!h.enabled);
          setHintText((h.text as string) || '');
        }
        if (settings.content) setTextContent(settings.content as string);
        if (settings.mediaUrl) setMediaUrl(settings.mediaUrl as string);
        if (settings.title) setNarrativeTitle(settings.title as string);
        if (settings.bodyText) setNarrativeBody(settings.bodyText as string);
        if (settings.buttonText) setNarrativeButtonText(settings.buttonText as string);
        if (settings.backgroundImage) setNarrativeBgImage(settings.backgroundImage as string);
        if (s.type === 'badge') {
          if (settings.title) setBadgeTitle(settings.title as string);
          if (settings.subtitle) setBadgeSubtitle(settings.subtitle as string);
          if (settings.badgeImageUrl) setBadgeImageUrl(settings.badgeImageUrl as string);
        }
        setInitialLoading(false);
      })
      .catch(() => navigate('/admin/dashboard'));
  }, [id, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const settings: Record<string, unknown> = {};
      if (hintEnabled && hintText.trim()) {
        settings.hint = { enabled: true, text: hintText.trim() };
      }
      if (stationType === 'text') {
        settings.content = textContent.trim();
      }
      if (stationType === 'video' || stationType === 'image') {
        settings.mediaUrl = mediaUrl.trim();
      }
      if (stationType === 'narrative') {
        settings.title = narrativeTitle.trim();
        settings.bodyText = narrativeBody.trim();
        if (narrativeButtonText.trim()) settings.buttonText = narrativeButtonText.trim();
        if (narrativeBgImage.trim()) settings.backgroundImage = narrativeBgImage.trim();
      }
      if (stationType === 'badge') {
        settings.title = badgeTitle.trim();
        settings.subtitle = badgeSubtitle.trim();
        settings.badgeImageUrl = badgeImageUrl.trim();
      }

      const payload = {
        name: name.trim(),
        type: stationType,
        description: description.trim() || undefined,
        customer: customer.trim() || undefined,
        theme: theme.trim() || undefined,
        settings,
      };

      if (id) {
        await adminApiFetch(`/api/admin/stations/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await adminApiFetch('/api/admin/stations', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const stationNames: Record<string, string> = {
    text: 'תחנת טקסט - טסט',
    video: 'תחנת וידאו - טסט',
    image: 'תחנת תמונה - טסט',
    narrative: 'תחנת נרטיב - טסט',
    badge: 'תחנת תג - טסט',
  };

  const handleFillRandom = () => {
    const ts = Date.now().toString().slice(-4);
    const types: StationTypeOption[] = ['text', 'video', 'image', 'narrative', 'badge'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    setStationType(randomType);
    setName(`${stationNames[randomType]} #${ts}`);
    setDescription('תחנה לבדיקה');
    setCustomer('לקוח טסט');
    setTheme('נושא טסט');
    setHintEnabled(true);
    setHintText('זהו רמז לדוגמה');
    setTextContent('');
    setMediaUrl('');
    setNarrativeTitle('');
    setNarrativeBody('');
    setNarrativeButtonText('');
    setNarrativeBgImage('');
    setBadgeTitle('');
    setBadgeSubtitle('');
    setBadgeImageUrl('');
    if (randomType === 'text') {
      setTextContent('זהו תוכן טקסט לדוגמה עבור תחנת בדיקה. כאן יופיע המידע שהמשתתף צריך לקרוא.');
    } else if (randomType === 'video') {
      setMediaUrl('https://www.w3schools.com/html/mov_bbb.mp4');
    } else if (randomType === 'image') {
      setMediaUrl('https://picsum.photos/800/600');
    } else if (randomType === 'narrative') {
      setNarrativeTitle('אות מצוקה התגלה!');
      setNarrativeBody('קלטנו אות מצוקה מהפארק. נדרשת עזרתכם למשימה חשובה!');
      setNarrativeButtonText('התחל משימה');
      setNarrativeBgImage('https://picsum.photos/800/1200');
    } else if (randomType === 'badge') {
      setBadgeTitle('כל הכבוד!');
      setBadgeSubtitle('השלמת את המשימה בהצלחה');
      setBadgeImageUrl('https://picsum.photos/400/400');
    }
  };

  if (initialLoading) return null;

  return (
    <AdminPage>
      <AdminHeader>
        <img src="/images/logo-purple.png" alt="Yooz" style={{ height: 32 }} />
        <SmallOutlineButton onClick={() => navigate('/admin/dashboard')}>{t.back}</SmallOutlineButton>
      </AdminHeader>
      <AdminContent>
        <AdminCardWide>
          <PageTopRow>
            <PageTitle style={{ marginBottom: 0 }}>{t.title}</PageTitle>
            {!id && <RandomButton type="button" onClick={handleFillRandom}>🎲 Random</RandomButton>}
          </PageTopRow>
          <Form onSubmit={handleSubmit}>
            <DesktopFormGrid>
              <FormSectionCard>
                <Input
                  placeholder={t.stationName}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <div>
                  <SectionLabel>{t.stationType}</SectionLabel>
                  <SelectionGroup>
                    <SelectionButton type="button" selected={stationType === 'text'} onClick={() => setStationType('text')}>
                      <div>{t.typeText}</div>
                      <SelectionSubtextSmall>{t.typeTextDesc}</SelectionSubtextSmall>
                    </SelectionButton>
                    <SelectionButton type="button" selected={stationType === 'video'} onClick={() => setStationType('video')}>
                      <div>{t.typeVideo}</div>
                      <SelectionSubtextSmall>{t.typeVideoDesc}</SelectionSubtextSmall>
                    </SelectionButton>
                    <SelectionButton type="button" selected={stationType === 'image'} onClick={() => setStationType('image')}>
                      <div>{t.typeImage}</div>
                      <SelectionSubtextSmall>{t.typeImageDesc}</SelectionSubtextSmall>
                    </SelectionButton>
                    <SelectionButton type="button" selected={stationType === 'narrative'} onClick={() => setStationType('narrative')}>
                      <div>{t.typeNarrative}</div>
                      <SelectionSubtextSmall>{t.typeNarrativeDesc}</SelectionSubtextSmall>
                    </SelectionButton>
                    <SelectionButton type="button" selected={stationType === 'badge'} onClick={() => setStationType('badge')}>
                      <div>{t.typeBadge}</div>
                      <SelectionSubtextSmall>{t.typeBadgeDesc}</SelectionSubtextSmall>
                    </SelectionButton>
                  </SelectionGroup>
                </div>
                <Input
                  placeholder={t.description}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <Input
                  placeholder={t.customer}
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                />
                <Input
                  placeholder={t.theme}
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                />
              </FormSectionCard>

              <FormSectionCard>
                {/* Hint */}
                <div>
                  <HintToggleRow>
                    <SectionLabelNoMargin>{t.hintLabel}</SectionLabelNoMargin>
                    <ToggleButton
                      type="button"
                      selected={hintEnabled}
                      onClick={() => setHintEnabled((v) => !v)}
                    >
                      {hintEnabled ? 'ON' : 'OFF'}
                    </ToggleButton>
                  </HintToggleRow>
                  {hintEnabled && (
                    <Input
                      placeholder={t.hintPlaceholder}
                      value={hintText}
                      onChange={(e) => setHintText(e.target.value)}
                    />
                  )}
                </div>
              </FormSectionCard>
            </DesktopFormGrid>

            {/* Type-specific settings */}
            <FormSectionCardWide>
              {stationType === 'text' && (
                <div>
                  <SectionLabel>{t.textContent}</SectionLabel>
                  <Input
                    placeholder={t.textContent}
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                  />
                </div>
              )}

              {stationType === 'video' && (
                <VerticalStack>
                  <SectionLabelNoMargin>{t.mediaUrl}</SectionLabelNoMargin>
                  <InlineRow>
                    <FileUploadButton
                      accept="video/*"
                      onUploaded={(url) => setMediaUrl(url)}
                      label={t.upload}
                      uploadingLabel={t.uploading}
                    />
                    <FlexInput
                      placeholder={t.mediaUrl}
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                    />
                  </InlineRow>
                </VerticalStack>
              )}

              {stationType === 'image' && (
                <VerticalStack>
                  <SectionLabelNoMargin>{t.mediaUrl}</SectionLabelNoMargin>
                  <InlineRow>
                    <FileUploadButton
                      accept="image/*"
                      onUploaded={(url) => setMediaUrl(url)}
                      label={t.upload}
                      uploadingLabel={t.uploading}
                    />
                    <FlexInput
                      placeholder={t.mediaUrl}
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                    />
                  </InlineRow>
                </VerticalStack>
              )}

              {stationType === 'narrative' && (
                <VerticalStack>
                  <SectionLabelNoMargin>{t.narrativeTitle}</SectionLabelNoMargin>
                  <Input
                    placeholder={t.narrativeTitle}
                    value={narrativeTitle}
                    onChange={(e) => setNarrativeTitle(e.target.value)}
                  />
                  <SectionLabelNoMargin>{t.narrativeBody}</SectionLabelNoMargin>
                  <Input
                    placeholder={t.narrativeBody}
                    value={narrativeBody}
                    onChange={(e) => setNarrativeBody(e.target.value)}
                  />
                  <SectionLabelNoMargin>{t.narrativeButton}</SectionLabelNoMargin>
                  <Input
                    placeholder={t.narrativeButton}
                    value={narrativeButtonText}
                    onChange={(e) => setNarrativeButtonText(e.target.value)}
                  />
                  <SectionLabelNoMargin>{t.narrativeBgImage}</SectionLabelNoMargin>
                  <InlineRow>
                    <FileUploadButton
                      accept="image/*"
                      onUploaded={(url) => setNarrativeBgImage(url)}
                      label={t.upload}
                      uploadingLabel={t.uploading}
                    />
                    <FlexInput
                      placeholder={t.narrativeBgImage}
                      value={narrativeBgImage}
                      onChange={(e) => setNarrativeBgImage(e.target.value)}
                    />
                  </InlineRow>
                </VerticalStack>
              )}

              {stationType === 'badge' && (
                <VerticalStack>
                  <SectionLabelNoMargin>{t.badgeStationTitle}</SectionLabelNoMargin>
                  <Input
                    placeholder={t.badgeStationTitle}
                    value={badgeTitle}
                    onChange={(e) => setBadgeTitle(e.target.value)}
                  />
                  <SectionLabelNoMargin>{t.badgeSubtitle}</SectionLabelNoMargin>
                  <Input
                    placeholder={t.badgeSubtitle}
                    value={badgeSubtitle}
                    onChange={(e) => setBadgeSubtitle(e.target.value)}
                  />
                  <SectionLabelNoMargin>{t.badgeImage}</SectionLabelNoMargin>
                  <InlineRow>
                    <FileUploadButton
                      accept="image/*"
                      onUploaded={(url) => setBadgeImageUrl(url)}
                      label={t.upload}
                      uploadingLabel={t.uploading}
                    />
                    <FlexInput
                      placeholder={t.badgeImage}
                      value={badgeImageUrl}
                      onChange={(e) => setBadgeImageUrl(e.target.value)}
                    />
                  </InlineRow>
                </VerticalStack>
              )}
            </FormSectionCardWide>

            <FormSectionCardWide>
              {error && <ErrorText>{error}</ErrorText>}
              <PrimaryButton type="submit" disabled={loading || !name.trim()}>
                {loading ? t.saving : t.save}
              </PrimaryButton>
            </FormSectionCardWide>
          </Form>
        </AdminCardWide>
      </AdminContent>
    </AdminPage>
  );
}
