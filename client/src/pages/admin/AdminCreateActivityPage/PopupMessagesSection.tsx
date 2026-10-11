import FileUploadButton from '../../../components/FileUploadButton';
import { itemDisplayName, type PopupMessage, type ModuleItem } from './types';
import { popupAudienceRoute, popupStationIndex } from './groupRoutes';
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
  onUpdatePopup: (index: number, field: keyof PopupMessage, value: string | number | boolean | string[] | number[]) => void;
  groupNames: string[];
  routeNames: string[];
  routeOrders: number[][];
  groupRoutes: Record<string, number>;
  t: Record<string, string>;
}

export default function PopupMessagesSection({
  popups,
  selectedItems,
  onAddPopup,
  onRemovePopup,
  onUpdatePopup,
  groupNames,
  routeNames,
  routeOrders,
  groupRoutes,
  t,
}: PopupMessagesSectionProps) {
  const stageOrder = (popup: PopupMessage) => {
    const audience = popupAudienceRoute(popup, groupRoutes, routeOrders.length);
    const routeOrder = audience.route !== null ? routeOrders[audience.route] : undefined;
    const order = routeOrder && routeOrder.length === selectedItems.length ? routeOrder : selectedItems.map((_, k) => k);
    return { order, route: routeOrder ? audience.route : null, mixed: audience.mixed };
  };

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

              {(popup.triggerPoint === 'beforeItem' || popup.triggerPoint === 'afterItem') && (() => {
                const stages = stageOrder(popup);
                return (
                  <PopupFieldColumn style={{ minWidth: 200, flex: '1 1 220px' }}>
                    <TinyLabel>
                      {stages.route !== null
                        ? t.popupItemIndexInRoute.replace('{route}', routeNames[stages.route] ?? '')
                        : t.popupItemIndex}
                    </TinyLabel>
                    {selectedItems.length === 0 ? (
                      <span style={{ fontSize: 13, color: 'var(--mui-palette-text-secondary, #666)' }}>
                        {t.popupNoItemsForTrigger}
                      </span>
                    ) : (
                      <PopupSelect
                        value={String(popupStationIndex(popup, selectedItems))}
                        onChange={(e) => onUpdatePopup(i, 'itemIndex', Number(e.target.value))}
                      >
                        {stages.order.map((idx, pos) => (
                          <option key={`${selectedItems[idx].ref}-${idx}`} value={idx}>
                            {pos + 1}. {itemDisplayName(selectedItems[idx])} ({itemTypeLabel(selectedItems[idx].itemType, t)})
                          </option>
                        ))}
                      </PopupSelect>
                    )}
                    {stages.mixed && <TinyLabel>{t.popupItemIndexMixed}</TinyLabel>}
                  </PopupFieldColumn>
                );
              })()}

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
            {groupNames.length > 0 && (
              <PopupFieldColumn>
                <TinyLabel>{t.popupAudience}</TinyLabel>
                <SelectionGroupNoFlex>
                  <SmallSelectionButton
                    type="button"
                    selected={popup.groups.length === 0 && popup.routes.length === 0}
                    onClick={() => { onUpdatePopup(i, 'groups', []); onUpdatePopup(i, 'routes', []); }}
                  >
                    {t.popupAudienceAll}
                  </SmallSelectionButton>
                  {routeNames.map((route, r) => (
                    <SmallSelectionButton
                      key={`route-${r}`}
                      type="button"
                      selected={popup.routes.includes(r)}
                      onClick={() => onUpdatePopup(
                        i,
                        'routes',
                        popup.routes.includes(r) ? popup.routes.filter((x) => x !== r) : [...popup.routes, r],
                      )}
                    >
                      {route}
                    </SmallSelectionButton>
                  ))}
                  {groupNames.map((group) => (
                    <SmallSelectionButton
                      key={group}
                      type="button"
                      selected={popup.groups.includes(group)}
                      onClick={() => onUpdatePopup(
                        i,
                        'groups',
                        popup.groups.includes(group) ? popup.groups.filter((g) => g !== group) : [...popup.groups, group],
                      )}
                    >
                      {group}
                    </SmallSelectionButton>
                  ))}
                </SelectionGroupNoFlex>
              </PopupFieldColumn>
            )}
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
