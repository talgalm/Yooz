import { styled } from '@mui/material/styles';
import {
  PrimaryButton,
  OutlineButton,
  ModalOverlay,
  ModalCard,
} from '../styled';
import { ModalButtonRow, ModalTitle, ModalBody, ModalBodySmall } from './styled';

const ModalActionButton = styled(PrimaryButton)({
  width: 'auto',
  padding: '10px 20px',
  fontSize: 14,
});

const ModalCloseButton = styled(PrimaryButton)({
  width: 'auto',
  padding: '10px 24px',
  fontSize: 14,
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

/**
 * Reusable hint modals (warning + text display) shared across all game components.
 */
export default function HintModals({
  hintText,
  showHintWarning,
  showHintText,
  onConfirm,
  onDismissWarning,
  onDismissText,
  t,
}: HintModalsProps) {
  return (
    <>
      {/* Hint warning modal */}
      {showHintWarning && (
        <ModalOverlay onClick={onDismissWarning}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <ModalTitle>{t.hintWarning}</ModalTitle>
            <ModalButtonRow>
              <OutlineButton onClick={onDismissWarning}>{t.hintCancel}</OutlineButton>
              <ModalActionButton onClick={onConfirm}>
                {t.hintConfirm}
              </ModalActionButton>
            </ModalButtonRow>
          </ModalCard>
        </ModalOverlay>
      )}

      {/* Hint text modal */}
      {showHintText && (
        <ModalOverlay onClick={onDismissText}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <ModalBodySmall>{t.hintTitle}</ModalBodySmall>
            <ModalBody>{hintText}</ModalBody>
            <ModalCloseButton onClick={onDismissText}>
              {t.hintClose}
            </ModalCloseButton>
          </ModalCard>
        </ModalOverlay>
      )}
    </>
  );
}
