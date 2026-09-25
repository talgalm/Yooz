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

function itemTypeLabel(itemType: ModuleItem['itemType'], t: Record<string, string>): string {
  if (itemType === 'game') return t.popupStepGame;
  if (itemType === 'station') return t.popupStepStation;
  return t.popupStepMission;
}

interface PopupMessagesSectionProps {
  popups: PopupMessage[];
  selectedItems: ModuleItem[];
  onAddPopup: () => void;
  onRemovePopup: (index: number) => void;
  onUpdatePopup: (index: number, field: keyof PopupMessage, value: string | number | boolean) => void;
  t: Record<string, string>;
}

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
              <PopupLabel>
                <input
                  type="checkbox"
                  checked={popup.includeUsername}
                  onChange={(e) => onUpdatePopup(i, 'includeUsername', e.target.checked)}
                />
                {t.popupIncludeUsername}
              </PopupLabel>
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
                <PopupFieldColumn style={{ minWidth: 200, flex: '1 1 220px' }}>
                  <TinyLabel>{t.popupItemIndex}</TinyLabel>
                  {selectedItems.length === 0 ? (
                    <span style={{ fontSize: 13, color: 'var(--mui-palette-text-secondary, #666)' }}>
                      {t.popupNoItemsForTrigger}
                    </span>
                  ) : (
                    <PopupSelect
                      value={String(
                        Math.min(
                          Math.max(0, popup.itemIndex),
                          selectedItems.length - 1,
                        ),
                      )}
                      onChange={(e) => onUpdatePopup(i, 'itemIndex', Number(e.target.value))}
                    >
                      {selectedItems.map((item, idx) => (
                        <option key={`${item.ref}-${idx}`} value={idx}>
                          {idx + 1}. {item.name} ({itemTypeLabel(item.itemType, t)})
                        </option>
                      ))}
                    </PopupSelect>
                  )}
                </PopupFieldColumn>
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
