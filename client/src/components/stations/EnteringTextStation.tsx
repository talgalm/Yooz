import { useEffect, useMemo, useState } from 'react';
import { styled, keyframes } from '@mui/material/styles';
import type { StationItemData } from '../../pages/StoryModulePage/types';
import { StationContinueButton } from '../games/styled';
import { ModalOverlay, ModalCard } from '../styled';

const confettiFall = keyframes`
  0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
`;

const CONFETTI_COLORS = ['#ffca28', '#ff7043', '#66bb6a', '#42a5f5', '#ab47bc', '#26c6da', '#ffa726', '#ec407a'];

const ConfettiContainer = styled('div')({
  position: 'fixed',
  inset: 0,
  pointerEvents: 'none',
  zIndex: 1100,
  overflow: 'hidden',
});

const ConfettiPiece = styled('div')<{ x: number; sz: number; color: string; rot: number; dur: number; del: number }>(
  ({ x, sz, color, rot, dur, del }) => ({
    position: 'absolute',
    left: `${x}%`,
    top: -20,
    width: sz,
    height: sz * 0.6,
    background: color,
    borderRadius: 2,
    opacity: 0.9,
    transform: `rotate(${rot}deg)`,
    animation: `${confettiFall} ${dur}s ease-in ${del}s both`,
  }),
);

function ConfettiOverlay() {
  const [pieces] = useState(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      sz: 6 + Math.random() * 8,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      rot: Math.random() * 360,
      dur: 2.5 + Math.random() * 2,
      del: Math.random() * 2,
    }))
  );
  return (
    <ConfettiContainer>
      {pieces.map((p) => (
        <ConfettiPiece key={p.id} x={p.x} sz={p.sz} color={p.color} rot={p.rot} dur={p.dur} del={p.del} />
      ))}
    </ConfettiContainer>
  );
}

const Wrap = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '26px 16px 140px',
  boxSizing: 'border-box',
  overflowY: 'auto',
  direction: 'rtl',
});

const Card = styled('div')({
  width: '100%',
  maxWidth: 330,
  background: '#fef3c7',
  border: '2px solid #333',
  borderRadius: 16,
  padding: '18px 20px 22px',
  boxSizing: 'border-box',
  position: 'relative',
});

const HintIconButton = styled('button')({
  position: 'absolute',
  top: 14,
  right: 14,
  width: 32,
  height: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#fff',
  border: '2px solid #333',
  borderRadius: '50%',
  cursor: 'pointer',
  padding: 0,
  boxShadow: '0 2px 0 #333',
  zIndex: 2,
  '&:active': {
    transform: 'translateY(2px)',
    boxShadow: '0 0 0 #333',
  },
  '&:disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
});

const Title = styled('h2')({
  margin: '0 0 22px',
  fontSize: 44,
  fontWeight: 800,
  color: '#111',
  textAlign: 'center',
});

const FieldWrap = styled('div')({
  marginBottom: 24,
  '&:last-of-type': {
    marginBottom: 0,
  },
});

const Statement = styled('div')({
  fontSize: 22,
  fontWeight: 700,
  color: '#111',
  marginBottom: 8,
  textAlign: 'right',
});

const Input = styled('input')({
  width: '100%',
  border: 'none',
  borderBottom: '1.5px solid #666',
  borderRadius: 0,
  padding: '2px 2px 8px',
  fontSize: 16,
  background: 'transparent',
  color: '#111',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  outline: 'none',
  textAlign: 'right',
  '&::placeholder': {
    color: '#888',
    opacity: 1,
  },
});

const Row = styled('div')({
  position: 'fixed',
  bottom: 24,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 40,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  maxWidth: 280,
});

