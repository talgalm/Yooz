import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from '../../context/LanguageContext';
import { texts } from './GroupSelector.i18n';
import { styled, keyframes } from '@mui/material/styles';
import { PRIMARY, PRIMARY_LIGHT, TEXT } from '../styled';

const PANEL_GAP = 8;
const PANEL_MAX_HEIGHT = 320;
const PANEL_MIN_HEIGHT = 160;

const noForward = { shouldForwardProp: (prop: PropertyKey) => !String(prop).startsWith('$') };

const panelIn = keyframes`
  from { opacity: 0; transform: translateY(-6px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const Trigger = styled('button', noForward)<{ $open: boolean; $hasValue: boolean }>(({ $open, $hasValue }) => ({
  position: 'relative',
  width: '100%',
  padding: '16px 20px',
  paddingInlineEnd: 52,
  fontSize: 16,
  fontWeight: $hasValue ? 600 : 400,
  fontFamily: 'inherit',
  textAlign: 'start',
  color: $hasValue ? TEXT : '#aaa',
  background: '#fff',
  border: 'none',
  borderRadius: 12,
  boxSizing: 'border-box',
  cursor: 'pointer',
  outline: 'none',
  boxShadow: $open ? `0 0 0 3px rgba(108, 92, 231, 0.45)` : 'none',
  transition: 'box-shadow 0.15s ease',
  '&:focus-visible': { boxShadow: `0 0 0 3px rgba(108, 92, 231, 0.45)` },
}));

const Chevron = styled('span', noForward)<{ $open: boolean }>(({ $open }) => ({
  position: 'absolute',
  insetInlineEnd: 22,
  top: '50%',
  width: 8,
  height: 8,
  borderRight: `2px solid ${$open ? PRIMARY : '#999'}`,
  borderBottom: `2px solid ${$open ? PRIMARY : '#999'}`,
  transform: $open ? 'translateY(-25%) rotate(225deg)' : 'translateY(-70%) rotate(45deg)',
  transition: 'transform 0.18s ease, border-color 0.18s ease',
  pointerEvents: 'none',
}));

const Panel = styled('ul')({
  position: 'fixed',
  zIndex: 1000,
  margin: 0,
  padding: 6,
  listStyle: 'none',
  boxSizing: 'border-box',
  background: '#fff',
  borderRadius: 14,
  boxShadow: '0 14px 36px rgba(30, 10, 60, 0.28), 0 2px 8px rgba(30, 10, 60, 0.12)',
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  animation: `${panelIn} 0.14s ease-out`,
});

const Option = styled('li', noForward)<{ $selected: boolean; $active: boolean }>(({ $selected, $active }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '13px 14px',
  borderRadius: 10,
  fontSize: 16,
  fontWeight: $selected ? 700 : 500,
  color: $selected ? PRIMARY : TEXT,
  background: $active ? PRIMARY_LIGHT : 'transparent',
  cursor: 'pointer',
  userSelect: 'none',
  overflowWrap: 'anywhere',
}));

const Check = styled('span')({
  flexShrink: 0,
  color: PRIMARY,
  fontWeight: 800,
  fontSize: 17,
});

interface GroupConfig {
  name: string;
}

interface Props {
  groups: GroupConfig[];
  value: string;
  onChange: (groupName: string) => void;
}

interface PanelPlace {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
}

function placeBelowOrAbove(field: DOMRect): PanelPlace {
  const below = window.innerHeight - field.bottom - PANEL_GAP * 2;
  const above = field.top - PANEL_GAP * 2;
  const opensDown = below >= Math.min(PANEL_MAX_HEIGHT, PANEL_MIN_HEIGHT) || below >= above;
  const room = Math.max(PANEL_MIN_HEIGHT, Math.min(PANEL_MAX_HEIGHT, opensDown ? below : above));
  return opensDown
    ? { left: field.left, width: field.width, top: field.bottom + PANEL_GAP, maxHeight: room }
    : { left: field.left, width: field.width, bottom: window.innerHeight - field.top + PANEL_GAP, maxHeight: room };
}

export default function GroupSelector({ groups, value, onChange }: Props) {
  const t = useTranslations(texts);
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [place, setPlace] = useState<PanelPlace | null>(null);

  const reposition = useCallback(() => {
    const field = triggerRef.current?.getBoundingClientRect();
    if (field) setPlace(placeBelowOrAbove(field));
  }, []);

  const openList = () => {
    setActive(Math.max(0, groups.findIndex((g) => g.name === value)));
    setOpen(true);
  };

  const choose = (name: string) => {
    onChange(name);
    setOpen(false);
    triggerRef.current?.focus();
  };

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (e: PointerEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  useEffect(() => {
    if (!open || active < 0) return;
    panelRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(groups.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if ((e.key === 'Enter' || e.key === ' ') && groups[active]) {
      e.preventDefault();
      choose(groups[active].name);
    }
  };

  return (
    <>
      <Trigger
        ref={triggerRef}
        type="button"
        $open={open}
        $hasValue={!!value}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
      >
        {value || t.chooseGroup}
        <Chevron $open={open} aria-hidden />
      </Trigger>

      {open && place && createPortal(
        <Panel
          ref={panelRef}
          id={listId}
          role="listbox"
          aria-label={t.chooseGroup}
          style={{ left: place.left, width: place.width, top: place.top, bottom: place.bottom, maxHeight: place.maxHeight }}
        >
          {groups.map((g, i) => (
            <Option
              key={g.name}
              role="option"
              aria-selected={g.name === value}
              $selected={g.name === value}
              $active={i === active}
              onPointerEnter={() => setActive(i)}
              onClick={() => choose(g.name)}
            >
              <span>{g.name}</span>
              {g.name === value && <Check aria-hidden>✓</Check>}
            </Option>
          ))}
        </Panel>,
        document.body,
      )}
    </>
  );
}
