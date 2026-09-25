import type { ComponentType } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { useTranslations, useLang, LANGS } from '../../../context/LanguageContext';
import { texts } from './Nav.i18n';
import { storeLang } from '../../../utils/currentLang';
import { HomeIcon, InfoIcon, GlobeIcon } from './Nav.icons';
import { MARKETING_ROUTES, CONTACT_ANCHOR, type MarketingRoute } from './routes';
import { C, RADIUS, CONTAINER, BP } from './tokens';

const BAR_H = 88;

const Bar = styled('header')({
  position: 'sticky',
  top: 0,
  zIndex: 40,
  background: C.shell,
  borderBottom: `1px solid ${C.ruleSoft}`,
});

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

const Brand = styled(Link)({
  display: 'flex',
  alignItems: 'center',
  textDecoration: 'none',
  flexShrink: 0,
  '@media (max-width: 900px)': { order: 0 },
});

const BrandMark = styled('img')({
  height: 72,
  width: 'auto',
  display: 'block',
  [BP.mobile]: { height: 46 },
});

const Links = styled('nav')({
  display: 'flex',
  alignItems: 'stretch',
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
  '&.active': { background: C.paperSoft, color: C.magenta, fontWeight: 800 },
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

const IconItem = styled(Item)({ [BP.mobile]: { flex: '0 0 50px', paddingInline: 0 } });

const ItemIcon = styled('span')({
  display: 'none',
  [BP.mobile]: { display: 'flex' },
});

const CollapsibleLabel = styled('span')({
  [BP.mobile]: {
    position: 'absolute',
    width: 1,
    height: 1,
    margin: -1,
    padding: 0,
    border: 0,
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    whiteSpace: 'nowrap',
  },
});

const NAV_ICONS: Partial<Record<MarketingRoute['key'], ComponentType>> = {
  home: HomeIcon,
  about: InfoIcon,
};

const Actions = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  flexShrink: 0,
  '@media (max-width: 900px)': { order: 1, gap: 10 },
});

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

export default function Nav() {
  const t = useTranslations(texts);
  const { lang } = useLang();

  const cycleLang = () => {
    const i = LANGS.findIndex((l) => l.code === lang);
    const next = LANGS[(i + 1) % LANGS.length];
    storeLang(next.code);
    window.location.reload();
  };

  return (
    <Bar>
      <Inner>
        <Brand to="/">
          <BrandMark src="/images/marketing/logo-yooz.png" alt={t.logoAlt} />
        </Brand>

        <Links>
          {MARKETING_ROUTES.map((r) => {
            if (r.path.startsWith('#')) {
              return <AnchorItem key={r.key} href={r.path}>{t[r.key]}</AnchorItem>;
            }
            const end = r.path === '/';
            const Icon = NAV_ICONS[r.key];
            if (!Icon) {
              return <Item key={r.key} to={r.path} end={end}>{t[r.key]}</Item>;
            }
            return (
              <IconItem key={r.key} to={r.path} end={end}>
                <ItemIcon aria-hidden>
                  <Icon />
                </ItemIcon>
                <CollapsibleLabel>{t[r.key]}</CollapsibleLabel>
              </IconItem>
            );
          })}
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
