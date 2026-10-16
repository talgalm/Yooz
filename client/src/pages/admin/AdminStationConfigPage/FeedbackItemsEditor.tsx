import { useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { styled } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './FeedbackItemsEditor.i18n';
import { Input } from '../../../components/styled';
import { SectionLabel, SmallOutlineButton, InlineRowGap12 } from '../styled';
import type { FeedbackItem } from '../../../components/stations/feedbackItems';

export type KeyedFeedbackItem = FeedbackItem & { key: number };

let lastFeedbackItemKey = 0;

export function withFeedbackKeys(items: FeedbackItem[]): KeyedFeedbackItem[] {
  return items.map((item) => ({ ...item, key: ++lastFeedbackItemKey }));
}

const noForward = { shouldForwardProp: (prop: PropertyKey) => !String(prop).startsWith('$') };

const ItemRow = styled('div', noForward)<{ $dragging: boolean; $picked: boolean }>(({ $dragging, $picked }) => ({
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  flexWrap: 'wrap',
  margin: '0 -7px 2px',
  padding: '4px 6px',
  borderRadius: 12,
  border: `1px ${$dragging ? 'dashed #6c5ce7' : 'solid transparent'}`,
  background: $dragging ? '#f5f0ff' : 'transparent',
  opacity: $dragging ? 0.6 : 1,
  boxShadow: $picked ? '0 0 0 2px #6c5ce7, 0 4px 12px rgba(108,92,231,0.18)' : 'none',
  transition: 'box-shadow 120ms, opacity 120ms',
}));

const DragGrip = styled('span')({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 4px)',
  gap: 3,
  padding: '9px 6px',
  flexShrink: 0,
  cursor: 'grab',
  borderRadius: 6,
  userSelect: 'none',
  '& > span': { width: 4, height: 4, borderRadius: 1, background: '#a29bfe' },
  '&:hover': { backgroundColor: '#f0eefa' },
  '&:active': { cursor: 'grabbing' },
});

const GRIP_SQUARES = Array.from({ length: 9 }, (_, i) => i);

const KindBadge = styled('span', noForward)<{ $kind: FeedbackItem['type'] }>(({ $kind }) => ({
  flexShrink: 0,
  minWidth: 92,
  textAlign: 'center',
  padding: '6px 10px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  background: $kind === 'slider' ? '#f0eefa' : '#e8f6ef',
  color: $kind === 'slider' ? '#6c5ce7' : '#1e8449',
}));

const AddButton = styled('button', noForward)<{ $kind: FeedbackItem['type'] }>(({ $kind }) => ({
  background: $kind === 'slider' ? '#6c5ce7' : '#fff',
  border: `1px solid ${$kind === 'slider' ? '#6c5ce7' : '#1e8449'}`,
  borderRadius: 8,
  color: $kind === 'slider' ? '#fff' : '#1e8449',
  fontSize: 13,
  fontWeight: 600,
  padding: '10px 20px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'opacity 0.15s',
}));

interface Props {
  items: KeyedFeedbackItem[];
  setItems: Dispatch<SetStateAction<KeyedFeedbackItem[]>>;
}

export default function FeedbackItemsEditor({ items, setItems }: Props) {
  const t = useTranslations(texts);
  const [dragging, setDragging] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const rows = useRef(new Map<number, HTMLDivElement>());
  const tops = useRef(new Map<number, number>());
  const order = items.map((item) => item.key).join(',');

  useLayoutEffect(() => {
    rows.current.forEach((row, key) => {
      const top = row.offsetTop;
      const before = tops.current.get(key);
      tops.current.set(key, top);
      if (before === undefined || before === top) return;
      row.animate(
        [{ transform: `translateY(${before - top}px)` }, { transform: 'translateY(0)' }],
        { duration: 220, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
      );
    });
  }, [order]);

  const flash = (key: number) => {
    rows.current.get(key)?.animate(
      [{ backgroundColor: '#e6e0ff' }, { backgroundColor: 'rgba(230,224,255,0)' }],
      { duration: 800, easing: 'ease-out' },
    );
  };

  const move = (key: number, to: number) => {
    setItems((all) => {
      const from = all.findIndex((item) => item.key === key);
      if (from === -1 || from === to) return all;
      const next = [...all];
      next.splice(to, 0, ...next.splice(from, 1));
      return next;
    });
  };

  const update = (key: number, patch: { text?: string; placeholder?: string }) => {
    setItems((all) => all.map((item) => (item.key === key ? { ...item, ...patch } as KeyedFeedbackItem : item)));
  };

  const remove = (key: number) => {
    setItems((all) => all.filter((item) => item.key !== key));
    if (picked === key) setPicked(null);
  };

  const add = (item: FeedbackItem) => {
    setItems((all) => [...all, ...withFeedbackKeys([item])]);
  };

  return (
    <>
      <SectionLabel>{t.title}</SectionLabel>
      {items.map((item, slot) => (
        <ItemRow
          key={item.key}
          ref={(row) => { if (row) rows.current.set(item.key, row); else rows.current.delete(item.key); }}
          $dragging={dragging === item.key}
          $picked={picked === item.key}
          onDragOver={(e) => {
            if (dragging === null) return;
            e.preventDefault();
            if (dragging === item.key) return;
            const from = items.findIndex((other) => other.key === dragging);
            const box = e.currentTarget.getBoundingClientRect();
            const middle = box.top + box.height / 2;
            if (from < slot ? e.clientY > middle : e.clientY < middle) move(dragging, slot);
          }}
          onDrop={(e) => e.preventDefault()}
          onClick={() => {
            if (picked === null || picked === item.key) return;
            move(picked, slot);
            flash(picked);
            setPicked(null);
          }}
        >
          <DragGrip
            draggable
            title={t.dragHandle}
            onDragStart={(e) => {
              const row = rows.current.get(item.key);
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', String(item.key));
              if (row) {
                const box = row.getBoundingClientRect();
                e.dataTransfer.setDragImage(row, e.clientX - box.left, e.clientY - box.top);
              }
              setPicked(null);
              setDragging(item.key);
            }}
            onDragEnd={() => {
              flash(item.key);
              setDragging(null);
            }}
            onClick={(e) => {
              e.stopPropagation();
              setPicked((current) => (current === item.key ? null : item.key));
            }}
          >
            {GRIP_SQUARES.map((i) => <span key={i} />)}
          </DragGrip>
          <KindBadge $kind={item.type}>
            {slot + 1}. {item.type === 'slider' ? t.kindSlider : t.kindText}
          </KindBadge>
          <Input
            placeholder={item.type === 'slider' ? t.questionText : t.textPrompt}
            value={item.text}
            onChange={(e) => update(item.key, { text: e.target.value })}
            style={{ flex: '2 1 220px' }}
          />
          {item.type === 'text' && (
            <Input
              placeholder={t.textPlaceholder}
              value={item.placeholder}
              onChange={(e) => update(item.key, { placeholder: e.target.value })}
              style={{ flex: '1 1 180px' }}
            />
          )}
          <SmallOutlineButton type="button" onClick={() => remove(item.key)}>
            {t.remove}
          </SmallOutlineButton>
        </ItemRow>
      ))}
      <InlineRowGap12 style={{ marginTop: 6 }}>
        <AddButton type="button" $kind="slider" onClick={() => add({ type: 'slider', text: '' })}>
          + {t.addSlider}
        </AddButton>
        <AddButton type="button" $kind="text" onClick={() => add({ type: 'text', text: '', placeholder: '' })}>
          + {t.addText}
        </AddButton>
      </InlineRowGap12>
    </>
  );
}
