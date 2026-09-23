import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './AdminMissionConfigPage.i18n';
import { adminApiFetch } from '../../../utils/adminApi';
import EditOnly from '../../../components/EditOnly';
import FileUploadButton from '../../../components/FileUploadButton';
import {
  AdminPage,
  AdminHeader,
  AdminContent,
  AdminCard,
  PrimaryButton,
  Input,
  OutlineButton,
  ErrorText,
} from '../../../components/styled';
import {
  PageTitle,
  SectionTitle,
  SectionLabel,
} from '../styled';
import { styled } from '@mui/material/styles';

// ─── Types ───

interface MissionScreen {
  header: string;
  description: string;
  buttonText: string;
  image: string;
  backgroundImage: string;
}

interface PuzzleConfig {
  completeHeader: string;
  completeButton: string;
}

interface TrashSortConfig {
  title: string;
  description: string;
  scoreLabel: string;
  gameFinalText: string;
  completeHeader: string;
  completeButton: string;
  badgeHeader: string;
  badgeCurveText: string;
  badgeAwardText: string;
  badgeAchievementText: string;
  shareButton: string;
  continueButton: string;
}

interface MissionData {
  _id?: string;
  name: string;
  description?: string;
  customer?: string;
  explanationScreens: MissionScreen[];
  puzzleConfig?: Partial<PuzzleConfig>;
  trashSortConfig?: Partial<TrashSortConfig>;
}

// ─── Preset backgrounds ───

const PRESET_BACKGROUNDS = [
  { key: 'bg1', url: '/images/mission-bg-1.svg', label: 'Park' },
  { key: 'bg23', url: '/images/mission-bg-23.svg', label: 'Suitcase' },
  { key: 'blur', url: '/images/mission-bg-blur.svg', label: 'Blur' },
];

// ─── Styled ───

const FormSection = styled('div')({
  marginBottom: 32,
});

const ScreenCard = styled('div')({
  background: '#f8f7ff',
  border: '1.5px solid #e0ddf5',
  borderRadius: 16,
  padding: 24,
  marginBottom: 16,
});

const ScreenTitle = styled('div')({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 16,
});

const ScreenBadge = styled('span')({
  display: 'inline-block',
  padding: '4px 12px',
  fontSize: 13,
  fontWeight: 700,
  borderRadius: 20,
  background: '#751CA1',
  color: '#fff',
});

const TextArea = styled('textarea')({
  width: '100%',
  padding: '14px 16px',
  fontSize: 16,
  border: '2px solid #e0e0e0',
  borderRadius: 12,
  outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box',
  background: '#fafafa',
  fontFamily: 'inherit',
  resize: 'vertical',
  minHeight: 100,
  '&:focus': {
    borderColor: '#6c5ce7',
    background: '#fff',
  },
});

const FieldGroup = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  marginBottom: 12,
});

const ActionRow = styled('div')({
  display: 'flex',
  gap: 12,
  justifyContent: 'flex-end',
  marginTop: 24,
  flexWrap: 'wrap',
});

const ImageRow = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
});

const ImagePreview = styled('img')({
  width: 60,
  height: 60,
  objectFit: 'contain',
  borderRadius: 8,
  border: '1px solid #e0e0e0',
  background: '#fff',
});

const RemoveImageBtn = styled('button')({
  padding: '4px 10px',
  fontSize: 12,
  border: '1px solid #e0e0e0',
  borderRadius: 6,
  background: '#fff',
  color: '#e74c3c',
  cursor: 'pointer',
  '&:hover': { background: '#ffeaea' },
});

// Background picker
const BgPickerRow = styled('div')({
  display: 'flex',
  gap: 10,
  alignItems: 'center',
  flexWrap: 'wrap',
});

