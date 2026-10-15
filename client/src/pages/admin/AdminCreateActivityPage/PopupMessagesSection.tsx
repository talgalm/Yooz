import { useState } from 'react';
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
  PopupFieldGrid,
  PopupAudiencePill,
  PopupPillCount,
  PopupSelect,
  PopupNumberInput,
  TinyLabel,
  AddButtonMt8,
  InlineRowWrap,
  SelectionGroupNoFlex,
  SelectionGroupWrap,
  SmallSelectionButton,
} from '../styled';

function itemTypeLabel(itemType: ModuleItem['itemType'], t: Record<string, string>): string {
  if (itemType === 'game') return t.popupStepGame;
  if (itemType === 'station') return t.popupStepStation;
  return t.popupStepMission;
}

export interface PopupAudience {
  groups: string[];
  routes: number[];
}

const EVERYONE: PopupAudience = { groups: [], routes: [] };

const BUILT_IN_POPUP_SOUNDS = [
  { path: '/sounds/success.wav', label: 'popupSoundSuccess' },
  { path: '/sounds/complete.wav', label: 'popupSoundComplete' },
  { path: '/sounds/applause.mp3', label: 'popupSoundApplause' },
] as const;

export function isBuiltInPopupSound(sound: string): boolean {
  return BUILT_IN_POPUP_SOUNDS.some((s) => s.path === sound);
}

function previewSound(sound: string) {
  new Audio(sound).play().catch(() => undefined);
}

function isForEveryone(popup: PopupMessage): boolean {
  return popup.groups.length === 0 && popup.routes.length === 0;
}

function AudiencePill({ label, count, selected, onClick }: { label: string; count: number; selected: boolean; onClick: () => void }) {
  return (
    <PopupAudiencePill type="button" selected={selected} aria-pressed={selected} onClick={onClick}>
      {label}
      {count > 0 && <PopupPillCount onPurple={selected}>{count}</PopupPillCount>}
    </PopupAudiencePill>
  );
}

