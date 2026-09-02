import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { useManageAuth } from '../../../context/ManageAuthContext';
import { useLang } from '../../../context/LanguageContext';
import { MANAGE_NAV } from '../nav';
import TimerBar from '../TimerBar';
import { PRIMARY, PRIMARY_LIGHT, BORDER, TEXT, TEXT_LIGHT } from '../../../components/styled';

/** Below this the sidebar becomes an off-canvas drawer behind a hamburger. */
const MOBILE = '@media (max-width: 900px)';
const SIDEBAR_WIDTH = 220;

const Shell = styled('div')({
  display: 'flex',
  minHeight: '100dvh',
  background: '#f7f7fb',
  fontFamily: 'Rubik, sans-serif',
});

/**
 * Open/closed is a static `[data-open]` rule, not a prop-conditional style:
 * a conditional transform inside a media query gives emotion two classes to
 * serialize, and the open one silently failed to inject under HMR.
 */
const Sidebar = styled('aside')({
  width: SIDEBAR_WIDTH,
  flexShrink: 0,
  background: '#fff',
  borderInlineEnd: `1px solid ${BORDER}`,
  display: 'flex',
  flexDirection: 'column',
  position: 'sticky',
  top: 0,
  height: '100dvh',
  [MOBILE]: {
    position: 'fixed',
    insetInlineStart: 0,
    top: 0,
    zIndex: 30,
    // A negative logical margin slides it off the inline-start edge, which is the
    // right side in RTL and the left in LTR. No direction-specific rule to outrank.
    // Closed simply isn't rendered. Sliding it with a logical offset was not
    // worth it: margin-inline-start did not resolve reliably here, and a drawer
    // that opens instantly is not a worse drawer.
    display: 'none',
    boxShadow: '0 0 40px rgba(0,0,0,0.18)',
  },
});

/** Inline style beats the media-query rule above, so open always wins. */
const DRAWER_OPEN_STYLE = { display: 'flex' } as const;

const Backdrop = styled('div')({
  display: 'none',
  [MOBILE]: {
    display: 'block',
    position: 'fixed',
    inset: 0,
    zIndex: 20,
    background: 'rgba(0,0,0,0.35)',
  },
});

const Brand = styled('div')({
  padding: '20px 18px',
  fontSize: 20,
  fontWeight: 700,
  color: PRIMARY,
  borderBottom: `1px solid ${BORDER}`,
});

const Nav = styled('nav')({
  flex: 1,
  overflowY: 'auto',
  padding: '10px 0',
});

const NavItem = styled(NavLink)({
  display: 'block',
  padding: '10px 18px',
  fontSize: 15,
  color: TEXT,
  textDecoration: 'none',
  borderInlineStart: '3px solid transparent',
  '&:hover': { background: '#fafaff' },
  '&.active': {
    background: PRIMARY_LIGHT,
    color: PRIMARY,
    fontWeight: 600,
    borderInlineStartColor: PRIMARY,
  },
  [MOBILE]: { padding: '13px 18px' },
});

/**
 * Leaves /manage for the Yooz admin dashboard — a different auth realm, so it
 * never matches a route here and never picks up `.active`. Muted and fenced off
 * below a rule so it doesn't read as one more /manage section.
 */
const BackItem = styled(NavItem)({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginTop: 8,
  paddingTop: 14,
  borderTop: `1px solid ${BORDER}`,
  color: TEXT_LIGHT,
  fontSize: 14,
  '&:hover': { background: '#fafaff', color: PRIMARY },
});

const OwnerDivider = styled('div')({
  margin: '10px 18px 6px',
  paddingTop: 10,
  borderTop: `1px solid ${BORDER}`,
  fontSize: 11,
  letterSpacing: 0.5,
  color: TEXT_LIGHT,
});

const UserBox = styled('div')({
  padding: '12px 18px',
  borderTop: `1px solid ${BORDER}`,
  fontSize: 13,
});

const UserName = styled('div')({ fontWeight: 600 });
const UserRole = styled('div')({ color: TEXT_LIGHT, fontSize: 12 });

