import { useState, FormEvent } from 'react';
import { styled } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './AdminStationsTab.i18n';
import { adminApiFetch } from '../../../utils/adminApi';
import FileUploadButton from '../../../components/FileUploadButton';
import type { Station } from '../AdminDashboardPage';
import {
  Table,
  PrimaryButton,
  OutlineButton,
  Form,
  Input,
  Chip,
  ErrorText,
  SelectionGroup,
  SelectionButton,
  DesktopOnly,
  HideOnDesktop,
  MobileCardList,
} from '../../../components/styled';
import {
  SectionHeaderRow,
  PageTitleNoMargin,
  SmallActionButton,
  FormCard,
  SectionLabel,
  SectionLabelNoMargin,
  SelectionSubtextSmall,
  VerticalStack,
  InlineRow,
  InlineRowGap12,
  FlexInput,
  ToggleButton,
  FormButtonsRow,
  EmptyText,
  AdminCardNoPadding,
  SmallDangerButton,
  CellBold,
  CellMuted,
  CellAlignEnd,
  MobileCardItemDefault,
  MobileCardHeader,
  MobileCardName,
  InlineRowGap6,
  MobileCardDate,
} from '../styled';

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

type StationTypeOption = 'text' | 'video' | 'image' | 'narrative' | 'badge';

interface AdminStationsTabProps {
  stations: Station[];
  onRefresh: () => void;
}

