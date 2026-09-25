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
  /** The item's own card. Omitted by the module builder's modal, which has no form. */
  children?: ReactNode;
  plain?: boolean;
}

/**
 * How far the active tab reaches down into the card: exactly the card's border,
 * which its white bottom bar then hides. Any deeper and the tab's side borders
 * carry on past the card's top edge as two stubs inside it.
 */
const MERGE = 1;

const CARD_BORDER = '#ecebf4';
const CARD_SHADOW = '0 1px 2px rgba(16,12,40,0.04), 0 10px 30px rgba(16,12,40,0.05)';

/**
 * Room above the strip for a tab's shadow, which the strip would otherwise clip
 * flush. Top only: the same padding sideways made the strip wider than the
 * card, and a scroller's content moves through its padding, so scrolled tabs
 * appeared outside the card's edges.
 */
const SHADOW_ROOM = 24;

/**
 * Where the card meets the tabs it gives up two things: the rounded corner the
 * first tab sits on, which otherwise curves away and shows a wedge of page
 * beneath it, and the part of its shadow that points upwards - inactive tabs
 * are transparent, so that shadow washed up through them and greyed their lower
 * half. The radius is logical, so the squared corner follows the page direction.
 */
const cardMeetingTabs = {
  borderStartStartRadius: 0,
  clipPath: 'inset(0 -60px -60px -60px)',
} as const;

const Surface = styled('div')({ '& > *': cardMeetingTabs });

const PanelCard = styled(AdminCardWide)(cardMeetingTabs);

const Strip = styled('div')({
  display: 'flex',
  gap: 4,
  alignItems: 'flex-end',
  // Moved only by clicking a tab: `scrollIntoView` still works on a hidden
  // overflow, so there is no scrollbar, no wheel, and no way to leave the strip
  // half-way between two tabs.
  overflowX: 'hidden',
  overflowY: 'hidden',
  position: 'relative',
  zIndex: 2,
  // Pulled over the card here rather than on the tabs, because anything
  // overflowing a tab downwards is clipped, a bridging shadow included.
  marginBottom: -MERGE,
  paddingBottom: 0,
  paddingTop: SHADOW_ROOM,
  marginTop: -SHADOW_ROOM,
  scrollBehavior: 'smooth',
});

/**
 * The active tab is the card's edge carried upwards: same border, same shadow,
 * same white. An inactive one keeps a transparent border of the same width, so
 * it takes the same room and the card's border still runs underneath it.
 */
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
  /**
   * The join with the card, as a bar rather than a white bottom border: a
   * border is mitered against the side ones, and on a HiDPI screen that miter
   * bled a device pixel of white past the card's edge. The bar spans the
   * padding box, leaving both corners the border's own colour.
   */
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
  // Cut at the tab's bottom edge so the shadow wraps the top and sides without
  // smudging across the card it sits on.
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
 * Fades whichever edge the strip continues past, so a strip that runs on reads
 * as having more rather than as cut off. `mask-image` takes no logical values,
 * so the two ends are mapped to left and right by hand.
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
  /** Whether more tabs lie past each edge, which is what `fadeStyle` shows. */
  const [more, setMore] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
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
   * The active tab can sit off-screen when the tabs first arrive. Not keyed on
   * `tab` as well: re-running this on a click cancelled the smooth scroll that
   * `reveal` had just started, and the strip never moved.
   */
  useEffect(() => {
    stripRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }, [summary]);

  /**
   * Clicking a tab pulls the strip that way, revealing the next one beyond it.
   * Scrolling the *neighbour* into view rather than centring the tab clicked
   * moves the least possible while still always showing something new, so the
   * strip does not jump under a click in the middle.
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
