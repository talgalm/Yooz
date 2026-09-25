import { useEffect, useRef, useState } from 'react';
import { styled } from '@mui/material/styles';
import { useTranslations } from '../../context/LanguageContext';
import { apiFetch } from '../../utils/api';
import { texts } from './groupEntry.i18n';
import { GroupEntryButton, GroupEntryError } from './styled';

interface Props {
  activityCode: string;
  groupToken: string;
  onClose: () => void;
  onSuccess: () => void;
}

const Overlay = styled('div')({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
  zIndex: 1000,
});

const Card = styled('div')({
  position: 'relative',
  width: '100%',
  maxWidth: 360,
  background: 'linear-gradient(160deg, #6a4bb0, #4a2f86)',
  borderRadius: 18,
  padding: '32px 22px 24px',
  boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
  color: '#fff',
  textAlign: 'center',
});

const CloseButton = styled('button')({
  position: 'absolute',
  top: 10,
  insetInlineEnd: 12,
  width: 32,
  height: 32,
  border: 'none',
  background: 'transparent',
  color: 'rgba(255,255,255,0.85)',
  fontSize: 24,
  lineHeight: 1,
  cursor: 'pointer',
});

const Message = styled('p')({
  fontSize: 16,
  fontWeight: 600,
  lineHeight: 1.5,
  margin: '0 0 20px',
});

const CodeRow = styled('div')({
  display: 'flex',
  gap: 10,
  justifyContent: 'center',
  direction: 'ltr',
  margin: '4px 0 16px',
});

const CodeBox = styled('input')({
  width: 52,
  height: 60,
  fontSize: 26,
  fontWeight: 700,
  textAlign: 'center',
  border: 'none',
  borderRadius: 12,
  background: '#fff',
  color: '#333',
  outline: 'none',
});

const SuccessMessage = styled('p')({
  fontSize: 18,
  fontWeight: 700,
  lineHeight: 1.5,
  margin: '8px 0',
});

type Stage = 'intro' | 'code' | 'success';

export default function GroupFullPopup({ activityCode, groupToken, onClose, onSuccess }: Props) {
  const t = useTranslations(texts);
  const [stage, setStage] = useState<Stage>('intro');
  const [digits, setDigits] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (stage === 'success') {
      const id = setTimeout(onSuccess, 1600);
      return () => clearTimeout(id);
    }
  }, [stage, onSuccess]);

  const redeem = async (code: string) => {
    setLoading(true);
    setError('');
    try {
      await apiFetch(`/api/activities/${encodeURIComponent(activityCode)}/groups/redeem-capacity`, {
        method: 'POST',
        body: JSON.stringify({ groupToken, code }),
      });
      setStage('success');
    } catch {
      setError(t.invalidCode);
      setDigits(['', '', '', '']);
      inputsRef.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleDigit = (i: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = digit;
    setDigits(next);
    setError('');
    if (digit && i < 3) inputsRef.current[i + 1]?.focus();
    if (next.every((d) => d) && !loading) void redeem(next.join(''));
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputsRef.current[i - 1]?.focus();
  };

  return (
    <Overlay onClick={onClose}>
      <Card onClick={(e) => e.stopPropagation()}>
        <CloseButton type="button" aria-label={t.closeAria} onClick={onClose}>×</CloseButton>

        {stage === 'intro' && (
          <>
            <Message>{t.fullTitle}</Message>
            <GroupEntryButton type="button" onClick={() => setStage('code')}>
              {t.addParticipants}
            </GroupEntryButton>
          </>
        )}

        {stage === 'code' && (
          <>
            <Message>{t.redeemInstructions}</Message>
            <CodeRow>
              {digits.map((d, i) => (
                <CodeBox
                  key={i}
                  ref={(el) => { inputsRef.current[i] = el; }}
                  value={d}
                  inputMode="numeric"
                  maxLength={1}
                  autoFocus={i === 0}
                  disabled={loading}
                  onChange={(e) => handleDigit(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                />
              ))}
            </CodeRow>
            {error && <GroupEntryError>{error}</GroupEntryError>}
          </>
        )}

        {stage === 'success' && <SuccessMessage>{t.redeemSuccess}</SuccessMessage>}
      </Card>
    </Overlay>
  );
}
