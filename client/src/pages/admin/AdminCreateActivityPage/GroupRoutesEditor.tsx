import { useState } from 'react';
import { styled } from '@mui/material/styles';
import { SectionLabelSmall, SectionDescription } from '../styled';
import { itemDisplayName, type ItemLocation, type ModuleItem } from './types';
import { LocationSection } from './ItemSettingsModal';
import { blockOrder, collageVideoPartTooEarly, locationBlocks, routeIndices, withRouteRemoved, type RouteDraft } from './groupRoutes';
import { pathMeters, type LatLng } from '../../../utils/geo';
import { isMapsAvailable, walkingMeters } from '../../../utils/googleMaps';

const PURPLE = '#6c5ce7';

const noForward = { shouldForwardProp: (prop: PropertyKey) => !String(prop).startsWith('$') };

const RouteCard = styled('div')({
  marginTop: 12,
  padding: 12,
  border: '1px solid #e8e4f3',
  borderRadius: 10,
  background: '#fafafe',
});
const RouteHeader = styled('div')({ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 });
const NameInput = styled('input')({
  flex: '1 1 160px',
  minWidth: 0,
  padding: '7px 10px',
  border: '1px solid #ddd',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 700,
  fontFamily: 'inherit',
});
const Distance = styled('span', noForward)<{ $tone: 'plain' | 'best' | 'longer' }>(({ $tone }) => ({
  padding: '3px 10px',
  borderRadius: 999,
  fontSize: 12.5,
  fontWeight: 700,
  whiteSpace: 'nowrap',
  background: $tone === 'best' ? '#e6f6ec' : $tone === 'longer' ? '#fdf3e4' : '#efecf8',
  color: $tone === 'best' ? '#188038' : $tone === 'longer' ? '#a15c00' : '#5b4fc4',
}));
const SmallButton = styled('button')({
  padding: '6px 12px',
  border: '1px solid #ddd',
  borderRadius: 8,
  background: '#fff',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
  '&:disabled': { opacity: 0.5, cursor: 'default' },
});
const DangerButton = styled(SmallButton)({ color: '#c0392b', borderColor: '#f3c5bf' });
const MeasureButton = styled(SmallButton)({ padding: '3px 10px', fontSize: 12.5, color: PURPLE, borderColor: PURPLE, whiteSpace: 'nowrap' });
const List = styled('div')({ display: 'flex', flexDirection: 'column', gap: 4 });
const Block = styled('div', noForward)<{ $dragging: boolean; $grouped: boolean }>(({ $dragging, $grouped }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  padding: $grouped ? 3 : 0,
  border: $grouped ? '1px solid #d9d2f3' : 'none',
  borderRadius: 8,
  background: $grouped ? '#f3f0fc' : 'transparent',
  cursor: 'grab',
  opacity: $dragging ? 0.5 : 1,
}));
const Row = styled('div', noForward)<{ $attached: boolean }>(({ $attached }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 8px',
  marginInlineStart: $attached ? 20 : 0,
  border: '1px solid #e0e0e0',
  borderRadius: 6,
  background: '#fff',
  fontSize: 13,
  color: $attached ? '#666' : '#222',
}));
const Attached = styled('span')({
  marginInlineStart: 'auto',
  flexShrink: 0,
  background: '#ebe6fb',
  color: '#5b4fc4',
  borderRadius: 6,
  padding: '1px 8px',
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: 'nowrap',
});
const Handle = styled('span')({
  width: 12,
  height: 16,
  flexShrink: 0,
  backgroundImage: 'radial-gradient(circle, #bbb 1.3px, transparent 1.3px)',
  backgroundSize: '5px 5px',
  backgroundPosition: 'center',
});
const Num = styled('span')({ color: '#999', fontSize: 12, width: 22, flexShrink: 0 });
const MissingLocation = styled('span')({
  marginInlineStart: 'auto',
  flexShrink: 0,
  background: '#fdeeea',
  color: '#c0392b',
  borderRadius: 6,
  padding: '1px 8px',
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: 'nowrap',
});
const Warning = styled('div')({ marginTop: 8, fontSize: 12.5, fontWeight: 600, color: '#a15c00' });
const Buttons = styled('div')({ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 });
const AssignGrid = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr)',
  gap: '6px 12px',
  alignItems: 'center',
  marginTop: 8,
});
const GroupName = styled('span')({ fontSize: 14, fontWeight: 600, color: '#333' });
const RouteSelect = styled('select')({
  padding: '6px 8px',
  border: '1px solid #ddd',
  borderRadius: 8,
  fontSize: 13,
  fontFamily: 'inherit',
  background: '#fff',
});

