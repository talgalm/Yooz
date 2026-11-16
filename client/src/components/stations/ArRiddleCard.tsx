import { styled, keyframes } from '@mui/material/styles';
import { useTranslations } from '../../context/LanguageContext';
import { StationContinueButton } from '../games/styled';
import { texts } from './ArStation.i18n';
import type { ArRiddle } from '../../utils/arStation';

export const RIDDLE_COIN_SRC = '/images/ar-coin-riddle.webp';

const cardIn = keyframes`
  0% { transform: translateY(24px) scale(0.92); opacity: 0; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
`;

const resultIn = keyframes`
  0% { transform: scale(0.6); opacity: 0; }
  60% { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
`;

const Scrim = styled('div')({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '96px 16px calc(env(safe-area-inset-bottom, 0px) + 24px)',
  boxSizing: 'border-box',
  background: 'rgba(22, 6, 44, 0.62)',
});

const Card = styled('div')({
  position: 'relative',
  width: '100%',
  maxWidth: 400,
  padding: '50px 20px 20px',
  borderRadius: 26,
  background: '#ffffff',
  boxShadow: '0 18px 40px rgba(0, 0, 0, 0.35)',
  boxSizing: 'border-box',
  textAlign: 'center',
  animation: `${cardIn} 0.32s cubic-bezier(0.2, 0.8, 0.3, 1)`,
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none',
  },
});

const CoinBadge = styled('img')({
  position: 'absolute',
  left: '50%',
  top: -42,
  width: 84,
  height: 84,
  marginLeft: -42,
  filter: 'drop-shadow(0 8px 12px rgba(40, 10, 90, 0.45))',
});

const Kicker = styled('div')({
  color: '#6a3df0',
  fontSize: 14,
  fontWeight: 800,
});

const Question = styled('h3')({
  margin: '6px 0 16px',
  color: '#1d0838',
  fontSize: 21,
  fontWeight: 800,
  lineHeight: 1.35,
  unicodeBidi: 'plaintext',
});

const Answers = styled('div')({
  display: 'grid',
  gap: 10,
});

type AnswerState = 'idle' | 'right' | 'wrong' | 'dim';

const ANSWER_LOOK: Record<AnswerState, { background: string; border: string; color: string; opacity: number }> = {
  idle: { background: '#f6f2ff', border: '#ddd1ff', color: '#1d0838', opacity: 1 },
  right: { background: '#23a55a', border: '#1b8a4a', color: '#ffffff', opacity: 1 },
  wrong: { background: '#e5484d', border: '#c93338', color: '#ffffff', opacity: 1 },
  dim: { background: '#f6f2ff', border: '#ece6ff', color: '#1d0838', opacity: 0.5 },
};

const AnswerButton = styled('button', { shouldForwardProp: (prop) => prop !== 'look' })<{ look: AnswerState }>(({ look }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  minHeight: 54,
  padding: '10px 16px',
  borderRadius: 16,
  border: `2px solid ${ANSWER_LOOK[look].border}`,
  background: ANSWER_LOOK[look].background,
  color: ANSWER_LOOK[look].color,
  opacity: ANSWER_LOOK[look].opacity,
  fontSize: 17,
  fontWeight: 700,
  fontFamily: 'inherit',
  lineHeight: 1.3,
  cursor: look === 'idle' ? 'pointer' : 'default',
  unicodeBidi: 'plaintext',
  transition: 'background 0.2s ease, border-color 0.2s ease, color 0.2s ease, opacity 0.2s ease, transform 0.1s ease',
  '&:active': {
    transform: look === 'idle' ? 'scale(0.98)' : 'none',
  },
}));

const Mark = styled('span')({
  fontSize: 18,
  fontWeight: 900,
});

export const PauseBars = styled('span')({
  display: 'inline-flex',
  gap: 3,
  height: 12,
  '&::before, &::after': {
    content: '""',
    width: 3.5,
    height: '100%',
    borderRadius: 2,
    background: 'currentColor',
  },
});

const Verdict = styled('div', { shouldForwardProp: (prop) => prop !== 'right' })<{ right: boolean }>(({ right }) => ({
  margin: '16px 0 14px',
  color: right ? '#1b8a4a' : '#c93338',
  fontSize: right ? 22 : 16,
  fontWeight: 900,
  animation: `${resultIn} 0.4s ease-out`,
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none',
  },
}));

const ContinueButton = styled(StationContinueButton)({
  maxWidth: 'none',
});

interface ArRiddleCardProps {
  riddle: ArRiddle;
  order: number[];
  picked: number | null;
  onPick: (answer: number) => void;
  onContinue: () => void;
}

export default function ArRiddleCard({ riddle, order, picked, onPick, onContinue }: ArRiddleCardProps) {
  const t = useTranslations(texts);
  const answered = picked !== null;
  const right = picked === riddle.correct;
  const lookOf = (answer: number): AnswerState => {
    if (!answered) return 'idle';
    if (answer === riddle.correct) return 'right';
    return answer === picked ? 'wrong' : 'dim';
  };

  return (
    <Scrim>
      <Card role="dialog" aria-modal="true" aria-label={t.riddleKicker}>
        <CoinBadge src={RIDDLE_COIN_SRC} alt="" />
        <Kicker>{t.riddleKicker}</Kicker>
        <Question>{riddle.question}</Question>
        <Answers>
          {order.map((answer) => {
            const look = lookOf(answer);
            return (
              <AnswerButton key={answer} type="button" look={look} disabled={answered} onClick={() => onPick(answer)}>
                <span>{riddle.answers[answer]}</span>
                {look === 'right' && <Mark aria-hidden="true">✓</Mark>}
                {look === 'wrong' && <Mark aria-hidden="true">✕</Mark>}
              </AnswerButton>
            );
          })}
        </Answers>
        {answered && (
          <>
            <Verdict right={right} role="status">
              {right ? (riddle.bonus > 0 ? t.riddleRight(riddle.bonus) : t.riddleRightNoBonus) : t.riddleWrong}
            </Verdict>
            <ContinueButton type="button" onClick={onContinue}>{t.riddleContinue}</ContinueButton>
          </>
        )}
      </Card>
    </Scrim>
  );
}