const LogoutButton = styled('button')({
  marginTop: 6,
  padding: 0,
  border: 'none',
  background: 'none',
  color: TEXT_LIGHT,
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
  '&:hover': { color: PRIMARY },
});

const Content = styled('div')({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
});

/** Mobile-only bar: hamburger + current section, so the drawer is reachable. */
const TopBar = styled('header')({
  display: 'none',
  [MOBILE]: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 14px',
    background: '#fff',
    borderBottom: `1px solid ${BORDER}`,
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
});

const Hamburger = styled('button')({
  width: 38,
  height: 38,
  flexShrink: 0,
  display: 'grid',
  gap: 4,
  alignContent: 'center',
  justifyItems: 'stretch',
  padding: '0 8px',
  border: `1px solid ${BORDER}`,
  borderRadius: 9,
  background: '#fff',
  cursor: 'pointer',
  '& span': { display: 'block', height: 2, borderRadius: 2, background: TEXT },
});

const TopBarTitle = styled('div')({
  fontSize: 16,
  fontWeight: 600,
  color: PRIMARY,
});

const Main = styled('main')({
  flex: 1,
  padding: 28,
  minWidth: 0,
  [MOBILE]: { padding: 16 },
});

const ROLE_LABEL: Record<string, { he: string; en: string }> = {
  owner: { he: 'בעל העסק', en: 'Owner' },
  pm: { he: 'מנהל פרויקט', en: 'Project manager' },
  member: { he: 'עובד', en: 'Team member' },
};

export default function ManageLayout() {
  const { user, logout, isOwner } = useManageAuth();
  const { lang } = useLang();
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const he = lang === 'he';

  // Navigating inside the drawer must close it, or the new screen stays covered.
  useEffect(() => setDrawerOpen(false), [pathname]);

  const label = (item: (typeof MANAGE_NAV)[number]) => (he ? item.labelHe : item.labelEn);
  const visible = MANAGE_NAV.filter((i) => !i.ownerOnly || isOwner);
  const firstOwnerOnly = visible.find((i) => i.ownerOnly);
  const current = visible.find((i) => pathname === `/manage/${i.path}`);

  return (
    <Shell>
      {drawerOpen && <Backdrop onClick={() => setDrawerOpen(false)} />}
      <Sidebar style={drawerOpen ? DRAWER_OPEN_STYLE : undefined}>
        <Brand>{he ? 'ניהול יוז' : 'Yooz Manage'}</Brand>
        <Nav>
          {visible.map((item) => (
            <div key={item.path}>
              {item === firstOwnerOnly && (
                <OwnerDivider>{he ? 'למנהל בלבד' : 'OWNER ONLY'}</OwnerDivider>
              )}
              <NavItem to={`/manage/${item.path}`}>{label(item)}</NavItem>
            </div>
          ))}
          <BackItem to="/admin/dashboard">
            <span aria-hidden>{he ? '→' : '←'}</span>
            {he ? 'פאנל ניהול' : 'Admin panel'}
          </BackItem>
        </Nav>
        <UserBox>
          <UserName>{user?.name}</UserName>
          <UserRole>{user ? ROLE_LABEL[user.role][he ? 'he' : 'en'] : ''}</UserRole>
          <LogoutButton onClick={logout}>{he ? 'התנתקות' : 'Sign out'}</LogoutButton>
        </UserBox>
      </Sidebar>
      <Content>
        <TopBar>
          <Hamburger
            onClick={() => setDrawerOpen(true)}
            aria-label={he ? 'פתיחת תפריט' : 'Open menu'}
            aria-expanded={drawerOpen}
          >
            <span />
            <span />
            <span />
          </Hamburger>
          <TopBarTitle>{current ? label(current) : he ? 'ניהול יוז' : 'Yooz Manage'}</TopBarTitle>
        </TopBar>
        <TimerBar />
        <Main key={pathname}>
          <Outlet />
        </Main>
      </Content>
    </Shell>
  );
}