const BgPresetThumb = styled('div')<{ selected?: boolean }>(({ selected }) => ({
  width: 56,
  height: 100,
  borderRadius: 8,
  border: selected ? '3px solid #6c5ce7' : '2px solid #e0e0e0',
  cursor: 'pointer',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  transition: 'border-color 0.2s, transform 0.15s',
  transform: selected ? 'scale(1.05)' : 'scale(1)',
  '&:hover': {
    borderColor: '#6c5ce7',
  },
}));

const BgNoneThumb = styled('div')<{ selected?: boolean }>(({ selected }) => ({
  width: 56,
  height: 100,
  borderRadius: 8,
  border: selected ? '3px solid #6c5ce7' : '2px dashed #ccc',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 11,
  color: '#999',
  background: '#f5f5f5',
  transition: 'border-color 0.2s',
  '&:hover': {
    borderColor: '#6c5ce7',
  },
}));

const BgCustomThumb = styled('div')<{ selected?: boolean }>(({ selected }) => ({
  width: 56,
  height: 100,
  borderRadius: 8,
  border: selected ? '3px solid #6c5ce7' : '2px solid #e0e0e0',
  cursor: 'pointer',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  position: 'relative',
  overflow: 'hidden',
}));

const PreviewBox = styled('div')<{ bgUrl?: string }>(({ bgUrl }) => ({
  borderRadius: 16,
  padding: '24px 20px',
  color: '#F2F7FF',
  textAlign: 'center',
  maxWidth: 360,
  minHeight: 300,
  margin: '0 auto 16px',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'space-between',
  overflow: 'hidden',
  fontFamily: "'Rubik One', sans-serif",
  // Background layers: background image behind, frame on top
  background: bgUrl
    ? `url(/images/mission-frame.svg) center/cover no-repeat, url(${bgUrl}) center/cover no-repeat, #1a0a2e`
    : `url(/images/mission-frame.svg) center/cover no-repeat, #1a0a2e`,
}));

const PreviewOverlay = styled('img')({
  position: 'absolute',
  left: 0,
  width: '100%',
  pointerEvents: 'none',
  zIndex: 1,
});

const PreviewHeader = styled('div')({
  fontSize: 18,
  fontWeight: 700,
  padding: '10px 14px',
  width: '90%',
  fontFamily: "'Rubik One', sans-serif",
});

const PreviewDescription = styled('div')({
  fontSize: 13,
  lineHeight: 1.6,
  whiteSpace: 'pre-line',
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  padding: '8px 0',
  fontFamily: "'Rubik One', sans-serif",
  fontWeight: 400,
});

const PreviewScreenImage = styled('img')({
  width: 80,
  height: 80,
  objectFit: 'contain',
});

const PreviewButton = styled('div')({
  display: 'inline-block',
  padding: '10px 28px',
  background: '#39CABC',
  borderRadius: 30,
  fontWeight: 300,
  fontSize: 14,
  marginBottom: 8,
  fontFamily: "'Rubik One', sans-serif",
});

// ─── Default screens ───

const EMPTY_SCREEN: MissionScreen = { header: '', description: '', buttonText: '', image: '', backgroundImage: '' };

const DEFAULT_SCREENS: MissionScreen[] = [
  { ...EMPTY_SCREEN },
  { ...EMPTY_SCREEN },
  { ...EMPTY_SCREEN },
];

const DEFAULT_PUZZLE: PuzzleConfig = {
  completeHeader: 'כל הכבוד!',
  completeButton: 'לשלב הבא',
};

const DEFAULT_TRASH: TrashSortConfig = {
  title: 'איך משחקים?',
  description: 'עכשיו התמונה ברורה, אבל הזבל עדיין\nמסתיר את האות!\n\nליחצו על הפח הנכון עבור סוג\nהאשפה.',
  scoreLabel: 'ניקוד:',
  gameFinalText: 'כל הכבוד!',
  completeHeader: 'תודה!',
  completeButton: 'לקבלת תג',
  badgeHeader: 'תעלומת המזוודה הסודית',
  badgeCurveText: 'תג סוכן הפארק',
  badgeAwardText: 'מוענק בזאת',
  badgeAchievementText: 'על מציאת המזוודה והצלת הפארק!',
  shareButton: 'שתפו עם חברים',
  continueButton: 'המשך',
};