const PrimaryActionButton = styled(StationContinueButton)({
  width: '100%',
  maxWidth: 280,
  fontSize: 18,
  padding: '14px 24px',
  border: '3px solid #000',
  boxShadow: '0 3px 0 #000, 0 4px 20px rgba(124,77,255,0.35)',
  color: '#111',
  background: '#7c4dff',
  '&:active': {
    transform: 'translateY(3px)',
    boxShadow: '0 0 0 #000',
  },
});

const SecondaryActionButton = styled(StationContinueButton)({
  width: '100%',
  maxWidth: 280,
  fontSize: 18,
  padding: '14px 24px',
  border: '3px solid #000',
  boxShadow: '0 3px 0 #000',
  color: '#4c5b77',
  background: '#98aff1',
  '&:active': {
    transform: 'translateY(3px)',
    boxShadow: '0 0 0 #000',
  },
});

const AttemptsRow = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  fontSize: 14,
  color: '#555',
  marginBottom: 18,
  justifyContent: 'flex-start',
  direction: 'ltr',
});

const AttemptDot = styled('div')<{ used: string }>(({ used }) => ({
  width: 10,
  height: 10,
  borderRadius: '50%',
  background: used === 'true' ? '#6c5ce7' : 'transparent',
  border: used === 'true' ? '2px solid #6c5ce7' : '2px solid #888',
  boxSizing: 'border-box',
  flexShrink: 0,
}));

const ErrorText = styled('div')({
  color: '#b91c1c',
  fontSize: 13,
  fontWeight: 600,
  marginTop: 10,
  textAlign: 'right',
});

const SuccessCard = styled(ModalCard)({
  direction: 'rtl',
  textAlign: 'center',
  padding: '32px 28px 24px',
});

const SuccessTitle = styled('h2')({
  margin: '0 0 10px',
  fontSize: 26,
  fontWeight: 800,
  color: '#111',
});

const SuccessSubtitle = styled('p')({
  margin: '0 0 20px',
  fontSize: 16,
  color: '#444',
  lineHeight: 1.5,
});

const SuccessMedia = styled('img')({
  width: '100%',
  maxHeight: 260,
  objectFit: 'contain',
  borderRadius: 10,
  marginBottom: 20,
});

const SuccessVideo = styled('video')({
  width: '100%',
  maxHeight: 260,
  borderRadius: 10,
  marginBottom: 20,
});

const SuccessContinueButton = styled(StationContinueButton)({
  width: '100%',
  background: '#6c5ce7',
  border: '3px solid #000',
  boxShadow: '0 3px 0 #000',
  color: '#fff',
  fontSize: 18,
  padding: '14px 24px',
  '&:active': {
    transform: 'translateY(3px)',
    boxShadow: '0 0 0 #000',
  },
});

interface EnteringTextField {
  statement?: string;
  placeholder?: string;
  description?: string;
  rightAnswer?: string;
  keywordsBank?: string;
}

interface EnteringTextStationProps {
  station: StationItemData;
  onContinue: () => void;
  onBackToRoadmap?: () => void;
  onFinishActivity?: () => void;
  code?: string;
  stationHintText?: string | null;
  stationHintUsed?: boolean;
  onStationHintClick?: () => void;
  hintLabel?: string;
}

