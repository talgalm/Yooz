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

type StationTypeOption = 'text' | 'video' | 'image' | 'narrative' | 'badge' | 'collage';

interface StationData {
  _id: string;
  name: string;
  type: StationTypeOption;
  description?: string;
  customer?: string;
  theme?: string;
  tags?: string[];
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

  const validTypes: StationTypeOption[] = ['text', 'video', 'image', 'narrative', 'badge', 'collage'];
  const typeFromUrl = searchParams.get('type') as StationTypeOption | null;
  const defaultType: StationTypeOption = typeFromUrl && validTypes.includes(typeFromUrl) ? typeFromUrl : 'text';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [customer, setCustomer] = useState('');
  const [theme, setTheme] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
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
  // Collage station
  const [collageHeader, setCollageHeader] = useState('');
  const [collageDescription, setCollageDescription] = useState('');
  const [collageMissions, setCollageMissions] = useState<{ title: string; description: string }[]>([
    { title: '', description: '' },
  ]);

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
        setTags(s.tags || []);

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
        if (s.type === 'collage') {
          if (settings.header) setCollageHeader(settings.header as string);
          if (settings.description) setCollageDescription(settings.description as string);
          if (Array.isArray(settings.missions) && (settings.missions as unknown[]).length > 0) {
            setCollageMissions(settings.missions as { title: string; description: string }[]);
          }
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
      if (stationType === 'collage') {
        settings.header = collageHeader.trim();
        settings.description = collageDescription.trim();
        settings.missions = collageMissions
          .filter((m) => m.title.trim())
          .map((m) => ({ title: m.title.trim(), description: m.description.trim() }));
      }

      const payload = {
        name: name.trim(),
        type: stationType,
        description: description.trim() || undefined,
        customer: customer.trim() || undefined,
        theme: theme.trim() || undefined,
        tags,
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
    collage: 'תחנת קולאז׳ - טסט',
  };

  const handleFillRandom = () => {
    const ts = Date.now().toString().slice(-4);
    const types: StationTypeOption[] = ['text', 'video', 'image', 'narrative', 'badge', 'collage'];
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
    setCollageHeader('');
    setCollageDescription('');
    setCollageMissions([{ title: '', description: '' }]);
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
    } else if (randomType === 'collage') {
      setCollageHeader('בואו ניצור יחד קולאז׳ חי');
      setCollageDescription('קחו בין תמונה אחת לשלוש לפי ההנחיות. אנחנו מחפשים רגעים אמיתיים.');
      setCollageMissions([
        { title: 'מעגל הצוות', description: 'צלמו את כל הצוות עומד במעגל ומביט אל המרכז.' },
        { title: 'אביזר מצחיק', description: 'צלמו תמונה עם חפץ אקראי ומצחיק שמצאתם בחדר.' },
        { title: 'קרני אצבעות', description: 'צרו זוגות ועשו עם האצבעות "קרניים" אחד אל השני עם חיוך.' },
      ]);
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
                    <SelectionButton type="button" selected={stationType === 'collage'} onClick={() => setStationType('collage')}>
                      <div>{t.typeCollage}</div>
                      <SelectionSubtextSmall>{t.typeCollageDesc}</SelectionSubtextSmall>
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
                <div>
                  <SectionLabel>{t.tags || 'Tags'}</SectionLabel>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    {tags.map((tag, i) => (
                      <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 12, fontWeight: 600, borderRadius: 20, background: '#f0eefa', color: '#6c5ce7' }}>
                        {tag}
                        <span style={{ cursor: 'pointer', marginInlineStart: 2 }} onClick={() => setTags(tags.filter((_, j) => j !== i))}>×</span>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Input
                      placeholder={t.addTag || 'Add tag...'}
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const v = tagInput.trim();
                          if (v && !tags.includes(v)) setTags([...tags, v]);
                          setTagInput('');
                        }
                      }}
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>
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

              {stationType === 'collage' && (
                <VerticalStack>
                  <SectionLabelNoMargin>{t.collageHeader}</SectionLabelNoMargin>
                  <Input
                    placeholder={t.collageHeaderPlaceholder}
                    value={collageHeader}
                    onChange={(e) => setCollageHeader(e.target.value)}
                  />
                  <SectionLabelNoMargin>{t.collageDescription}</SectionLabelNoMargin>
                  <Input
                    placeholder={t.collageDescriptionPlaceholder}
                    value={collageDescription}
                    onChange={(e) => setCollageDescription(e.target.value)}
                  />

                  <SectionLabelNoMargin>{t.collageMissions}</SectionLabelNoMargin>
                  {collageMissions.map((mission, idx) => (
                    <div key={idx} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px', marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <SectionLabelNoMargin style={{ margin: 0 }}>
                          {t.collageMissionNum} {idx + 1}
                        </SectionLabelNoMargin>
                        {collageMissions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setCollageMissions((ms) => ms.filter((_, i) => i !== idx))}
                            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 13, padding: '2px 6px' }}
                          >
                            {t.collageMissionRemove}
                          </button>
                        )}
                      </div>
                      <Input
                        placeholder={t.collageMissionTitle}
                        value={mission.title}
                        onChange={(e) => setCollageMissions((ms) => ms.map((m, i) => i === idx ? { ...m, title: e.target.value } : m))}
                        style={{ marginBottom: 8 }}
                      />
                      <Input
                        placeholder={t.collageMissionDesc}
                        value={mission.description}
                        onChange={(e) => setCollageMissions((ms) => ms.map((m, i) => i === idx ? { ...m, description: e.target.value } : m))}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCollageMissions((ms) => [...ms, { title: '', description: '' }])}
                    style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: '#a5b4fc', fontSize: 13, padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    + {t.collageMissionAdd}
                  </button>
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
