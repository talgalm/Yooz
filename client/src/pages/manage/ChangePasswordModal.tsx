import { useState, FormEvent } from 'react';
import { useLang } from '../../context/LanguageContext';
import { useManageAuth, ManageUser } from '../../context/ManageAuthContext';
import { manageApiFetch } from '../../utils/manageApi';
import {
  ModalBackdrop, ModalCard, ModalTitle, ModalActions, Field, SmallInput,
  Button, GhostButton, ErrorNote,
} from './manageUi';

/**
 * The one password screen in /manage. Opened voluntarily from the sidebar, and
 * forced (`forced`, no way out but signing out) after the owner hands out a
 * generated password — `mustChangePassword` is only cleared here.
 */
export default function ChangePasswordModal({ forced = false, onClose }: {
  forced?: boolean; onClose?: () => void;
}) {
  const { lang } = useLang();
  const he = lang === 'he';
  const { updateUser, logout } = useManageAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (next !== confirm) {
      setError(he ? 'הסיסמאות אינן תואמות.' : 'The passwords do not match.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const r = await manageApiFetch<{ user: ManageUser }>('/api/manage/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      updateUser(r.user);
      onClose?.();
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      setError(
        code === 'wrong_current_password' ? (he ? 'הסיסמה הנוכחית שגויה.' : 'The current password is wrong.')
          : code === 'password_too_short' ? (he ? 'הסיסמה חייבת להיות באורך 8 תווים לפחות.' : 'The password must be at least 8 characters.')
            : code,
      );
      setSaving(false);
    }
  };

  return (
    <ModalBackdrop onClick={forced ? undefined : onClose}>
      <ModalCard onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <ModalTitle>{he ? 'שינוי סיסמה' : 'Change password'}</ModalTitle>
        {forced && (
          <div style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 12 }}>
            {he
              ? 'זו סיסמה זמנית שקיבלת. יש לבחור סיסמה חדשה כדי להמשיך.'
              : 'You signed in with a temporary password. Choose a new one to continue.'}
          </div>
        )}
        {error && <ErrorNote>{error}</ErrorNote>}
        <form onSubmit={submit}>
          <Field>
            {he ? 'סיסמה נוכחית' : 'Current password'}
            <SmallInput
              type="password" value={current} onChange={(e) => setCurrent(e.target.value)}
              required autoFocus autoComplete="current-password"
            />
          </Field>
          <Field>
            {he ? 'סיסמה חדשה' : 'New password'}
            <SmallInput
              type="password" value={next} onChange={(e) => setNext(e.target.value)}
              minLength={8} required autoComplete="new-password"
            />
          </Field>
          <Field>
            {he ? 'אימות סיסמה חדשה' : 'Confirm new password'}
            <SmallInput
              type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              minLength={8} required autoComplete="new-password"
            />
          </Field>
          <div style={{ fontSize: 12.5, opacity: 0.7, marginTop: 8 }}>
            {he ? 'לפחות 8 תווים.' : 'At least 8 characters.'}
          </div>
          <ModalActions>
            <GhostButton type="button" onClick={forced ? logout : onClose}>
              {forced ? (he ? 'התנתקות' : 'Sign out') : (he ? 'ביטול' : 'Cancel')}
            </GhostButton>
            <Button type="submit" disabled={saving || next.length < 8}>
              {saving ? (he ? 'שומר...' : 'Saving...') : (he ? 'שמירה' : 'Save')}
            </Button>
          </ModalActions>
        </form>
      </ModalCard>
    </ModalBackdrop>
  );
}
