import { NavLink, Link } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { useTranslations, useLang, LANGS } from '../../../context/LanguageContext';
import { texts } from './Nav.i18n';
import { MARKETING_ROUTES, CONTACT_ANCHOR } from './routes';
import { C, RADIUS, CONTAINER, BP } from './tokens';

const BAR_H = 88;

const Bar = styled('header')({
  position: 'sticky',
  top: 0,
  zIndex: 40,
  background: C.shell,
  borderBottom: `1px solid ${C.ruleSoft}`,
});

/**
 * One row on desktop, two below 900.
 *
 * The brand and the actions already fill a phone's width, so the destinations
 * wrap onto a row of their own rather than collapsing behind a menu button -
 * `Links` is ordered last and given the full width, and the bar grows to suit.
 */
const Inner = styled('div')({
  maxWidth: CONTAINER,
  marginInline: 'auto',
  paddingInline: 24,
  height: BAR_H,
  display: 'flex',
  alignItems: 'stretch',
  justifyContent: 'space-between',
  gap: 16,
  boxSizing: 'border-box',
  '@media (max-width: 900px)': {
    flexWrap: 'wrap',
    height: 'auto',
    alignItems: 'center',
    paddingTop: 8,
    rowGap: 6,
  },
  [BP.mobile]: { paddingInline: 16 },
});

/**
 * The wordmark asset already carries the "Engage, Share, Grow" lockup, so the
 * tagline must not be rendered again beside it.
 */
const Brand = styled(Link)({
  display: 'flex',
  alignItems: 'center',
  textDecoration: 'none',
  flexShrink: 0,
  '@media (max-width: 900px)': { order: 0 },
});

/**
 * Measured: the wordmark's ink is 57.6px tall in the 1512-wide frame, and the
 * asset carries ~7px of transparent padding a side, so ink is 80% of its height.
 * 72px renders the mark at its true size - sizing to the ink alone would come
 * out a fifth too small.
 */
const BrandMark = styled('img')({
  height: 72,
  width: 'auto',
  display: 'block',
  [BP.mobile]: { height: 46 },
});

const Links = styled('nav')({
  display: 'flex',
  alignItems: 'stretch',
  /**
   * Full-bleed below 900: the row breaks out of `Inner`'s gutter with a negative
   * inline margin so it spans the whole viewport. The tabs then tile it with no
   * gap, which is what lets an active first or last tab's tinted block run all
   * the way to the screen edge instead of stopping at the container.
   */
  '@media (max-width: 900px)': {
    order: 2,
    width: 'calc(100% + 48px)',
    marginInline: -24,
    gap: 0,
    borderTop: `1px solid ${C.ruleSoft}`,
  },
  [BP.mobile]: { width: 'calc(100% + 32px)', marginInline: -16 },
});

const itemStyle = {
  display: 'flex',
  alignItems: 'center',
  color: C.ink,
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: 15,
  paddingInline: 16,
  whiteSpace: 'nowrap' as const,
  transition: 'background 0.15s ease, color 0.15s ease',
  '&:hover': { color: C.purple },
  /** The active page is a full-height tinted block, not a pill. */
  '&.active': { background: C.paperSoft, color: C.magenta, fontWeight: 800 },
  /** Equal shares, so the four together tile the full-bleed row edge to edge. */
  '@media (max-width: 900px)': {
    flex: 1,
    justifyContent: 'center',
    textAlign: 'center' as const,
    paddingInline: 6,
    paddingBlock: 12,
    fontSize: 13.5,
  },
  [BP.mobile]: { paddingInline: 4, paddingBlock: 11, fontSize: 12.5 },
};

const Item = styled(NavLink)(itemStyle);
const AnchorItem = styled('a')(itemStyle);

const Actions = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  flexShrink: 0,
  '@media (max-width: 900px)': { order: 1, gap: 10 },
});

/** Flat violet - the gradient is reserved for the hero buttons. */
const NavCta = styled('a')({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: C.purple,
  color: C.white,
  textDecoration: 'none',
  borderRadius: RADIUS.button,
  padding: '13px 34px',
  fontSize: 15,
  fontWeight: 800,
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
  transition: 'background 0.16s ease',
  '&:hover': { background: C.purpleDeep },
  [BP.mobile]: { padding: '10px 18px', fontSize: 13 },
});

/**
 * A drawn globe, not a flag emoji: the shared `LangDrawer` renders 🇮🇱, which on
 * Windows falls back to the letters "IL" in a box. The comps show a plain
 * outline globe with no chrome around it.
 */
const GlobeButton = styled('button')({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 34,
  height: 34,
  padding: 0,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: C.heading,
  '&:hover': { color: C.purple },
});

function GlobeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden focusable="false">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.6 2.7 4 5.7 4 9s-1.4 6.3-4 9c-2.6-2.7-4-5.7-4-9s1.4-6.3 4-9Z" />
    </svg>
  );
}

export default function Nav() {
  const t = useTranslations(texts);
  const { lang } = useLang();

  // Language is read from storage at boot, so switching persists and reloads.
  const cycleLang = () => {
    const i = LANGS.findIndex((l) => l.code === lang);
    const next = LANGS[(i + 1) % LANGS.length];
    localStorage.setItem('yooz_lang', next.code);
    window.location.reload();
  };

  return (
    <Bar>
      <Inner>
        {/* RTL puts the first child on the right, which is where the comps have the brand. */}
        <Brand to="/">
          <BrandMark src="/images/marketing/logo-yooz.png" alt={t.logoAlt} />
        </Brand>

        <Links>
          {MARKETING_ROUTES.map((r) =>
            r.path.startsWith('#') ? (
              <AnchorItem key={r.key} href={r.path}>{t[r.key]}</AnchorItem>
            ) : (
              <Item key={r.key} to={r.path}>{t[r.key]}</Item>
            ),
          )}
        </Links>

        <Actions>
          <NavCta href={CONTACT_ANCHOR}>{t.bookDemo}</NavCta>
          <GlobeButton type="button" onClick={cycleLang} aria-label={t.switchLang}>
            <GlobeIcon />
          </GlobeButton>
        </Actions>
      </Inner>
    </Bar>
  );
}
