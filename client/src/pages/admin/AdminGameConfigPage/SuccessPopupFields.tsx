import { styled } from '@mui/material/styles';
import FileUploadButton from '../../../components/FileUploadButton';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './SuccessPopupFields.i18n';
import {
  ScoringRow,
  ScoringLabel,
  ScoringToggleButton,
  VerticalStackGap10,
  FlexInput,
  InlineRow,
  SelectionGroupNoFlex,
  SmallSelectionButton,
} from '../styled';

export interface SuccessPopupDraft {
  title: string;
  contentType: 'text' | 'image' | 'video';
  text: string;
  image: string;
  video: string;
}

const EMPTY_SUCCESS_POPUP: SuccessPopupDraft = { title: '', contentType: 'text', text: '', image: '', video: '' };

export function successPopupDraftFrom(raw: unknown): SuccessPopupDraft | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const saved = raw as Record<string, unknown>;
  const str = (value: unknown) => (typeof value === 'string' ? value : '');
  return {
    title: str(saved.title),
    contentType: saved.contentType === 'image' || saved.contentType === 'video' ? saved.contentType : 'text',
    text: str(saved.text),
    image: str(saved.image),
    video: str(saved.video),
  };
}

export function successPopupToSave(draft?: SuccessPopupDraft) {
  if (!draft) return undefined;
  const filled = draft.contentType === 'image'
    ? !!draft.image.trim()
    : draft.contentType === 'video'
      ? !!draft.video.trim()
      : !!draft.text.trim() || !!draft.title.trim();
  if (!filled) return undefined;
  return {
    ...(draft.title.trim() && { title: draft.title.trim() }),
    contentType: draft.contentType,
    ...(draft.contentType === 'text' && { text: draft.text.trim() }),
    ...(draft.contentType === 'image' && { image: draft.image.trim() }),
    ...(draft.contentType === 'video' && { video: draft.video.trim() }),
  };
}

export function patchSuccessPopup(current: SuccessPopupDraft | undefined, patch: Partial<SuccessPopupDraft> | null) {
  return patch === null ? undefined : { ...(current ?? EMPTY_SUCCESS_POPUP), ...patch };
}

const MediaRow = styled(InlineRow)({ marginBottom: 0 });

export default function SuccessPopupFields({ popup, after, onChange }: {
  popup?: SuccessPopupDraft;
  after: 'question' | 'round';
  onChange: (patch: Partial<SuccessPopupDraft> | null) => void;
}) {
  const t = useTranslations(texts);
  return (
    <>
      <ScoringRow style={{ marginTop: 14 }}>
        <ScoringLabel>{after === 'question' ? t.afterQuestion : t.afterRound}</ScoringLabel>
        <ScoringToggleButton type="button" selected={!!popup} onClick={() => onChange(popup ? null : {})}>
          {popup ? 'ON' : 'OFF'}
        </ScoringToggleButton>
      </ScoringRow>
      {popup && (
        <VerticalStackGap10 style={{ marginTop: 8 }}>
          <FlexInput placeholder={t.title} value={popup.title} onChange={(e) => onChange({ title: e.target.value })} />
          <SelectionGroupNoFlex>
            {(['text', 'image', 'video'] as const).map((kind) => (
              <SmallSelectionButton key={kind} type="button" selected={popup.contentType === kind} onClick={() => onChange({ contentType: kind })}>
                {t[kind]}
              </SmallSelectionButton>
            ))}
          </SelectionGroupNoFlex>
          {popup.contentType === 'text' ? (
            <FlexInput placeholder={t.textPlaceholder} value={popup.text} onChange={(e) => onChange({ text: e.target.value })} />
          ) : (
            <MediaRow>
              <FileUploadButton
                accept={popup.contentType === 'image' ? 'image/*' : 'video/*'}
                onUploaded={(url) => onChange(popup.contentType === 'image' ? { image: url } : { video: url })}
              />
              <FlexInput
                placeholder={popup.contentType === 'image' ? t.imageUrl : t.videoUrl}
                value={popup.contentType === 'image' ? popup.image : popup.video}
                onChange={(e) => onChange(popup.contentType === 'image' ? { image: e.target.value } : { video: e.target.value })}
                dir="ltr"
              />
            </MediaRow>
          )}
          <span style={{ fontSize: 12, color: '#999' }}>{after === 'question' ? t.hintQuestion : t.hintRound}</span>
        </VerticalStackGap10>
      )}
    </>
  );
}