export default function AdminStationsTab({ stations, onRefresh }: AdminStationsTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [customer, setCustomer] = useState('');
  const [theme, setTheme] = useState('');
  const [stationType, setStationType] = useState<StationTypeOption>('text');
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
  const t = useTranslations(texts);

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

  const handleCreate = async (e: FormEvent) => {
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
      await adminApiFetch('/api/admin/stations', {
        method: 'POST',
        body: JSON.stringify({
          name,
          type: stationType,
          description,
          customer,
          theme,
          settings,
        }),
      });
      setName('');
      setDescription('');
      setCustomer('');
      setTheme('');
      setStationType('text');
      setHintEnabled(false);
      setHintText('');
      setTextContent('');
      setMediaUrl('');
      setNarrativeTitle('');
      setNarrativeBody('');
      setNarrativeButtonText('');
      setNarrativeBgImage('');
      setBadgeTitle('');
      setBadgeSubtitle('');
      setBadgeImageUrl('');
      setShowForm(false);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    await adminApiFetch(`/api/admin/stations/${id}`, { method: 'DELETE' });
    setConfirmDeleteId(null);
    onRefresh();
  };

  const typeLabel = (type?: string) => {
    switch (type) {
      case 'text': return t.typeText;
      case 'video': return t.typeVideo;
      case 'image': return t.typeImage;
      case 'narrative': return t.typeNarrative;
      case 'badge': return t.typeBadge;
      default: return type || '—';
    }
  };

  return (
    <>
      <SectionHeaderRow>
        <PageTitleNoMargin>{t.title}</PageTitleNoMargin>
        {!showForm && (
          <SmallActionButton onClick={() => setShowForm(true)}>
            {t.createNew}
          </SmallActionButton>
        )}
      </SectionHeaderRow>

      {showForm && (
        <FormCard>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <RandomButton type="button" onClick={handleFillRandom}>🎲 Random</RandomButton>
          </div>
          <Form onSubmit={handleCreate}>
            <Input
              placeholder={t.stationName}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
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
            {/* Station Type */}
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

            {/* Text type: text content */}
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

            {/* Video type: upload + URL */}
            {stationType === 'video' && (
              <VerticalStack>
                <SectionLabelNoMargin>{t.mediaUrl}</SectionLabelNoMargin>
                <InlineRow>
                  <FileUploadButton
                    accept="video/*"
                    onUploaded={(url) => setMediaUrl(url)}
                    label={t.upload || 'Upload'}
                    uploadingLabel={t.uploading || 'Uploading...'}
                  />
                  <FlexInput
                    placeholder={t.mediaUrl}
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                  />
                </InlineRow>
              </VerticalStack>
            )}

            {/* Image type: upload + URL */}
            {stationType === 'image' && (
              <VerticalStack>
                <SectionLabelNoMargin>{t.mediaUrl}</SectionLabelNoMargin>
                <InlineRow>
                  <FileUploadButton
                    accept="image/*"
                    onUploaded={(url) => setMediaUrl(url)}
                    label={t.upload || 'Upload'}
                    uploadingLabel={t.uploading || 'Uploading...'}
                  />
                  <FlexInput
                    placeholder={t.mediaUrl}
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                  />
                </InlineRow>
              </VerticalStack>
            )}

            {/* Narrative type: title, body, button text, background image */}
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
                    label={t.upload || 'Upload'}
                    uploadingLabel={t.uploading || 'Uploading...'}
                  />
                  <FlexInput
                    placeholder={t.narrativeBgImage}
                    value={narrativeBgImage}
                    onChange={(e) => setNarrativeBgImage(e.target.value)}
                  />
                </InlineRow>
              </VerticalStack>
            )}

            {/* Badge type: title, subtitle, badge image */}
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
                    label={t.upload || 'Upload'}
                    uploadingLabel={t.uploading || 'Uploading...'}
                  />
                  <FlexInput
                    placeholder={t.badgeImage}
                    value={badgeImageUrl}
                    onChange={(e) => setBadgeImageUrl(e.target.value)}
                  />
                </InlineRow>
              </VerticalStack>
            )}

            {/* Hint */}
            <div>
              <InlineRowGap12>
                <SectionLabelNoMargin>{t.hintLabel}</SectionLabelNoMargin>
                <ToggleButton
                  type="button"
                  selected={hintEnabled}
                  onClick={() => setHintEnabled((v) => !v)}
                >
                  {hintEnabled ? 'ON' : 'OFF'}
                </ToggleButton>
              </InlineRowGap12>
              {hintEnabled && (
                <Input
                  placeholder={t.hintPlaceholder}
                  value={hintText}
                  onChange={(e) => setHintText(e.target.value)}
                />
              )}
            </div>
            {error && <ErrorText>{error}</ErrorText>}
            <FormButtonsRow>
              <PrimaryButton type="submit" disabled={loading || !name.trim()}>
                {loading ? t.creating : t.create}
              </PrimaryButton>
              <OutlineButton type="button" onClick={() => { setShowForm(false); setError(''); }}>
                {t.cancel}
              </OutlineButton>
            </FormButtonsRow>
          </Form>
        </FormCard>
      )}

      {stations.length === 0 ? (
        <EmptyText>{t.noStations}</EmptyText>
      ) : (
        <>
          {/* Desktop table */}
          <DesktopOnly>
            <AdminCardNoPadding>
              <Table>
                <thead>
                  <tr>
                    <th>{t.name}</th>
                    <th>{t.type}</th>
                    <th>{t.created}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {stations.map((station) => (
                    <tr key={station._id}>
                      <td>
                        <CellBold>{station.name}</CellBold>
                        {(station.customer || station.theme) && (
                          <CellMuted style={{ fontSize: 12 }}>
                            {[station.customer, station.theme].filter(Boolean).join(' · ')}
                          </CellMuted>
                        )}
                      </td>
                      <td>
                        <Chip>{typeLabel(station.type)}</Chip>
                      </td>
                      <td><CellMuted>{new Date(station.createdAt).toLocaleDateString()}</CellMuted></td>
                      <CellAlignEnd>
                        <SmallDangerButton
                          confirm={confirmDeleteId === station._id}
                          onClick={(e) => { e.stopPropagation(); handleDelete(station._id); }}
                        >
                          {confirmDeleteId === station._id ? t.confirmDelete : t.delete}
                        </SmallDangerButton>
                      </CellAlignEnd>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </AdminCardNoPadding>
          </DesktopOnly>

          {/* Mobile cards */}
          <HideOnDesktop>
            <MobileCardList>
              {stations.map((station) => (
                <MobileCardItemDefault key={station._id}>
                  <MobileCardHeader>
                    <div>
                      <MobileCardName>{station.name}</MobileCardName>
                      {(station.customer || station.theme) && (
                        <CellMuted style={{ fontSize: 12 }}>
                          {[station.customer, station.theme].filter(Boolean).join(' · ')}
                        </CellMuted>
                      )}
                    </div>
                    <SmallDangerButton
                      confirm={confirmDeleteId === station._id}
                      onClick={() => handleDelete(station._id)}
                    >
                      {confirmDeleteId === station._id ? t.confirmDelete : t.delete}
                    </SmallDangerButton>
                  </MobileCardHeader>
                  <InlineRowGap6>
                    <Chip>{typeLabel(station.type)}</Chip>
                    <MobileCardDate>{new Date(station.createdAt).toLocaleDateString()}</MobileCardDate>
                  </InlineRowGap6>
                </MobileCardItemDefault>
              ))}
            </MobileCardList>
          </HideOnDesktop>
        </>
      )}
    </>
  );
}
