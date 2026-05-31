/**
 * MissionTopMenu — a single info "i" button anchored top-right of the frame.
 * Tapping it opens a dropdown with Hebrew rows: יציאה (logout), מוזיקה (music),
 * עזרה (help). Tapping anywhere else closes the menu.
 *
 * Each row is shown only when its handler is supplied. This replaces the
 * older three-separate-icons row that was rendered on every mission screen.
 */
import { useEffect, useRef, useState } from 'react';
import { styled, keyframes } from '@mui/material/styles';

const MENU_FONT = "'Rubik', sans-serif";
const MENU_TEAL = '#39CABC';
const MENU_TEXT = '#F2F7FF';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const Container = styled('div')({
  position: 'absolute',
  top: 10,
  right: 12,
  zIndex: 15,
  direction: 'rtl',
  fontFamily: MENU_FONT,
});

const InfoButton = styled('button')({
  width: 34,
  height: 34,
  borderRadius: 10,
  background: 'rgba(0,0,0,0.55)',
  border: `1.5px solid rgba(255,255,255,0.25)`,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: MENU_TEXT,
  padding: 0,
  transition: 'background 0.2s, border-color 0.2s',
  '&:hover': { background: 'rgba(57,202,188,0.18)', borderColor: MENU_TEAL },
  '&:active': { transform: 'scale(0.94)' },
});

const Dropdown = styled('div')({
  position: 'absolute',
  top: 42,
  right: 0,
  minWidth: 170,
  background: 'rgba(20, 10, 40, 0.95)',
  border: `1.5px solid ${MENU_TEAL}`,
  borderRadius: 12,
  padding: 6,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  animation: `${fadeIn} 0.18s ease-out`,
});

const MenuItem = styled('button')({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  width: '100%',
  padding: '10px 12px',
  background: 'transparent',
  border: 'none',
  color: MENU_TEXT,
  fontFamily: MENU_FONT,
  fontSize: 15,
  fontWeight: 500,
  cursor: 'pointer',
  borderRadius: 8,
  textAlign: 'right',
  direction: 'rtl',
  transition: 'background 0.15s',
  '&:hover': { background: 'rgba(57,202,188,0.18)' },
  '&:active': { background: 'rgba(57,202,188,0.28)' },
});

const IconWrap = styled('span')({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 20,
  height: 20,
  flexShrink: 0,
  color: MENU_TEAL,
});

interface MissionTopMenuProps {
  onLogout?: () => void;
  toggleMute?: () => void;
  muted?: boolean;
  onHelp?: () => void;
}

export default function MissionTopMenu({ onLogout, toggleMute, muted, onHelp }: MissionTopMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on any pointerdown outside the menu container.
  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (containerRef.current && target && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    };
    window.addEventListener('pointerdown', handler);
    return () => window.removeEventListener('pointerdown', handler);
  }, [open]);

  const handleSelect = (action?: () => void) => {
    setOpen(false);
    action?.();
  };

  const hasAny = !!(onLogout || toggleMute || onHelp);
  if (!hasAny) return null;

  return (
    <Container ref={containerRef}>
      <InfoButton onClick={() => setOpen((o) => !o)} aria-label="תפריט" aria-expanded={open}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </InfoButton>

      {open && (
        <Dropdown role="menu">
          {onLogout && (
            <MenuItem role="menuitem" onClick={() => handleSelect(onLogout)}>
              <IconWrap>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </IconWrap>
              <span>יציאה</span>
            </MenuItem>
          )}
          {toggleMute && (
            <MenuItem role="menuitem" onClick={() => handleSelect(toggleMute)}>
              <IconWrap>
                {muted ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" stroke="none" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" stroke="none" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  </svg>
                )}
              </IconWrap>
              <span>{muted ? 'מוזיקה (כבוי)' : 'מוזיקה'}</span>
            </MenuItem>
          )}
          {onHelp && (
            <MenuItem role="menuitem" onClick={() => handleSelect(onHelp)}>
              <IconWrap>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </IconWrap>
              <span>עזרה</span>
            </MenuItem>
          )}
        </Dropdown>
      )}
    </Container>
  );
}