interface PopupMessagesSectionProps {
  popups: PopupMessage[];
  selectedItems: ModuleItem[];
  onAddPopup: (audience: PopupAudience) => void;
  onRemovePopup: (index: number) => void;
  onUpdatePopup: (index: number, field: keyof PopupMessage, value: string | number | boolean | string[] | number[]) => void;
  groupNames: string[];
  routeNames: string[];
  routeOrders: number[][];
  groupRoutes: Record<string, number>;
  isMap: boolean;
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
  isMap,
  t,
}: PopupMessagesSectionProps) {
  const [picked, setPicked] = useState<PopupAudience>(EVERYONE);
  const audience: PopupAudience = {
    groups: picked.groups.filter((g) => groupNames.includes(g)),
    routes: picked.routes.filter((r) => r < routeNames.length),
  };
  const hasAudiences = groupNames.length > 0 || routeNames.length > 0;
  const forEveryone = audience.groups.length === 0 && audience.routes.length === 0;
  const pickedNames = [...audience.routes.map((r) => routeNames[r]), ...audience.groups];

  const toggleRoute = (r: number) => setPicked({
    ...audience,
    routes: audience.routes.includes(r) ? audience.routes.filter((x) => x !== r) : [...audience.routes, r],
  });
  const toggleGroup = (g: string) => setPicked({
    ...audience,
    groups: audience.groups.includes(g) ? audience.groups.filter((x) => x !== g) : [...audience.groups, g],
  });

  const reaches = (popup: PopupMessage, pick: PopupAudience) => isForEveryone(popup)
    || popup.groups.some((g) => pick.groups.includes(g))
    || popup.routes.some((r) => pick.routes.includes(r) || pick.groups.some((g) => groupRoutes[g] === r));
  const listedFor = (pick: PopupAudience) => popups.filter((popup) => {
    if (!hasAudiences) return true;
    if (pick.groups.length === 0 && pick.routes.length === 0) return isForEveryone(popup);
    return reaches(popup, pick);
  });

  const listed = new Set(listedFor(audience));
  const shown = popups.map((popup, i) => ({ popup, i })).filter(({ popup }) => listed.has(popup));

  const audienceNote = (popup: PopupMessage): string | null => {
    if (forEveryone) return null;
    if (isForEveryone(popup)) return t.popupForEveryoneNote;
    const others = [
      ...popup.routes.filter((r) => r < routeNames.length && !audience.routes.includes(r)).map((r) => routeNames[r]),
      ...popup.groups.filter((g) => !audience.groups.includes(g)),
    ];
    return others.length > 0 ? t.popupAlsoFor.replace('{names}', others.join(', ')) : null;
  };

  const stageOrder = (popup: PopupMessage) => {
    const walked = popupAudienceRoute(popup, groupRoutes, routeOrders.length);
    const routeOrder = walked.route !== null ? routeOrders[walked.route] : undefined;
    const order = routeOrder && routeOrder.length === selectedItems.length ? routeOrder : selectedItems.map((_, k) => k);
    return { order, route: routeOrder ? walked.route : null, mixed: walked.mixed };
  };

  return (
    <div>
      <SectionLabel>{t.popupMessages}</SectionLabel>
      {hasAudiences && (
        <SelectionGroupWrap style={{ marginBottom: 12 }}>
          <AudiencePill
            label={t.popupAudienceAll}
            count={listedFor(EVERYONE).length}
            selected={forEveryone}
            onClick={() => setPicked(EVERYONE)}
          />
          {routeNames.map((name, r) => (
            <AudiencePill
              key={`route-${r}`}
              label={name}
              count={listedFor({ groups: [], routes: [r] }).length}
              selected={audience.routes.includes(r)}
              onClick={() => toggleRoute(r)}
            />
          ))}
          {groupNames.map((group) => (
            <AudiencePill
              key={group}
              label={group}
              count={listedFor({ groups: [group], routes: [] }).length}
              selected={audience.groups.includes(group)}
              onClick={() => toggleGroup(group)}
            />
          ))}
        </SelectionGroupWrap>
      )}
      <VerticalStackGap12>
        {shown.length === 0 && (
          <span style={{ fontSize: 13, color: 'var(--mui-palette-text-secondary, #666)' }}>{t.popupsEmpty}</span>
        )}
        {shown.map(({ popup, i }) => {
          const note = audienceNote(popup);
          const isItemTrigger = popup.triggerPoint === 'beforeItem' || popup.triggerPoint === 'afterItem';
          const stages = stageOrder(popup);
          const byStep = popup.byStep === true;
          const stationIndex = popupStationIndex(popup, selectedItems);
          const step = Math.min(Math.max(0, popup.itemIndex), Math.max(0, selectedItems.length - 1));
          const stepStationsKnown = stages.route !== null || routeNames.length === 0;
          const tieTo = (toStep: boolean) => {
            if (toStep === byStep) return;
            onUpdatePopup(i, 'byStep', toStep);
            onUpdatePopup(i, 'itemIndex', toStep ? Math.max(0, stages.order.indexOf(stationIndex)) : stages.order[step] ?? 0);
          };
          const stepName = (idx: number, pos: number) =>
            `${pos + 1}. ${itemDisplayName(selectedItems[idx])} (${itemTypeLabel(selectedItems[idx].itemType, t)})`;
          const hint = !isItemTrigger
            ? null
            : byStep
              ? (stepStationsKnown ? null : t.popupStepAnyRoute)
              : (stages.mixed ? t.popupItemIndexMixed : null);

          return (
            <PopupCard key={i}>
              <InlineRowWrap style={{ alignItems: 'stretch' }}>
                <PopupTitleInput
                  placeholder={t.popupTitle}
                  value={popup.title}
                  onChange={(e) => onUpdatePopup(i, 'title', e.target.value)}
                />
                <PopupTinyDangerButton type="button" onClick={() => onRemovePopup(i)}>
                  {t.removePopup}
                </PopupTinyDangerButton>
              </InlineRowWrap>
              {note && <TinyLabel>{note}</TinyLabel>}

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
                  <SmallSelectionButton
                    type="button"
                    selected={popup.contentType === 'video'}
                    onClick={() => onUpdatePopup(i, 'contentType', 'video')}
                  >
                    {t.popupContentVideo}
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
                ) : popup.contentType === 'video' ? (
                  <>
                    <FileUploadButton
                      accept="video/*"
                      onUploaded={(url) => onUpdatePopup(i, 'video', url)}
                      label={t.upload}
                      uploadingLabel={t.uploading}
                    />
                    <PopupContentInput
                      placeholder={t.popupVideoUrl}
                      value={popup.video}
                      onChange={(e) => onUpdatePopup(i, 'video', e.target.value)}
                      dir="ltr"
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

              <PopupFieldGrid>
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

                {isItemTrigger && (routeNames.length > 0 || byStep) && (
                  <PopupFieldColumn>
                    <TinyLabel>{t.popupAnchor}</TinyLabel>
                    <PopupSelect value={byStep ? 'step' : 'station'} onChange={(e) => tieTo(e.target.value === 'step')}>
                      <option value="station">{t.popupAnchorStation}</option>
                      <option value="step">{t.popupAnchorStep}</option>
                    </PopupSelect>
                  </PopupFieldColumn>
                )}

                {isItemTrigger && (
                  <PopupFieldColumn>
                    <TinyLabel>
                      {stages.route !== null
                        ? t.popupItemIndexInRoute.replace('{route}', routeNames[stages.route] ?? '')
                        : t.popupItemIndex}
                    </TinyLabel>
                    {selectedItems.length === 0 ? (
                      <span style={{ fontSize: 13, color: 'var(--mui-palette-text-secondary, #666)' }}>
                        {t.popupNoItemsForTrigger}
                      </span>
                    ) : byStep ? (
                      <PopupSelect
                        value={String(step)}
                        onChange={(e) => onUpdatePopup(i, 'itemIndex', Number(e.target.value))}
                      >
                        {stages.order.map((idx, pos) => (
                          <option key={`step-${pos}`} value={pos}>
                            {stepStationsKnown ? stepName(idx, pos) : t.popupStepNumber.replace('{n}', String(pos + 1))}
                          </option>
                        ))}
                      </PopupSelect>
                    ) : (
                      <PopupSelect
                        value={String(stationIndex)}
                        onChange={(e) => onUpdatePopup(i, 'itemIndex', Number(e.target.value))}
                      >
                        {stages.order.map((idx, pos) => (
                          <option key={`${selectedItems[idx].ref}-${idx}`} value={idx}>
                            {stepName(idx, pos)}
                          </option>
                        ))}
                      </PopupSelect>
                    )}
                  </PopupFieldColumn>
                )}

                {isMap && popup.triggerPoint === 'beforeItem' && (
                  <PopupFieldColumn>
                    <TinyLabel>{t.popupTiming}</TinyLabel>
                    <PopupSelect
                      value={popup.onTheWay ? 'onTheWay' : 'arrival'}
                      onChange={(e) => onUpdatePopup(i, 'onTheWay', e.target.value === 'onTheWay')}
                    >
                      <option value="arrival">{t.popupTimingArrival}</option>
                      <option value="onTheWay">{t.popupTimingOnTheWay}</option>
                    </PopupSelect>
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
                  <PopupFieldColumn>
                    <TinyLabel>{t.popupThreshold}</TinyLabel>
                    <PopupNumberInput
                      type="number"
                      value={popup.threshold}
                      onChange={(e) => onUpdatePopup(i, 'threshold', Math.max(1, Number(e.target.value)))}
                      min={1}
                    />
                  </PopupFieldColumn>
                )}

                <PopupFieldColumn>
                  <TinyLabel>{t.popupSound}</TinyLabel>
                  <PopupSelect
                    value={popup.soundCustom ? 'custom' : popup.sound || 'none'}
                    onChange={(e) => {
                      const choice = e.target.value;
                      onUpdatePopup(i, 'soundCustom', choice === 'custom');
                      onUpdatePopup(i, 'sound', choice === 'none' || choice === 'custom' ? '' : choice);
                    }}
                  >
                    <option value="none">{t.popupSoundNone}</option>
                    {BUILT_IN_POPUP_SOUNDS.map((s) => (
                      <option key={s.path} value={s.path}>{t[s.label]}</option>
                    ))}
                    <option value="custom">{t.popupSoundCustom}</option>
                  </PopupSelect>
                </PopupFieldColumn>
              </PopupFieldGrid>
              {(popup.soundCustom || !!popup.sound) && (
                <InlineRowWrap>
                  {popup.soundCustom && (
                    <>
                      <FileUploadButton
                        accept="audio/*"
                        onUploaded={(url) => onUpdatePopup(i, 'sound', url)}
                        label={t.upload}
                        uploadingLabel={t.uploading}
                      />
                      <PopupContentInput
                        placeholder={t.popupSoundUrl}
                        value={popup.sound ?? ''}
                        onChange={(e) => onUpdatePopup(i, 'sound', e.target.value)}
                        dir="ltr"
                      />
                    </>
                  )}
                  {!!popup.sound?.trim() && (
                    <SmallSelectionButton type="button" onClick={() => previewSound(popup.sound as string)}>
                      {t.popupSoundPreview}
                    </SmallSelectionButton>
                  )}
                </InlineRowWrap>
              )}
              {hint && <TinyLabel>{hint}</TinyLabel>}
            </PopupCard>
          );
        })}
      </VerticalStackGap12>
      <AddButtonMt8
        type="button"
        onClick={() => onAddPopup(audience)}
      >
        + {hasAudiences && !forEveryone ? t.addPopupFor.replace('{names}', pickedNames.join(', ')) : t.addPopup}
      </AddButtonMt8>
    </div>
  );
}
