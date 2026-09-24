import { ReactNode, useCallback, useEffect, useState } from 'react';
import { styled } from '@mui/material/styles';
import { adminApiFetch } from '../../utils/adminApi';
// The card the tabs sit on, so the panel lands on exactly the same surface as
// the form it replaces. Admin-only styling, used by an admin-only component.
import { AdminCardWide } from '../../pages/admin/styled';
import { LANGS, useTranslations } from '../../context/LanguageContext';
import { texts } from './TranslationsPanel.i18n';
import TranslationsPanel, { type LangSummary } from './index';

interface ContentLanguageTabsProps {
  kind: 'stations' | 'games';
  /** Absent while the item is being created - there is nothing to translate yet. */
  id?: string;
  /**
   * The item's own card: everything is authored in Hebrew on the first tab.
   * Omitted where there is no form to show - the module builder's modal opens
   * straight onto the languages.
   */
  children?: ReactNode;
  /** Inside a modal, which supplies its own surface, the panel needs no card. */
  plain?: boolean;
}

/**
 * The tabs sit on top of the card, the way a browser's tabs sit on its window.
 *
 * `overflow-y` is pinned to `hidden` on purpose: a box with `overflow-x: auto`
 * and a visible y-axis has that axis promoted to `auto` too, so a single pixel
 * of vertical overflow - a tab reaching down to meet the card - grew a vertical
 * scrollbar on the tab strip. Nothing overflows downwards now; the strip itself
 * is pulled down over the card's top border instead, and paints above it.
 */
/** How far the active tab's white reaches down into the card. */
const MERGE = 4;

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
const squareTabCorner = { '& > *': { borderStartStartRadius: 0 } } as const;

const Surface = styled('div')(squareTabCorner);

const PanelCard = styled(AdminCardWide)({ borderStartStartRadius: 0 });

const Strip = styled('div')({
  display: 'flex',
  gap: 4,
  alignItems: 'flex-end',
  overflowX: 'auto',
  overflowY: 'hidden',
  position: 'relative',
  zIndex: 1,
  // Pulls the strip itself over the card. Done here rather than on the tabs,
  // because anything overflowing a tab downwards is clipped by `overflow-y`
  // above, and a box-shadow bridging the seam would be clipped with it.
  marginBottom: -MERGE,
  paddingBottom: 0,
  scrollbarWidth: 'thin',
  '&::-webkit-scrollbar': { height: 6 },
  '&::-webkit-scrollbar-thumb': { background: '#ded7f0', borderRadius: 3 },
});

/**
 * Filled shapes rather than outlined boxes, the way a browser draws its own
 * tabs. An outline would leave two short stubs of border poking into the card,
 * since the tab now reaches below the card's top edge to merge with it.
 */
const Tab = styled('button')<{ active?: boolean }>(({ active }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  flex: '0 0 auto',
  padding: `9px 16px ${10 + MERGE}px`,
  borderRadius: '12px 12px 0 0',
  border: 'none',
  // Transparent, so the card's own top border still runs under an inactive tab
  // and only disappears beneath the active one.
  background: active ? '#fff' : 'transparent',
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

function labelFor(code: string): string {
  return LANGS.find((l) => l.code === code)?.label ?? code;
}

function flagFor(code: string): string {
  return LANGS.find((l) => l.code === code)?.flag ?? '🏳️';
}

/**
 * The station's content, one tab per language.
 *
 * The first tab is the station itself, authored in Hebrew; every other tab is
 * the same content in that language, editable in place. The form is hidden
 * rather than unmounted when another tab is open, so unsaved edits to the
 * station survive a look at the translations.
 */
export default function ContentLanguageTabs({
  kind,
  id,
  children,
  plain,
}: ContentLanguageTabsProps) {
  const t = useTranslations(texts);
  const [summary, setSummary] = useState<LangSummary[] | null>(null);
  const [tab, setTab] = useState('he');

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

  // Nothing to translate until the item exists, and no tabs worth showing.
  if (!id || !summary || summary.length === 0) return <>{children}</>;

  // With no form to show, the first language is the landing tab.
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
      <Strip role="tablist">
        {children && (
          <Tab
            type="button"
            role="tab"
            aria-selected={current === 'he'}
            active={current === 'he'}
            onClick={() => setTab('he')}
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
            onClick={() => setTab(l.code)}
            title={l.inUse ? undefined : t.unusedTitle}
          >
            <span aria-hidden>{flagFor(l.code)}</span>
            {labelFor(l.code)}
            {l.reviewed > 0 && <Count>{l.reviewed}</Count>}
            {!l.inUse && <Dot aria-label={t.unused} />}
          </Tab>
        ))}
      </Strip>

      {/*
        Hidden, not unmounted: the form keeps whatever was typed into it while
        another tab is open. `contents` rather than a plain block, so what it
        holds stays a direct child of the layout around it and keeps its
        spacing - wrapping it in a box of its own swallowed the gaps.
      */}
      {children && (
        <Surface style={{ display: current === 'he' ? 'contents' : 'none' }}>{children}</Surface>
      )}

      {panel && (plain ? panel : <PanelCard>{panel}</PanelCard>)}
    </>
  );
}