// ─── Component ───

export default function AdminMissionConfigPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;
  const t = useTranslations(texts);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [customer, setCustomer] = useState('');
  const [screens, setScreens] = useState<MissionScreen[]>(DEFAULT_SCREENS.map((s) => ({ ...s })));
  const [puzzleConfig, setPuzzleConfig] = useState<PuzzleConfig>({ ...DEFAULT_PUZZLE });
  const [trashSortConfig, setTrashSortConfig] = useState<TrashSortConfig>({ ...DEFAULT_TRASH });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(isEdit);

  // Load existing mission for edit
  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      try {
        const data = await adminApiFetch<{ mission: MissionData }>(`/api/admin/missions/${id}`);
        const m = data.mission;
        setName(m.name);
        setDescription(m.description || '');
        setCustomer(m.customer || '');
        if (m.explanationScreens.length > 0) {
          setScreens(m.explanationScreens.map((s) => ({
            header: s.header || '',
            description: s.description || '',
            buttonText: s.buttonText || '',
            image: s.image || '',
            backgroundImage: s.backgroundImage || '',
          })));
        }
        setPuzzleConfig({
          completeHeader: m.puzzleConfig?.completeHeader || DEFAULT_PUZZLE.completeHeader,
          completeButton: m.puzzleConfig?.completeButton || DEFAULT_PUZZLE.completeButton,
        });
        setTrashSortConfig({
          title: m.trashSortConfig?.title || DEFAULT_TRASH.title,
          description: m.trashSortConfig?.description || DEFAULT_TRASH.description,
          scoreLabel: m.trashSortConfig?.scoreLabel || DEFAULT_TRASH.scoreLabel,
          gameFinalText: m.trashSortConfig?.gameFinalText || DEFAULT_TRASH.gameFinalText,
          completeHeader: m.trashSortConfig?.completeHeader || DEFAULT_TRASH.completeHeader,
          completeButton: m.trashSortConfig?.completeButton || DEFAULT_TRASH.completeButton,
          badgeHeader: m.trashSortConfig?.badgeHeader || DEFAULT_TRASH.badgeHeader,
          badgeCurveText: m.trashSortConfig?.badgeCurveText || DEFAULT_TRASH.badgeCurveText,
          badgeAwardText: m.trashSortConfig?.badgeAwardText || DEFAULT_TRASH.badgeAwardText,
          badgeAchievementText: m.trashSortConfig?.badgeAchievementText || DEFAULT_TRASH.badgeAchievementText,
          shareButton: m.trashSortConfig?.shareButton || DEFAULT_TRASH.shareButton,
          continueButton: m.trashSortConfig?.continueButton || DEFAULT_TRASH.continueButton,
        });
      } catch {
        setError(t.errorLoad);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isEdit, t.errorLoad]);

  const updateScreen = (index: number, field: keyof MissionScreen, value: string) => {
    setScreens((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addScreen = () => {
    setScreens((prev) => [...prev, { ...EMPTY_SCREEN }]);
  };

  const removeScreen = (index: number) => {
    if (screens.length <= 1) return;
    setScreens((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setError('');

    if (!name.trim()) {
      setError(t.errorName);
      return;
    }

    setSaving(true);
    try {
      // Clean up screens: send fields only if non-empty
      const cleanScreens = screens.map((s) => ({
        header: s.header.trim() || undefined,
        description: s.description.trim() || undefined,
        buttonText: s.buttonText.trim() || undefined,
        image: s.image.trim() || undefined,
        backgroundImage: s.backgroundImage.trim() || undefined,
      }));

      const cleanPuzzle = {
        completeHeader: puzzleConfig.completeHeader.trim() || DEFAULT_PUZZLE.completeHeader,
        completeButton: puzzleConfig.completeButton.trim() || DEFAULT_PUZZLE.completeButton,
      };
      const cleanTrash = {
        title: trashSortConfig.title.trim() || DEFAULT_TRASH.title,
        description: trashSortConfig.description.trim() || DEFAULT_TRASH.description,
        scoreLabel: trashSortConfig.scoreLabel.trim() || DEFAULT_TRASH.scoreLabel,
        gameFinalText: trashSortConfig.gameFinalText.trim() || DEFAULT_TRASH.gameFinalText,
        completeHeader: trashSortConfig.completeHeader.trim() || DEFAULT_TRASH.completeHeader,
        completeButton: trashSortConfig.completeButton.trim() || DEFAULT_TRASH.completeButton,
        badgeHeader: trashSortConfig.badgeHeader.trim() || DEFAULT_TRASH.badgeHeader,
        badgeCurveText: trashSortConfig.badgeCurveText.trim() || DEFAULT_TRASH.badgeCurveText,
        badgeAwardText: trashSortConfig.badgeAwardText.trim() || DEFAULT_TRASH.badgeAwardText,
        badgeAchievementText: trashSortConfig.badgeAchievementText.trim() || DEFAULT_TRASH.badgeAchievementText,
        shareButton: trashSortConfig.shareButton.trim() || DEFAULT_TRASH.shareButton,
        continueButton: trashSortConfig.continueButton.trim() || DEFAULT_TRASH.continueButton,
      };

      const payload: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || undefined,
        customer: customer.trim() || undefined,
        explanationScreens: cleanScreens,
        puzzleConfig: cleanPuzzle,
        trashSortConfig: cleanTrash,
      };

      if (isEdit) {
        await adminApiFetch(`/api/admin/missions/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await adminApiFetch('/api/admin/missions', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      navigate('/admin/dashboard?tab=stations');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save mission');
    } finally {
      setSaving(false);
    }
  };

  // Check if a background is a custom upload (not a preset)
  const isCustomBg = (url: string) => {
    if (!url) return false;
    return !PRESET_BACKGROUNDS.some((p) => p.url === url);
  };

  if (loading) {
    return (
      <AdminPage>
        <AdminHeader>
          <img src="/images/logo-purple.png" alt="Yooz" style={{ height: 32 }} />
        </AdminHeader>
        <AdminContent>
          <div style={{ textAlign: 'center', padding: 40 }}>{t.loading}</div>
        </AdminContent>
      </AdminPage>
    );
  }

  return (
    <AdminPage>
      <AdminHeader>
        <img src="/images/logo-purple.png" alt="Yooz" style={{ height: 32 }} />
        <OutlineButton onClick={() => navigate('/admin/dashboard?tab=stations')}>{t.back}</OutlineButton>
      </AdminHeader>
      <AdminContent>
        <PageTitle>{isEdit ? t.editTitle : t.createTitle}</PageTitle>

        <AdminCard>
          {/* Basic Info */}
          <FormSection>
            <SectionTitle>{t.basicInfo}</SectionTitle>
            <FieldGroup>
              <SectionLabel>{t.missionName}</SectionLabel>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.missionNamePlaceholder}
                style={{ direction: 'rtl' }}
              />
            </FieldGroup>
            <FieldGroup>
              <SectionLabel>{t.description}</SectionLabel>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.descriptionPlaceholder}
                style={{ direction: 'rtl' }}
              />
            </FieldGroup>
            <FieldGroup>
              <SectionLabel>{t.customer}</SectionLabel>
              <Input
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder={t.customerPlaceholder}
              />
            </FieldGroup>
          </FormSection>

          {/* Explanation Screens (Part 1) */}
          <FormSection>
            <SectionTitle>{t.part1Title}</SectionTitle>
            <SectionLabel style={{ marginBottom: 16 }}>
              {t.part1Desc}
            </SectionLabel>

            {screens.map((screen, index) => (
              <ScreenCard key={index}>
                <ScreenTitle>
                  <ScreenBadge>{t.screen} {index + 1}</ScreenBadge>
                  {screens.length > 1 && (
                    <OutlineButton onClick={() => removeScreen(index)} style={{ fontSize: 12, padding: '4px 10px' }}>
                      {t.remove}
                    </OutlineButton>
                  )}
                </ScreenTitle>

                {/* Background image picker */}
                <FieldGroup>
                  <SectionLabel>{t.backgroundImage}</SectionLabel>
                  <BgPickerRow>
                    {/* No background option */}
                    <BgNoneThumb
                      selected={!screen.backgroundImage}
                      onClick={() => updateScreen(index, 'backgroundImage', '')}
                    >
                      {t.none}
                    </BgNoneThumb>

                    {/* Preset backgrounds */}
                    {PRESET_BACKGROUNDS.map((preset) => (
                      <BgPresetThumb
                        key={preset.key}
                        selected={screen.backgroundImage === preset.url}
                        style={{ backgroundImage: `url(${preset.url})` }}
                        onClick={() => updateScreen(index, 'backgroundImage', preset.url)}
                        title={preset.label}
                      />
                    ))}

                    {/* Custom uploaded background */}
                    {isCustomBg(screen.backgroundImage) && (
                      <BgCustomThumb
                        selected
                        style={{ backgroundImage: `url(${screen.backgroundImage})` }}
                      />
                    )}

                    {/* Upload custom background */}
                    <FileUploadButton
                      accept="image/*"
                      onUploaded={(url) => updateScreen(index, 'backgroundImage', url)}
                      label={t.uploadBg}
                      uploadingLabel={t.uploading}
                    />
                  </BgPickerRow>
                </FieldGroup>

                <FieldGroup>
                  <SectionLabel>{t.headerText}</SectionLabel>
                  <Input
                    value={screen.header}
                    onChange={(e) => updateScreen(index, 'header', e.target.value)}
                    placeholder={t.headerPlaceholder}
                    style={{ direction: 'rtl' }}
                  />
                </FieldGroup>

                <FieldGroup>
                  <SectionLabel>{t.descriptionField}</SectionLabel>
                  <TextArea
                    value={screen.description}
                    onChange={(e) => updateScreen(index, 'description', e.target.value)}
                    placeholder={t.descriptionFieldPlaceholder}
                  />
                </FieldGroup>

                <FieldGroup>
                  <SectionLabel>{t.buttonText}</SectionLabel>
                  <Input
                    value={screen.buttonText}
                    onChange={(e) => updateScreen(index, 'buttonText', e.target.value)}
                    placeholder={t.buttonPlaceholder}
                    style={{ direction: 'rtl' }}
                  />
                </FieldGroup>

                <FieldGroup>
                  <SectionLabel>{t.screenImage}</SectionLabel>
                  <ImageRow>
                    <FileUploadButton
                      accept="image/*"
                      onUploaded={(url) => updateScreen(index, 'image', url)}
                      label={t.uploadImage}
                      uploadingLabel={t.uploading}
                    />
                    {screen.image && (
                      <>
                        <ImagePreview src={screen.image} alt="" />
                        <RemoveImageBtn onClick={() => updateScreen(index, 'image', '')}>
                          {t.remove}
                        </RemoveImageBtn>
                      </>
                    )}
                  </ImageRow>
                </FieldGroup>

                {/* Live preview */}
                {(screen.header || screen.description || screen.buttonText || screen.image || screen.backgroundImage) && (
                  <PreviewBox bgUrl={screen.backgroundImage || undefined}>
                    <PreviewOverlay src="/images/mission-header.svg" alt="" style={{ top: 0 }} />
                    <PreviewOverlay src="/images/mission-footer.svg" alt="" style={{ bottom: 0, top: 'auto' }} />
                    <div style={{ position: 'relative', zIndex: 2, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', flex: 1, gap: 8 }}>
                      {screen.header && <PreviewHeader>{screen.header}</PreviewHeader>}
                      {screen.description && <PreviewDescription>{screen.description}</PreviewDescription>}
                      {screen.image && <PreviewScreenImage src={screen.image} alt="" />}
                      {screen.buttonText && <PreviewButton>{screen.buttonText}</PreviewButton>}
                    </div>
                  </PreviewBox>
                )}
              </ScreenCard>
            ))}

            <OutlineButton onClick={addScreen} style={{ width: '100%', textAlign: 'center' }}>
              {t.addScreen}
            </OutlineButton>
          </FormSection>

          {/* Part 2 — Puzzle */}
          <FormSection>
            <SectionTitle>{t.part2Title}</SectionTitle>
            <SectionLabel style={{ marginBottom: 16 }}>{t.part2Desc}</SectionLabel>
            <FieldGroup>
              <SectionLabel>{t.puzzleCompleteHeader}</SectionLabel>
              <Input
                value={puzzleConfig.completeHeader}
                onChange={(e) => setPuzzleConfig((p) => ({ ...p, completeHeader: e.target.value }))}
                placeholder={t.puzzleCompleteHeaderPlaceholder}
                style={{ direction: 'rtl' }}
              />
            </FieldGroup>
            <FieldGroup>
              <SectionLabel>{t.puzzleCompleteButton}</SectionLabel>
              <Input
                value={puzzleConfig.completeButton}
                onChange={(e) => setPuzzleConfig((p) => ({ ...p, completeButton: e.target.value }))}
                placeholder={t.puzzleCompleteButtonPlaceholder}
                style={{ direction: 'rtl' }}
              />
            </FieldGroup>
          </FormSection>

          {/* Part 3 — Trash Sort */}
          <FormSection>
            <SectionTitle>{t.part3Title}</SectionTitle>
            <SectionLabel style={{ marginBottom: 16 }}>{t.part3Desc}</SectionLabel>
            <FieldGroup>
              <SectionLabel>{t.trashIntroTitle}</SectionLabel>
              <Input
                value={trashSortConfig.title}
                onChange={(e) => setTrashSortConfig((p) => ({ ...p, title: e.target.value }))}
                placeholder={t.trashIntroTitlePlaceholder}
                style={{ direction: 'rtl' }}
              />
            </FieldGroup>
            <FieldGroup>
              <SectionLabel>{t.trashIntroDescription}</SectionLabel>
              <TextArea
                value={trashSortConfig.description}
                onChange={(e) => setTrashSortConfig((p) => ({ ...p, description: e.target.value }))}
                placeholder={t.trashIntroDescriptionPlaceholder}
              />
            </FieldGroup>
            <FieldGroup>
              <SectionLabel>{t.trashScoreLabel}</SectionLabel>
              <Input
                value={trashSortConfig.scoreLabel}
                onChange={(e) => setTrashSortConfig((p) => ({ ...p, scoreLabel: e.target.value }))}
                placeholder={t.trashScoreLabelPlaceholder}
                style={{ direction: 'rtl' }}
              />
            </FieldGroup>
            <FieldGroup>
              <SectionLabel>{t.trashGameFinalText}</SectionLabel>
              <Input
                value={trashSortConfig.gameFinalText}
                onChange={(e) => setTrashSortConfig((p) => ({ ...p, gameFinalText: e.target.value }))}
                placeholder={t.trashGameFinalTextPlaceholder}
                style={{ direction: 'rtl' }}
              />
            </FieldGroup>
            <FieldGroup>
              <SectionLabel>{t.trashCompleteHeader}</SectionLabel>
              <Input
                value={trashSortConfig.completeHeader}
                onChange={(e) => setTrashSortConfig((p) => ({ ...p, completeHeader: e.target.value }))}
                placeholder={t.trashCompleteHeaderPlaceholder}
                style={{ direction: 'rtl' }}
              />
            </FieldGroup>
            <FieldGroup>
              <SectionLabel>{t.trashCompleteButton}</SectionLabel>
              <Input
                value={trashSortConfig.completeButton}
                onChange={(e) => setTrashSortConfig((p) => ({ ...p, completeButton: e.target.value }))}
                placeholder={t.trashCompleteButtonPlaceholder}
                style={{ direction: 'rtl' }}
              />
            </FieldGroup>
            <FieldGroup>
              <SectionLabel>{t.trashBadgeHeader}</SectionLabel>
              <Input
                value={trashSortConfig.badgeHeader}
                onChange={(e) => setTrashSortConfig((p) => ({ ...p, badgeHeader: e.target.value }))}
                placeholder={t.trashBadgeHeaderPlaceholder}
                style={{ direction: 'rtl' }}
              />
            </FieldGroup>
            <FieldGroup>
              <SectionLabel>{t.trashBadgeCurveText}</SectionLabel>
              <Input
                value={trashSortConfig.badgeCurveText}
                onChange={(e) => setTrashSortConfig((p) => ({ ...p, badgeCurveText: e.target.value }))}
                placeholder={t.trashBadgeCurveTextPlaceholder}
                style={{ direction: 'rtl' }}
              />
            </FieldGroup>
            <FieldGroup>
              <SectionLabel>{t.trashBadgeAwardText}</SectionLabel>
              <Input
                value={trashSortConfig.badgeAwardText}
                onChange={(e) => setTrashSortConfig((p) => ({ ...p, badgeAwardText: e.target.value }))}
                placeholder={t.trashBadgeAwardTextPlaceholder}
                style={{ direction: 'rtl' }}
              />
            </FieldGroup>
            <FieldGroup>
              <SectionLabel>{t.trashBadgeAchievementText}</SectionLabel>
              <Input
                value={trashSortConfig.badgeAchievementText}
                onChange={(e) => setTrashSortConfig((p) => ({ ...p, badgeAchievementText: e.target.value }))}
                placeholder={t.trashBadgeAchievementTextPlaceholder}
                style={{ direction: 'rtl' }}
              />
            </FieldGroup>
            <FieldGroup>
              <SectionLabel>{t.trashShareButton}</SectionLabel>
              <Input
                value={trashSortConfig.shareButton}
                onChange={(e) => setTrashSortConfig((p) => ({ ...p, shareButton: e.target.value }))}
                placeholder={t.trashShareButtonPlaceholder}
                style={{ direction: 'rtl' }}
              />
            </FieldGroup>
            <FieldGroup>
              <SectionLabel>{t.trashContinueButton}</SectionLabel>
              <Input
                value={trashSortConfig.continueButton}
                onChange={(e) => setTrashSortConfig((p) => ({ ...p, continueButton: e.target.value }))}
                placeholder={t.trashContinueButtonPlaceholder}
                style={{ direction: 'rtl' }}
              />
            </FieldGroup>
          </FormSection>

          {error && <ErrorText style={{ marginBottom: 12 }}>{error}</ErrorText>}

          <ActionRow>
            <OutlineButton onClick={() => navigate('/admin/dashboard?tab=stations')}>{t.cancel}</OutlineButton>
            <EditOnly notice>
              <PrimaryButton onClick={handleSave} disabled={saving} style={{ width: 'auto', padding: '12px 32px' }}>
                {saving ? t.saving : isEdit ? t.updateMission : t.createMission}
              </PrimaryButton>
            </EditOnly>
          </ActionRow>
        </AdminCard>
      </AdminContent>
    </AdminPage>
  );
}
