import { useEffect } from 'react';
import { styled } from '@mui/material/styles';
import { PrimaryButton, ModalOverlay, ModalCard, TEXT_LIGHT } from '../styled';
import {
  ModalButtonColumn,
  ModalTitle,
  HintModalHeading,
  HintModalHintBody,
  HintModalBulbWrap,
} from './styled';

function HintLightbulbIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#c9a227"
        d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"
      />
    </svg>
  );
}

/** Top-left screen dismiss — replaces Cancel; tap outside overlay also closes. */
const HintModalDismissX = styled('button')({
  position: 'absolute',
  top: 'max(10px, env(safe-area-inset-top, 10px))',
  left: 'max(10px, env(safe-area-inset-left, 10px))',
  zIndex: 1001,
  width: 36,
  height: 36,
  borderRadius: '50%',
  border: 'none',
  background: 'rgba(255,255,255,0.96)',
  color: TEXT_LIGHT,
  fontSize: 22,
  lineHeight: 1,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
  padding: 0,
  fontFamily: 'inherit',
  '&:active': {
    transform: 'scale(0.96)',
  },
});

const ModalActionButton = styled(PrimaryButton)({
  width: '100%',
  padding: '12px 20px',
  fontSize: 16,
  boxShadow: '0 4px 14px rgba(108, 92, 231, 0.35)',
});

const ModalCloseButton = styled(PrimaryButton)({
  width: '100%',
  padding: '12px 24px',
  fontSize: 16,
  boxShadow: '0 4px 14px rgba(108, 92, 231, 0.35)',
});

interface HintTranslations {
  hintWarning: string;
  hintCancel: string;
  hintConfirm: string;
  hintTitle: string;
  hintClose: string;
}

interface HintModalsProps {
  hintText?: string;
  showHintWarning: boolean;
  showHintText: boolean;
  onConfirm: () => void;
  onDismissWarning: () => void;
  onDismissText: () => void;
  t: HintTranslations;
}

export default function HintModals({
  hintText,
  showHintWarning,
  showHintText,
  onConfirm,
  onDismissWarning,
  onDismissText,
  t,
}: HintModalsProps) {
  const anyOpen = showHintWarning || showHintText;

  useEffect(() => {
    if (!anyOpen) return;
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [anyOpen]);

  return (
    <>
      {showHintWarning && (
        <ModalOverlay onClick={onDismissWarning}>
          <HintModalDismissX
            type="button"
            aria-label={t.hintCancel}
            onClick={(e) => {
              e.stopPropagation();
              onDismissWarning();
            }}
          >
            ×
          </HintModalDismissX>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <HintModalBulbWrap>
              <HintLightbulbIcon />
            </HintModalBulbWrap>
            <ModalTitle>{t.hintWarning}</ModalTitle>
            <ModalButtonColumn>
              <ModalActionButton onClick={onConfirm}>{t.hintConfirm}</ModalActionButton>
            </ModalButtonColumn>
          </ModalCard>
        </ModalOverlay>
      )}

      {showHintText && (
        <ModalOverlay onClick={onDismissText}>
          <HintModalDismissX
            type="button"
            aria-label={t.hintClose}
            onClick={(e) => {
              e.stopPropagation();
              onDismissText();
            }}
          >
            ×
          </HintModalDismissX>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <HintModalHeading>{t.hintTitle}</HintModalHeading>
            <HintModalBulbWrap>
              <HintLightbulbIcon />
            </HintModalBulbWrap>
            <HintModalHintBody>{hintText}</HintModalHintBody>
            <ModalCloseButton onClick={onDismissText}>{t.hintClose}</ModalCloseButton>
          </ModalCard>
        </ModalOverlay>
      )}
    </>
  );
}