function formatDistance(meters: number, t: Record<string, string>): string {
  if (meters < 1000) return t.routeMeters.replace('{m}', String(Math.round(meters / 10) * 10));
  return t.routeKm.replace('{km}', (meters / 1000).toFixed(1));
}

function signature(points: LatLng[]): string {
  return points.map((p) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`).join('|');
}

export default function GroupRoutesEditor({
  groupNames,
  items,
  routes,
  setRoutes,
  groupRoutes,
  setGroupRoutes,
  startLocation,
  setStartLocation,
  onRouteRemoved,
  selfService,
  t,
}: {
  groupNames: string[];
  items: ModuleItem[];
  routes: RouteDraft[];
  setRoutes: (next: RouteDraft[]) => void;
  groupRoutes: Record<string, number>;
  setGroupRoutes: (next: Record<string, number>) => void;
  startLocation?: ItemLocation;
  setStartLocation: (next: ItemLocation | undefined) => void;
  onRouteRemoved: (removed: number) => void;
  selfService: boolean;
  t: Record<string, string>;
}) {
  const [drag, setDrag] = useState<{ route: number; from: number } | null>(null);
  const [walking, setWalking] = useState<Record<string, number | 'failed'>>({});
  const [measuring, setMeasuring] = useState<number | null>(null);

  if (selfService) {
    return (
      <div style={{ marginTop: 12 }}>
        <SectionLabelSmall>{t.routesTitle}</SectionLabelSmall>
        <SectionDescription style={{ marginTop: 4 }}>{t.routesSelfService}</SectionDescription>
      </div>
    );
  }

  const blocks = locationBlocks(items);
  const pointsFor = (order: number[]): LatLng[] | null => {
    const stops = order.flatMap((i) => (items[i]?.location ? [items[i].location as LatLng] : []));
    if (stops.length === 0) return null;
    return [...(startLocation ? [startLocation] : []), ...stops];
  };

  const measured = routes.map((route) => {
    const grouped = blockOrder(routeIndices(route, items), blocks);
    const order = grouped.flat();
    const points = pointsFor(order);
    const walk = points && points.length > 1 ? walking[signature(points)] : undefined;
    return {
      grouped,
      order,
      points,
      missing: points ? 0 : order.length,
      straight: points && points.length > 1 ? pathMeters(points) : null,
      walk: typeof walk === 'number' ? walk : null,
      walkFailed: walk === 'failed',
    };
  });
  const walks = measured.map((m) => m.walk).filter((w): w is number => w !== null);
  const shortestWalk = walks.length > 1 ? Math.min(...walks) : null;

  const measureRoute = async (r: number) => {
    const points = measured[r].points;
    if (!points || points.length < 2) return;
    setMeasuring(r);
    let result: number | 'failed';
    try {
      result = await walkingMeters(points);
    } catch {
      result = 'failed';
    }
    setWalking((prev) => ({ ...prev, [signature(points)]: result }));
    setMeasuring(null);
  };

  const move = (r: number, from: number, to: number) => {
    if (from === to) return;
    const grouped = [...measured[r].grouped];
    grouped.splice(to, 0, ...grouped.splice(from, 1));
    const uids = grouped.flat().flatMap((i) => (items[i]?.uid ? [items[i].uid as string] : []));
    setRoutes(routes.map((route, k) => (k === r ? { ...route, uids } : route)));
  };

  const addRoute = () => {
    setRoutes([
      ...routes,
      {
        name: t.routeDefaultName.replace('{n}', String(routes.length + 1)),
        uids: items.flatMap((item) => (item.uid ? [item.uid] : [])),
      },
    ]);
  };

  const removeRoute = (r: number) => {
    setRoutes(routes.filter((_, k) => k !== r));
    setGroupRoutes(withRouteRemoved(groupRoutes, r));
    onRouteRemoved(r);
  };

  const assign = (group: string, route: number) => {
    const next = { ...groupRoutes };
    if (route < 0) delete next[group];
    else next[group] = route;
    setGroupRoutes(next);
  };

  const groups = groupNames.map((g) => g.trim()).filter(Boolean);

  return (
    <div style={{ marginTop: 16 }}>
      <SectionLabelSmall>{t.routesTitle}</SectionLabelSmall>
      <SectionDescription style={{ marginTop: 4 }}>{t.routesHint}</SectionDescription>

      <LocationSection location={startLocation} onChange={setStartLocation} title={t.routesStart} hint={t.routesStartHint} t={t} />

      {routes.map((route, r) => {
        const m = measured[r];
        const longer = shortestWalk !== null && m.walk !== null && m.walk > shortestWalk ? m.walk - shortestWalk : 0;
        return (
          <RouteCard key={r}>
            <RouteHeader>
              <NameInput
                value={route.name}
                onChange={(e) => setRoutes(routes.map((x, k) => (k === r ? { ...x, name: e.target.value } : x)))}
                placeholder={t.routeDefaultName.replace('{n}', String(r + 1))}
                aria-label={t.routeName}
              />
              {m.walk !== null ? (
                <Distance $tone={shortestWalk === null ? 'plain' : longer > 0 ? 'longer' : 'best'}>
                  {t.routeWalking.replace('{d}', formatDistance(m.walk, t))}
                  {longer > 0 && ` (+${formatDistance(longer, t)})`}
                </Distance>
              ) : m.straight !== null ? (
                <Distance $tone="plain">{t.routeStraight.replace('{d}', formatDistance(m.straight, t))}</Distance>
              ) : m.missing > 0 ? (
                <Distance $tone="longer">{t.routeMissingLocations.replace('{n}', String(m.missing))}</Distance>
              ) : null}
              {m.walkFailed && <Distance $tone="longer">{t.routeWalkFailed}</Distance>}
              {m.walk === null && m.points && m.points.length > 1 && isMapsAvailable() && (
                <MeasureButton type="button" onClick={() => void measureRoute(r)} disabled={measuring !== null}>
                  {measuring === r ? t.routesMeasuring : t.routesMeasure}
                </MeasureButton>
              )}
              <DangerButton type="button" onClick={() => removeRoute(r)}>{t.routeRemove}</DangerButton>
            </RouteHeader>
            <List>
              {m.grouped.map((block, pos) => {
                const first = m.grouped.slice(0, pos).reduce((sum, b) => sum + b.length, 0);
                const head = block.find((i) => items[i]?.location) ?? block[0];
                const attachedCount = block.length - 1;
                return (
                  <Block
                    key={items[head]?.uid ?? head}
                    draggable
                    $grouped={block.length > 1}
                    $dragging={drag?.route === r && drag.from === pos}
                    onDragStart={() => setDrag({ route: r, from: pos })}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => { if (drag?.route === r) move(r, drag.from, pos); setDrag(null); }}
                    onDragEnd={() => setDrag(null)}
                    onClick={() => {
                      if (!drag || drag.route !== r) { setDrag({ route: r, from: pos }); return; }
                      move(r, drag.from, pos);
                      setDrag(null);
                    }}
                  >
                    {block.map((itemIndex, k) => (
                      <Row key={items[itemIndex]?.uid ?? itemIndex} $attached={itemIndex !== head}>
                        {itemIndex === head ? <Handle /> : <span style={{ width: 12, flexShrink: 0 }} />}
                        <Num>{first + k + 1}.</Num>
                        <span>{items[itemIndex] ? itemDisplayName(items[itemIndex]) : '?'}</span>
                        {itemIndex === head && attachedCount > 0 && (
                          <Attached>{t.routeAttached.replace('{n}', String(attachedCount))}</Attached>
                        )}
                        {!m.points && <MissingLocation>{t.locationMissingLabel}</MissingLocation>}
                      </Row>
                    ))}
                  </Block>
                );
              })}
            </List>
            {collageVideoPartTooEarly(m.order, items) && <Warning>{t.routeCollageOrder}</Warning>}
          </RouteCard>
        );
      })}

      <Buttons>
        <SmallButton type="button" onClick={addRoute} disabled={items.length === 0}>+ {t.routeAdd}</SmallButton>
      </Buttons>

      {routes.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <SectionLabelSmall>{t.routesAssign}</SectionLabelSmall>
          {groups.length === 0 ? (
            <SectionDescription style={{ marginTop: 4 }}>{t.routesNoGroups}</SectionDescription>
          ) : (
            <AssignGrid>
              {groups.map((group) => (
                <span key={group} style={{ display: 'contents' }}>
                  <GroupName>{group}</GroupName>
                  <RouteSelect value={groupRoutes[group] ?? -1} onChange={(e) => assign(group, Number(e.target.value))}>
                    <option value={-1}>{t.routeNone}</option>
                    {routes.map((route, r) => (
                      <option key={r} value={r}>{route.name.trim() || t.routeDefaultName.replace('{n}', String(r + 1))}</option>
                    ))}
                  </RouteSelect>
                </span>
              ))}
            </AssignGrid>
          )}
        </div>
      )}
    </div>
  );
}
