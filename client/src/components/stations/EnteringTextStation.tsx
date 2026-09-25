import { useEffect, useMemo, useState } from 'react';
import { styled, keyframes } from '@mui/material/styles';
import type { StationItemData } from '../../pages/StoryModulePage/types';
import { StationContinueButton, DESKTOP_BREAKPOINT, DESKTOP_STATION_WIDTH, DesktopStationHeaderBand } from '../games/styled';
import { ModalOverlay, ModalCard } from '../styled';
import { useTranslations } from '../../context/LanguageContext';
import { texts } from './EnteringTextStation.i18n';

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
  [DESKTOP_BREAKPOINT]: {
    width: '100%',
    padding: '32px 24px 180px',
  },
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
  [DESKTOP_BREAKPOINT]: {
    maxWidth: DESKTOP_STATION_WIDTH,
    borderRadius: 32,
    padding: '32px 48px 40px',
  },
});

const ConfirmModalActions = styled('div')({
  display: 'flex',
  gap: 10,
  marginTop: 16,
  justifyContent: 'center',
});

const ConfirmModalSecondary = styled('button')({
  flex: 1,
  padding: '12px 18px',
  borderRadius: 10,
  border: '2px solid #333',
  background: '#fff',
  color: '#333',
  fontWeight: 700,
  fontSize: 15,
  cursor: 'pointer',
  fontFamily: 'inherit',
});

const ConfirmModalPrimary = styled('button')({
  flex: 1,
  padding: '12px 18px',
  borderRadius: 10,
  border: '2px solid #333',
  background: '#7c4dff',
  color: '#fff',
  fontWeight: 700,
  fontSize: 15,
  cursor: 'pointer',
  fontFamily: 'inherit',
});

