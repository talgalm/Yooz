import { useRef } from 'react';
import styled from '@emotion/styled';
import { useTranslations } from '../context/LanguageContext';
import { texts } from './SmsConsent.i18n';

const DialogBody = styled.div({
  padding: '20px 22px',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  maxHeight: '85dvh',
  overflowY: 'scroll',
  boxSizing: 'border-box',
  scrollbarWidth: 'thin',
  scrollbarColor: '#bbb transparent',
  '&::-webkit-scrollbar': { width: 6 },
  '&::-webkit-scrollbar-thumb': { background: '#bbb', borderRadius: 3 },
  '&::-webkit-scrollbar-track': { background: 'transparent' },
});

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
}

export default function SmsConsent({ checked, onChange }: Props) {
  const t = useTranslations(texts);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const openDialog = () => {
    dialogRef.current?.showModal();
    titleRef.current?.focus({ preventScroll: true });
    requestAnimationFrame(() => {
      if (bodyRef.current) bodyRef.current.scrollTop = 0;
    });
  };

  return (
    <>
      <label
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          color: 'rgba(255,255,255,0.9)',
          fontSize: 14,
          lineHeight: 1.4,
          textAlign: 'start',
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22,
            height: 22,
            flexShrink: 0,
            marginTop: 1,
          }}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            style={{
              margin: 0,
              width: '100%',
              height: '100%',
              appearance: 'none',
              WebkitAppearance: 'none',
              border: '2px solid #fff',
              borderRadius: 4,
              background: checked ? '#fff' : 'transparent',
              cursor: 'pointer',
            }}
            required
          />
          {checked && (
            <span
              aria-hidden
              style={{
                position: 'absolute',
                color: '#632e7d',
                fontSize: 16,
                fontWeight: 900,
                lineHeight: 1,
                pointerEvents: 'none',
              }}
            >
              ✓
            </span>
          )}
        </span>
        <span>
          {t.prefix}
          <button
            type="button"
            onClick={openDialog}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: 0,
              font: 'inherit',
            }}
          >
            {t.link}
          </button>
          {t.suffix}
        </span>
      </label>

      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
        style={{
          border: 'none',
          borderRadius: 16,
          padding: 0,
          maxWidth: 'min(92vw, 420px)',
          width: '100%',
          maxHeight: '85dvh',
          background: '#fff',
          color: '#222',
        }}
      >
        <DialogBody ref={bodyRef}>
          <h3 ref={titleRef} tabIndex={-1} style={{ margin: 0, fontSize: 18, fontWeight: 800, outline: 'none' }}>{t.title}</h3>
          {t.body.map((p, i) => (
            <p key={i} style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{p}</p>
          ))}
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            style={{
              alignSelf: 'stretch',
              marginTop: 4,
              padding: '12px 18px',
              fontSize: 15,
              fontWeight: 700,
              color: '#fff',
              background: '#632e7d',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              fontFamily: 'inherit',
              outline: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {t.close}
          </button>
        </DialogBody>
      </dialog>
    </>
  );
}
