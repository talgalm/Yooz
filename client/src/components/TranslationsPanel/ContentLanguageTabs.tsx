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

const SHADOW_ROOM = 24;

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
  overflowX: 'hidden',
  overflowY: 'hidden',
  position: 'relative',
  zIndex: 2,
  marginBottom: -MERGE,
  paddingBottom: 0,
  paddingTop: SHADOW_ROOM,
  marginTop: -SHADOW_ROOM,
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

  useEffect(() => {
    stripRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }, [summary]);

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
