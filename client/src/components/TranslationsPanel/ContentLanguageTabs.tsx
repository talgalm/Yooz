import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { styled } from '@mui/material/styles';
import { adminApiFetch } from '../../utils/adminApi';
import { AdminCardWide } from '../../pages/admin/styled';
import { LANGS, useLang, useTranslations } from '../../context/LanguageContext';
import { texts } from './TranslationsPanel.i18n';
import TranslationsPanel, { type LangSummary } from './index';

interface ContentLanguageTabsProps {
  kind: 'stations' | 'games';
  id?: string;
  children?: ReactNode;
  plain?: boolean;
}

const MERGE = 1;

const CARD_BORDER = '#ecebf4';

const CARD_SHADOW = '0 1px 2px rgba(16,12,40,0.04), 0 10px 30px rgba(16,12,40,0.05)';

/**
 * Room above the strip for that shadow to spread into.
 *
 * The strip scrolls sideways, which makes it a clipping box - a shadow on a tab
 * would be cut off flush with the tab itself. Padding gives it somewhere to go,
 * and an equal negative margin keeps the tabs where they were.
 *
 * Only upwards, though. The same trick sideways widened the strip past the card
 * on both sides, and in a scroller the content moves *through* its padding - so
 * scrolled tabs appeared outside the card's edges. The strip is now exactly as
 * wide as the card, and a tab's sideways shadow is clipped at that edge, where
 * the card's own shadow continues the silhouette anyway.
 */
const SHADOW_ROOM = 24;

/**
 * The card gives up the rounded corner the tabs sit on.
 *
 * The tabs line up with the card's edge, and a card that curves away there
 * leaves a wedge of page showing under the first tab - inset the tabs instead
 * and they no longer line up with anything. Squaring that one corner lets the
 * silhouette run straight from the tab down the side of the card, which is how
 * a browser window meets its own tabs. Logical, so it follows the page's
 * direction: the corner the tabs start at, whichever side that is.
 */
/**
 * The card also gives up the part of its shadow that points *upwards*.
 *
 * Its shadow blurs about twenty pixels past its own top edge, and an inactive
 * tab is transparent - so that shadow washed up through the tabs and greyed
 * their lower half. Raising the strip does not help: the shadow is already
 * behind the tabs, it simply shows through them. Clipped flush at the top, the
 * sides and bottom keep theirs, and the tab carries its own shadow above.
 */
const cardMeetingTabs = {
  '& > *': {
    borderStartStartRadius: 0,
    clipPath: 'inset(0 -60px -60px -60px)',
  },
} as const;

const Surface = styled('div')(cardMeetingTabs);

const PanelCard = styled(AdminCardWide)({
  borderStartStartRadius: 0,
  clipPath: 'inset(0 -60px -60px -60px)',
});

const Strip = styled('div')({
  display: 'flex',
  gap: 4,
  alignItems: 'flex-end',
  /**
   * Hidden rather than `auto`: the strip is moved by clicking a tab, never by
   * dragging or a wheel. `scrollIntoView` still works on a hidden overflow, so
   * the strip can be scrolled programmatically while offering no scrollbar and
   * no way to leave it half-way between two tabs.
   */
  overflowX: 'hidden',
  overflowY: 'hidden',
  position: 'relative',
  zIndex: 2,
  // Pulls the strip itself over the card. Done here rather than on the tabs,
  // because anything overflowing a tab downwards is clipped by `overflow-y`
  // above, and a box-shadow bridging the seam would be clipped with it.
  marginBottom: -MERGE,
  paddingBottom: 0,
  paddingTop: SHADOW_ROOM,
  marginTop: -SHADOW_ROOM,
  // Smooth by default, so a click walks the strip rather than jumping it.
  scrollBehavior: 'smooth',
});

const Tab = styled('button')<{ active?: boolean }>(({ active }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  flex: '0 0 auto',
  position: 'relative',
  padding: `8px 15px ${9 + MERGE}px`,
  borderRadius: '12px 12px 0 0',
  border: `1px solid ${active ? CARD_BORDER : 'transparent'}`,
  borderBottomColor: active ? CARD_BORDER : 'transparent',
  background: active ? '#fff' : 'transparent',
  backgroundClip: 'padding-box',
  ...(active && {
    '&::after': {
      content: '""',
      position: 'absolute',
      insetInline: 0,
      bottom: -1,
      height: 1,
      background: '#fff',
    },
  }),
  boxShadow: active ? CARD_SHADOW : 'none',
  clipPath: active ? `inset(-${SHADOW_ROOM * 2}px -${SHADOW_ROOM * 2}px 0)` : 'none',
  color: active ? '#6C5CE7' : '#6b6280',
  fontSize: 13.5,
  fontWeight: 700,
  fontFamily: 'inherit',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  '&:hover': { color: '#6C5CE7' },
}));

const Count = styled('span')({
  fontSize: 11,
  fontWeight: 800,
  padding: '1px 7px',
  borderRadius: 999,
  background: '#efeaff',
  color: '#6C5CE7',
});

const Dot = styled('span')({
  width: 7,
  height: 7,
  borderRadius: '50%',
  background: '#e0a84a',
});

/**
 * Fades whichever edge the strip continues past, so ten languages read as a
 * strip you can scroll rather than one that has been cut off. Nothing fades
 * while everything fits.
 *
 * `mask-image` is in the box's own coordinates, so the two ends have to be
 * mapped to left and right by hand - logical values are not accepted here.
 */