export default function EnteringTextStation({ station, onContinue, onBackToRoadmap, onFinishActivity, code, stationHintText, stationHintUsed, onStationHintClick, hintLabel }: EnteringTextStationProps) {
  const fields = useMemo(() => {
    const raw = station.settings?.fields;
    if (!Array.isArray(raw)) return [];
    return raw.filter(Boolean) as EnteringTextField[];
  }, [station.settings]);

  const sessionStorageKey = code ? `yooz_entering_text_${code}_${station._id}` : undefined;

  const [values, setValues] = useState<string[]>(() => fields.map(() => ''));
  const [attempts, setAttempts] = useState<number>(() => {
    if (typeof window === 'undefined' || !sessionStorageKey) return 0;
    try {
      const raw = window.sessionStorage.getItem(sessionStorageKey);
      if (!raw) return 0;
      const parsed = JSON.parse(raw) as { attempts?: number };
      return typeof parsed?.attempts === 'number' && parsed.attempts >= 0 ? parsed.attempts : 0;
    } catch {
      return 0;
    }
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingDots, setLoadingDots] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showFailure, setShowFailure] = useState(false);

  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => setLoadingDots((d) => (d % 3) + 1), 400);
    return () => clearInterval(id);
  }, [loading]);

  useEffect(() => {
    setValues(fields.map(() => ''));
    setError('');
  }, [fields]);

  useEffect(() => {
    if (typeof window === 'undefined' || !sessionStorageKey) return;
    try {
      window.sessionStorage.setItem(sessionStorageKey, JSON.stringify({ attempts }));
    } catch {
      /* best effort */
    }
  }, [attempts, sessionStorageKey]);

  const title = (station.settings?.title as string) || 'פתרון התעלומה';
  const submitButtonText = (station.settings?.submitButtonText as string) || 'תשובה סופית';
  const returnButtonText = (station.settings?.returnButtonText as string) || 'חזרה לחקירה';
  const maxAttemptsRaw = Number(station.settings?.maxAttempts);
  const maxAttempts = Number.isFinite(maxAttemptsRaw) && maxAttemptsRaw > 0 ? maxAttemptsRaw : 3;
  const successTitle = station.settings?.successTitle as string | undefined;
  const successSubtitle = station.settings?.successSubtitle as string | undefined;
  const successMediaType = station.settings?.successMediaType as 'image' | 'video' | undefined;
  const successMediaUrl = station.settings?.successMediaUrl as string | undefined;
  const hasSuccessPopup = !!(successTitle || successMediaUrl);
  const failureTitle = (station.settings?.failureTitle as string) || 'לא הצלחת לענות נכון';
  const failureSubtitle = (station.settings?.failureSubtitle as string) || 'ניצלת את כל הניסיונות. נחזור לחקירה.';
  const failureContinueText = (station.settings?.failureContinueText as string) || 'חזרה לחקירה';
  const isLastStep = !!station.settings?.lastStep;
  const handleSuccessContinue = isLastStep && onFinishActivity ? onFinishActivity : onContinue;

  useEffect(() => {
    if (attempts >= maxAttempts && !showSuccess) {
      setShowFailure(true);
    }
  }, []);

  const handleBack = () => {
    if (onBackToRoadmap) {
      onBackToRoadmap();
    } else {
      onContinue();
    }
  };

  const clearPersistedAttempts = () => {
    if (typeof window === 'undefined' || !sessionStorageKey) return;
    try {
      window.sessionStorage.removeItem(sessionStorageKey);
    } catch {
      /* best effort */
    }
  };

  const handleFailureDismiss = () => {
    setShowFailure(false);
    handleBack();
  };

  const handleCorrect = () => {
    clearPersistedAttempts();
    if (!hasSuccessPopup) {
      handleSuccessContinue();
      return;
    }
    if (successMediaType === 'image' && successMediaUrl) {
      const img = new Image();
      img.onload = () => setShowSuccess(true);
      img.onerror = () => setShowSuccess(true);
      img.src = successMediaUrl;
      // Fallback: show after 3s even if image stalls
      setTimeout(() => setShowSuccess(true), 3000);
    } else {
      setShowSuccess(true);
    }
  };

  const handleSubmit = async () => {
    const hasEmpty = fields.some((_, i) => !(values[i] || '').trim());
    if (hasEmpty) {
      const next = attempts + 1;
      setAttempts(next);
      const remaining = Math.max(maxAttempts - next, 0);
      if (remaining > 0) {
        setError(`נא למלא את כל השדות. נשארו ${remaining} ניסיונות.`);
      } else {
        setError('');
        setShowFailure(true);
      }
      return;
    }

    const fieldsToCheck = fields.map((f, i) => ({
      userAnswer: values[i] || '',
      rightAnswer: f.rightAnswer || '',
      keywordsBank: f.keywordsBank || '',
    }));

    const hasValidation = fieldsToCheck.some((f) => f.rightAnswer.trim());

    if (!hasValidation) {
      handleCorrect();
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/check-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: fieldsToCheck }),
      });
      const data = await res.json() as { results?: boolean[] };
      const allCorrect = data.results?.every(Boolean) ?? false;

      if (allCorrect) {
        handleCorrect();
      } else {
        const next = attempts + 1;
        setAttempts(next);
        const remaining = Math.max(maxAttempts - next, 0);
        if (remaining > 0) {
          setError(`תשובה לא נכונה. נשארו ${remaining} ניסיונות.`);
        } else {
          setError('');
          setShowFailure(true);
        }
      }
    } catch {
      setError('שגיאה בבדיקה, נסו שוב.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Wrap>
      <Title>{title}</Title>
      <Card>
        {stationHintText && onStationHintClick && (
          <HintIconButton
            type="button"
            onClick={onStationHintClick}
            aria-label={hintLabel || 'רמז'}
            title={hintLabel || 'רמז'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stationHintUsed ? '#7c4dff' : '#333'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18h6" />
              <path d="M10 22h4" />
              <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z" />
            </svg>
          </HintIconButton>
        )}
        <AttemptsRow>
          {[...Array(maxAttempts)].map((_, i) => (
            <AttemptDot key={i} used={String(i < attempts)} />
          ))}
          <span style={{ direction: 'rtl', unicodeBidi: 'isolate' }}>נסיונות:</span>
        </AttemptsRow>
        {fields.map((field, index) => (
          <FieldWrap key={index}>
            <Statement>{field.statement || `Field ${index + 1}`}</Statement>
            <Input
              value={values[index] || ''}
              placeholder={field.placeholder || field.description || 'הזינו תשובה'}
              onChange={(e) => {
                const next = [...values];
                next[index] = e.target.value;
                setValues(next);
              }}
            />
          </FieldWrap>
        ))}
        {error && <ErrorText>{error}</ErrorText>}
      </Card>
      <Row>
        <PrimaryActionButton
          type="button"
          onClick={handleSubmit}
          disabled={loading || attempts >= maxAttempts}
        >
          {loading ? `בודק${'.'.repeat(loadingDots)}` : submitButtonText}
        </PrimaryActionButton>
        <SecondaryActionButton
          type="button"
          onClick={handleBack}
        >
          {returnButtonText}
        </SecondaryActionButton>
      </Row>
      {showSuccess && (
        <>
          <ConfettiOverlay />
          <ModalOverlay>
          <SuccessCard onClick={(e) => e.stopPropagation()}>
            {successTitle && <SuccessTitle>{successTitle}</SuccessTitle>}
            {successSubtitle && <SuccessSubtitle>{successSubtitle}</SuccessSubtitle>}
            {successMediaUrl && successMediaType === 'image' && (
              <SuccessMedia src={successMediaUrl} alt="" />
            )}
            {successMediaUrl && successMediaType === 'video' && (
              <SuccessVideo src={successMediaUrl} autoPlay controls />
            )}
            <SuccessContinueButton type="button" onClick={handleSuccessContinue}>
              המשיכו
            </SuccessContinueButton>
          </SuccessCard>
        </ModalOverlay>
        </>
      )}
      {showFailure && (
        <ModalOverlay>
          <SuccessCard onClick={(e) => e.stopPropagation()}>
            <SuccessTitle>{failureTitle}</SuccessTitle>
            <SuccessSubtitle>{failureSubtitle}</SuccessSubtitle>
            <SuccessContinueButton type="button" onClick={handleFailureDismiss}>
              {failureContinueText}
            </SuccessContinueButton>
          </SuccessCard>
        </ModalOverlay>
      )}
    </Wrap>
  );
}