const Title = styled('h2')({
  margin: '0 0 16px',
  fontSize: 26,
  fontWeight: 800,
  color: '#fff',
  WebkitTextStroke: '1.5px #000',
  paintOrder: 'stroke fill',
  textAlign: 'center',
  paddingTop: 8,
  [DESKTOP_BREAKPOINT]: {
    margin: 0,
    paddingTop: 0,
    fontSize: 42,
    fontWeight: 700,
    color: '#111',
    WebkitTextStroke: '0',
  },
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
  textAlign: 'start',
  [DESKTOP_BREAKPOINT]: {
    fontSize: 28,
    marginBottom: 12,
  },
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
  textAlign: 'start',
  '&::placeholder': {
    color: '#888',
    opacity: 1,
  },
  [DESKTOP_BREAKPOINT]: {
    fontSize: 22,
    padding: '4px 2px 12px',
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
  [DESKTOP_BREAKPOINT]: {
    maxWidth: 427,
    bottom: 32,
    gap: 14,
  },
});

const PrimaryActionButton = styled(StationContinueButton)({
  width: '100%',
  maxWidth: 280,
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

const BelowCardRow = styled('div')({
  width: '100%',
  maxWidth: 330,
  marginTop: 14,
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  [DESKTOP_BREAKPOINT]: {
    maxWidth: DESKTOP_STATION_WIDTH,
    marginTop: 20,
  },
});

const BelowAttemptsRow = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  fontSize: 14,
  color: '#fff',
  direction: 'ltr',
});

const SmallHintButton = styled('button')({
  padding: '6px 18px',
  fontSize: 13,
  fontWeight: 700,
  color: '#fff',
  background: '#6c5ce7',
  border: '2px solid #5143c6',
  borderRadius: 8,
  cursor: 'pointer',
  boxShadow: '0 2px 0 #5143c6',
  fontFamily: 'inherit',
  '&:active': {
    background: '#5b4ed6',
    boxShadow: '0 1px 0 #5143c6',
    transform: 'translateY(1px)',
  },
  '&:disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
});

const SolutionHintTextButton = styled(SmallHintButton)({
  background: '#fef3c7',
  color: '#7a4d00',
  border: '2px solid #b88300',
  boxShadow: '0 2px 0 #b88300',
  '&:active': {
    background: '#fde9a0',
    boxShadow: '0 1px 0 #b88300',
    transform: 'translateY(1px)',
  },
});

const HintGroup = styled('div')({
  display: 'flex',
  gap: 8,
  alignItems: 'center',
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
  textAlign: 'start',
});

const SuccessCard = styled(ModalCard)({
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
  /** Called when the participant confirms the "show solution" hint — parent applies the 4-min penalty. */
  onSolutionHintUsed?: () => void;
  solutionHintLabel?: string;
  solutionHintWarning?: string;
  solutionHintConfirmLabel?: string;
  hintCancelLabel?: string;
  retryTitle?: string;
  retryMessage?: string;
  retryButtonLabel?: string;
  textColor?: string;
}

export default function EnteringTextStation({
  station,
  onContinue,
  onBackToRoadmap,
  onFinishActivity,
  code,
  stationHintText,
  stationHintUsed,
  onStationHintClick,
  hintLabel,
  onSolutionHintUsed,
  solutionHintLabel,
  solutionHintWarning,
  solutionHintConfirmLabel,
  hintCancelLabel,
  retryTitle,
  retryMessage,
  retryButtonLabel,
  textColor,
}: EnteringTextStationProps) {
  const t = useTranslations(texts);
  const fields = useMemo(() => {
    const raw = station.settings?.fields;
    if (!Array.isArray(raw)) return [];
    return raw.filter(Boolean) as EnteringTextField[];
  }, [station.settings]);

  const sessionStorageKey = code ? `yooz_entering_text_${code}_${station._id}` : undefined;

  const persistedState = (() => {
    const fallback = { attempts: 0, failedRoundCount: 0, solutionHintUsed: false };
    if (typeof window === 'undefined' || !sessionStorageKey) return fallback;
    try {
      const raw = window.sessionStorage.getItem(sessionStorageKey);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw) as { attempts?: number; failedRoundCount?: number; solutionHintUsed?: boolean };
      return {
        attempts: typeof parsed?.attempts === 'number' && parsed.attempts >= 0 ? parsed.attempts : 0,
        failedRoundCount: typeof parsed?.failedRoundCount === 'number' && parsed.failedRoundCount >= 0 ? parsed.failedRoundCount : 0,
        solutionHintUsed: !!parsed?.solutionHintUsed,
      };
    } catch {
      return fallback;
    }
  })();

  const [values, setValues] = useState<string[]>(() => fields.map(() => ''));
  const [attempts, setAttempts] = useState<number>(persistedState.attempts);
  const [failedRoundCount, setFailedRoundCount] = useState<number>(persistedState.failedRoundCount);
  const [solutionHintUsed, setSolutionHintUsed] = useState<boolean>(persistedState.solutionHintUsed);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingDots, setLoadingDots] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showRetryPopup, setShowRetryPopup] = useState(false);
  const [showSolutionHintWarning, setShowSolutionHintWarning] = useState(false);

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
      window.sessionStorage.setItem(
        sessionStorageKey,
        JSON.stringify({ attempts, failedRoundCount, solutionHintUsed }),
      );
    } catch {
      /* best effort */
    }
  }, [attempts, failedRoundCount, solutionHintUsed, sessionStorageKey]);

  const title = (station.settings?.title as string) || t.title;
  const submitButtonText = (station.settings?.submitButtonText as string) || t.submit;
  const returnButtonText = (station.settings?.returnButtonText as string) || t.back;
  const maxAttemptsRaw = Number(station.settings?.maxAttempts);
  const maxAttempts = Number.isFinite(maxAttemptsRaw) && maxAttemptsRaw > 0 ? maxAttemptsRaw : 3;
  const successTitle = station.settings?.successTitle as string | undefined;
  const successSubtitle = station.settings?.successSubtitle as string | undefined;
  const successMediaType = station.settings?.successMediaType as 'image' | 'video' | undefined;
  const successMediaUrl = station.settings?.successMediaUrl as string | undefined;
  const hasSuccessPopup = !!(successTitle || successMediaUrl);
  const isLastStep = !!station.settings?.lastStep;
  const handleSuccessContinue = isLastStep && onFinishActivity ? onFinishActivity : onContinue;
  const solutionHintConfig = station.settings?.solutionHint as { enabled?: boolean } | undefined;
  const solutionHintEnabled = !!solutionHintConfig?.enabled;
  // Visibility rule: solution hint enabled AND user has failed at least one
  // round AND has used the regular hint AND hasn't used solution hint yet.
  const showSolutionHintIcon =
    solutionHintEnabled && failedRoundCount >= 1 && !!stationHintUsed && !solutionHintUsed;

  useEffect(() => {
    if (attempts >= maxAttempts && !showSuccess) {
      setShowRetryPopup(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleRetryDismiss = () => {
    setShowRetryPopup(false);
    clearPersistedAttempts();
    handleSuccessContinue();
  };

  const handleSolutionHintClick = () => {
    if (!solutionHintEnabled || solutionHintUsed) return;
    setShowSolutionHintWarning(true);
  };

  const handleSolutionHintConfirm = () => {
    setShowSolutionHintWarning(false);
    setSolutionHintUsed(true);
    // Fill each input with the configured rightAnswer.
    setValues(fields.map((f) => (f.rightAnswer || '').toString()));
    setError('');
    // Apply the 4-minute time penalty via parent.
    if (onSolutionHintUsed) onSolutionHintUsed();
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

  const triggerFailedRound = () => {
    setError('');
    setFailedRoundCount((n) => n + 1);
    setShowRetryPopup(true);
  };

  const handleSubmit = async () => {
    const hasEmpty = fields.some((_, i) => !(values[i] || '').trim());
    if (hasEmpty) {
      const next = attempts + 1;
      setAttempts(next);
      const remaining = Math.max(maxAttempts - next, 0);
      if (remaining > 0) {
        setError(t.fillAllFields(remaining));
      } else {
        triggerFailedRound();
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
    let lastNetworkError = false;
    for (let attempt = 0; attempt < 3; attempt++) {
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
            setError(t.wrongAnswer(remaining));
          } else {
            triggerFailedRound();
          }
        }
        setLoading(false);
        return;
      } catch {
        lastNetworkError = true;
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }
    setError(lastNetworkError ? t.networkError : t.checkError);
    setLoading(false);
  };

  const showBackButton = station.settings?.showBackButton !== false;
  return (
    <Wrap>
      <DesktopStationHeaderBand>
        <Title style={textColor ? { color: textColor } : undefined}>{title}</Title>
      </DesktopStationHeaderBand>
      <Card>
        {fields.map((field, index) => (
          <FieldWrap key={index}>
            <Statement>{field.statement || `Field ${index + 1}`}</Statement>
            <Input
              value={values[index] || ''}
              placeholder={field.placeholder || field.description || t.answerPlaceholder}
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
      <BelowCardRow>
        <BelowAttemptsRow style={textColor ? { color: textColor } : undefined}>
          {[...Array(maxAttempts)].map((_, i) => (
            <AttemptDot key={i} used={String(i < attempts)} />
          ))}
          <span style={{ unicodeBidi: 'isolate' }}>{t.attempts}</span>
        </BelowAttemptsRow>
        <HintGroup>
          {showSolutionHintIcon && (
            <SolutionHintTextButton
              type="button"
              onClick={handleSolutionHintClick}
              aria-label={solutionHintLabel || t.showSolution}
              title={solutionHintLabel || t.showSolution}
            >
              {solutionHintLabel || t.showSolution}
            </SolutionHintTextButton>
          )}
          {stationHintText && onStationHintClick && (
            <SmallHintButton
              type="button"
              onClick={onStationHintClick}
              aria-label={hintLabel || t.hint}
            >
              {hintLabel || t.hint}
            </SmallHintButton>
          )}
        </HintGroup>
      </BelowCardRow>
      <Row>
        <PrimaryActionButton
          type="button"
          onClick={handleSubmit}
          disabled={loading || attempts >= maxAttempts}
        >
          {loading ? `${t.checking}${'.'.repeat(loadingDots)}` : submitButtonText}
        </PrimaryActionButton>
        {showBackButton && (
          <SecondaryActionButton
            type="button"
            onClick={handleBack}
          >
            {returnButtonText}
          </SecondaryActionButton>
        )}
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
              {t.continue}
            </SuccessContinueButton>
          </SuccessCard>
        </ModalOverlay>
        </>
      )}
      {showRetryPopup && (
        <ModalOverlay>
          <SuccessCard onClick={(e) => e.stopPropagation()}>
            <SuccessTitle>{retryTitle || t.outOfAttempts}</SuccessTitle>
            <SuccessSubtitle>{retryMessage || t.tryAgain}</SuccessSubtitle>
            <SuccessContinueButton type="button" onClick={handleRetryDismiss}>
              {retryButtonLabel || t.retryContinue}
            </SuccessContinueButton>
          </SuccessCard>
        </ModalOverlay>
      )}
      {showSolutionHintWarning && (
        <ModalOverlay onClick={() => setShowSolutionHintWarning(false)}>
          <SuccessCard onClick={(e) => e.stopPropagation()}>
            <SuccessTitle>{solutionHintLabel || t.showSolution}</SuccessTitle>
            <SuccessSubtitle>
              {solutionHintWarning || t.solutionWarning}
            </SuccessSubtitle>
            <ConfirmModalActions>
              <ConfirmModalSecondary type="button" onClick={() => setShowSolutionHintWarning(false)}>
                {hintCancelLabel || t.cancel}
              </ConfirmModalSecondary>
              <ConfirmModalPrimary type="button" onClick={handleSolutionHintConfirm}>
                {solutionHintConfirmLabel || t.showSolution}
              </ConfirmModalPrimary>
            </ConfirmModalActions>
          </SuccessCard>
        </ModalOverlay>
      )}
    </Wrap>
  );
}