function fadeStyle(
  more: { start: boolean; end: boolean },
  dir: 'ltr' | 'rtl'
): { maskImage?: string; WebkitMaskImage?: string } {
  const left = dir === 'rtl' ? more.end : more.start;
  const right = dir === 'rtl' ? more.start : more.end;
  if (!left && !right) return {};
  const edge = '28px';
  const mask = `linear-gradient(to right, ${
    left ? 'transparent 0, #000 ' + edge : '#000 0'
  }, ${right ? `#000 calc(100% - ${edge}), transparent 100%` : '#000 100%'})`;
  return { maskImage: mask, WebkitMaskImage: mask };
}

function labelFor(code: string): string {
  return LANGS.find((l) => l.code === code)?.label ?? code;
}

function flagFor(code: string): string {
  return LANGS.find((l) => l.code === code)?.flag ?? '🏳️';
}

export default function ContentLanguageTabs({
  kind,
  id,
  children,
  plain,
}: ContentLanguageTabsProps) {
  const t = useTranslations(texts);
  const { dir } = useLang();
  const [summary, setSummary] = useState<LangSummary[] | null>(null);
  const [tab, setTab] = useState('he');
  const stripRef = useRef<HTMLDivElement>(null);
  /**
   * Whether the strip has more tabs past each edge. With a handful of languages
   * it never scrolls; with ten it does, and a strip that simply ends mid-tab
   * reads as broken rather than as scrollable - so the edge it continues past
   * is faded.
   */
  const [more, setMore] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    // `scrollLeft` runs negative in a right-to-left strip, so distance from the
    // start is its magnitude either way.
    const from = Math.abs(el.scrollLeft);
    const max = el.scrollWidth - el.clientWidth;
    setMore({ start: from > 1, end: from < max - 1 });
  }, []);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure, summary]);

  /**
   * With many languages the active one can sit off-screen when the tabs first
   * arrive. Deliberately not keyed on `tab` as well: a click starts a smooth
   * scroll of its own (see `reveal`), and re-running this on the same click
   * cancelled it mid-flight - the strip simply never moved.
   */
  useEffect(() => {
    stripRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }, [summary]);

  /**
   * Clicking a tab pulls the strip the way that tab lies, revealing the next
   * one beyond it - so reaching the far end is just clicking towards it, rather
   * than knowing the strip scrolls at all.
   *
   * It scrolls the *neighbour* into view rather than centring the tab clicked:
   * that moves the least possible while still always showing something new, so
   * the strip never jumps under a click in the middle.
   */
  const reveal = useCallback((el: HTMLElement | null) => {
    const strip = stripRef.current;
    if (!strip || !el) return;
    const box = strip.getBoundingClientRect();
    const tabBox = el.getBoundingClientRect();
    const towardsLeft = tabBox.left + tabBox.width / 2 < box.left + box.width / 2;

    const beyond = [...strip.querySelectorAll<HTMLElement>('[role="tab"]')]
      .map((tab) => ({ tab, rect: tab.getBoundingClientRect() }))
      .filter(({ rect }) => (towardsLeft ? rect.left < tabBox.left : rect.right > tabBox.right))
      // The nearest one on that side.
      .sort((a, b) => (towardsLeft ? b.rect.left - a.rect.left : a.rect.right - b.rect.right));

    (beyond[0]?.tab ?? el).scrollIntoView({
      inline: 'nearest',
      block: 'nearest',
      behavior: 'smooth',
    });
  }, []);

  const loadSummary = useCallback(async () => {
    if (!id) return;
    const data = await adminApiFetch<{ languages: LangSummary[] }>(
      `/api/admin/translations/${kind}/${id}/languages`
    );
    setSummary(data.languages);
  }, [kind, id]);

  useEffect(() => {
    let cancelled = false;
    loadSummary().catch(() => !cancelled && setSummary([]));
    return () => {
      cancelled = true;
    };
  }, [loadSummary]);

  if (!id || !summary || summary.length === 0) return <>{children}</>;

  const current = children ? tab : tab === 'he' ? (summary[0]?.code ?? 'he') : tab;
  const active = summary.find((l) => l.code === current);

  const panel =
    current !== 'he' && active ? (
      <TranslationsPanel
        kind={kind}
        id={id}
        lang={current}
        inUse={active.inUse}
        onSaved={loadSummary}
      />
    ) : null;

  return (
    <>
      <Strip ref={stripRef} role="tablist" onScroll={measure} style={fadeStyle(more, dir)}>
        {children && (
          <Tab
            type="button"
            role="tab"
            aria-selected={current === 'he'}
            active={current === 'he'}
            onClick={(e) => {
              setTab('he');
              reveal(e.currentTarget);
            }}
          >
            {t.generalTab}
          </Tab>
        )}
        {summary.map((l) => (
          <Tab
            key={l.code}
            type="button"
            role="tab"
            aria-selected={current === l.code}
            active={current === l.code}
            onClick={(e) => {
              setTab(l.code);
              reveal(e.currentTarget);
            }}
            title={l.inUse ? undefined : t.unusedTitle}
          >
            <span aria-hidden>{flagFor(l.code)}</span>
            {labelFor(l.code)}
            {l.reviewed > 0 && <Count>{l.reviewed}</Count>}
            {!l.inUse && <Dot aria-label={t.unused} />}
          </Tab>
        ))}
      </Strip>

      {children && (
        <Surface style={{ display: current === 'he' ? 'contents' : 'none' }}>{children}</Surface>
      )}

      {panel && (plain ? panel : <PanelCard>{panel}</PanelCard>)}
    </>
  );
}
