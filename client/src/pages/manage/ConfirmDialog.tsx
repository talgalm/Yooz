import { useTranslations } from '../../context/LanguageContext';
import { texts } from './ConfirmDialog.i18n';
import { ModalBackdrop, ModalCard, ModalTitle, ModalActions, GhostButton, DangerButton, Button } from './manageUi';

interface Props {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * In-app replacement for window.confirm.
 *
 * Native confirm() is suppressed in sandboxed and embedded browser contexts —
 * it silently returns false, so the destructive action just never fires and the
 * user sees nothing at all. Every destructive action in /manage goes through here.
 */
export default function ConfirmDialog({
  title, message, confirmLabel, danger = true, busy = false, onConfirm, onCancel,
}: Props) {
  const t = useTranslations(texts);
  const ConfirmButton = danger ? DangerButton : Button;

  return (
    <ModalBackdrop onClick={onCancel}>
      <ModalCard onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <ModalTitle>{title}</ModalTitle>
        {message && <div style={{ fontSize: 14, lineHeight: 1.5 }}>{message}</div>}
        <ModalActions>
          <GhostButton onClick={onCancel} disabled={busy}>
            {t.cancel}
          </GhostButton>
          <ConfirmButton onClick={onConfirm} disabled={busy}>
            {busy ? t.deleting : (confirmLabel ?? t.delete)}
          </ConfirmButton>
        </ModalActions>
      </ModalCard>
    </ModalBackdrop>
  );
}
