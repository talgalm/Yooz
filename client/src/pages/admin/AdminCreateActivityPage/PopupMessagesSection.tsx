import FileUploadButton from '../../../components/FileUploadButton';
import type { PopupMessage, ModuleItem } from './types';
import {
  SectionLabel,
  VerticalStackGap12,
  PopupCard,
  PopupLabel,
  PopupTitleInput,
  PopupContentInput,
  PopupTinyDangerButton,
  PopupFieldColumn,
  PopupFieldColumnSmall,
  PopupSelect,
  PopupNumberInput,
  TinyLabel,
  AddButtonMt8,
  InlineRowWrap,
  SelectionGroupNoFlex,
  SmallSelectionButton,
} from '../styled';

// ─── Props ───

interface PopupMessagesSectionProps {
  popups: PopupMessage[];
  selectedItems: ModuleItem[];
  onAddPopup: () => void;
  onRemovePopup: (index: number) => void;
  onUpdatePopup: (index: number, field: keyof PopupMessage, value: string | number | boolean) => void;
  t: Record<string, string>;
}

// ─── Component ───

export default function PopupMessagesSection({
  popups,
  selectedItems,
  onAddPopup,
  onRemovePopup,
  onUpdatePopup,
  t,
}: PopupMessagesSectionProps) {
  return (
    <div>
      <SectionLabel>{t.popupMessages}</SectionLabel>
      <VerticalStackGap12>
        {popups.map((popup, i) => (
          <PopupCard key={i} enabled={popup.enabled}>
            {/* Row 1: enabled toggle + title + remove */}
            <InlineRowWrap>
              <PopupLabel>
                <input
                  type="checkbox"
                  checked={popup.enabled}
                  onChange={(e) => onUpdatePopup(i, 'enabled', e.target.checked)}
                />
                {t.popupEnabled}
              </PopupLabel>
              <PopupTitleInput
                placeholder={t.popupTitle}
                value={popup.title}
                onChange={(e) => onUpdatePopup(i, 'title', e.target.value)}
              />
              <PopupTinyDangerButton
                type="button"
                onClick={() => onRemovePopup(i)}
              >
                {t.removePopup}
              </PopupTinyDangerButton>
            </InlineRowWrap>

            {/* Row 2: content type toggle + text or image input */}
            <InlineRowWrap>
              <SelectionGroupNoFlex>
                <SmallSelectionButton
                  type="button"
                  selected={popup.contentType === 'text'}
                  onClick={() => onUpdatePopup(i, 'contentType', 'text')}
                >
                  {t.popupContentText}
                </SmallSelectionButton>
                <SmallSelectionButton
                  type="button"
                  selected={popup.contentType === 'image'}
                  onClick={() => onUpdatePopup(i, 'contentType', 'image')}
                >
                  {t.popupContentImage}
                </SmallSelectionButton>
              </SelectionGroupNoFlex>
              {popup.contentType === 'image' ? (
                <>
                  <FileUploadButton
                    accept="image/*"
                    onUploaded={(url) => onUpdatePopup(i, 'image', url)}
                    label={t.upload}
                    uploadingLabel={t.uploading}
                  />
                  <PopupContentInput
                    placeholder={t.popupImageUrl}
                    value={popup.image}
                    onChange={(e) => onUpdatePopup(i, 'image', e.target.value)}
                  />
                </>
              ) : (
                <PopupContentInput
                  placeholder={t.popupText}
                  value={popup.text}
                  onChange={(e) => onUpdatePopup(i, 'text', e.target.value)}
                />
              )}
            </InlineRowWrap>

            {/* Row 3: trigger + condition */}
            <InlineRowWrap>
              <PopupFieldColumn>
                <TinyLabel>{t.popupTrigger}</TinyLabel>
                <PopupSelect
                  value={popup.triggerPoint}
                  onChange={(e) => onUpdatePopup(i, 'triggerPoint', e.target.value)}
                >
                  <option value="afterLogin">{t.triggerAfterLogin}</option>
                  <option value="beforeItem">{t.triggerBeforeItem}</option>
                  <option value="afterItem">{t.triggerAfterItem}</option>
                  <option value="endOfActivity">{t.triggerEndOfActivity}</option>
                </PopupSelect>
              </PopupFieldColumn>

              {(popup.triggerPoint === 'beforeItem' || popup.triggerPoint === 'afterItem') && (
                <PopupFieldColumnSmall>
                  <TinyLabel>{t.popupItemIndex}</TinyLabel>
                  <PopupNumberInput
                    type="number"
                    value={popup.itemIndex + 1}
                    onChange={(e) => onUpdatePopup(i, 'itemIndex', Math.max(0, Number(e.target.value) - 1))}
                    min={1}
                    max={selectedItems.length || 1}
                  />
                </PopupFieldColumnSmall>
              )}

              <PopupFieldColumn>
                <TinyLabel>{t.popupCondition}</TinyLabel>
                <PopupSelect
                  value={popup.conditionType}
                  onChange={(e) => onUpdatePopup(i, 'conditionType', e.target.value)}
                >
                  <option value="none">{t.conditionNone}</option>
                  <option value="participantCount">{t.conditionParticipantCount}</option>
                </PopupSelect>
              </PopupFieldColumn>

              {popup.conditionType === 'participantCount' && (
                <PopupFieldColumnSmall>
                  <TinyLabel>{t.popupThreshold}</TinyLabel>
                  <PopupNumberInput
                    type="number"
                    value={popup.threshold}
                    onChange={(e) => onUpdatePopup(i, 'threshold', Math.max(1, Number(e.target.value)))}
                    min={1}
                  />
                </PopupFieldColumnSmall>
              )}
            </InlineRowWrap>
          </PopupCard>
        ))}
      </VerticalStackGap12>
      <AddButtonMt8
        type="button"
        onClick={onAddPopup}
      >
        + {t.addPopup}
      </AddButtonMt8>
    </div>
  );
}
