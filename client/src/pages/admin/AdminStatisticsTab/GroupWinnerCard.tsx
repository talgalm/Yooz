import { styled, keyframes } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './AdminStatisticsTab.i18n';
import { groupWinners, podiumSteps, rankGroups } from './groupStandings';
import type { GroupStats } from './types';

const MORE_GROUPS_SHOWN = 4;
const STAGE_ORDER = [1, 0, 2];
const MEDALS = ['🥇', '🥈', '🥉'];
const STEP_HEIGHT = [132, 96, 70];
const STEP_DELAY_S = [0.6, 0.35, 0.15];
const STEP_LOOK = [
  { face: 'linear-gradient(180deg, #ffe27a 0%, #f2b705 100%)', ink: '#5a3d00' },
  { face: 'linear-gradient(180deg, #f1f4f8 0%, #b8c1cf 100%)', ink: '#3b4252' },
  { face: 'linear-gradient(180deg, #f3bf8f 0%, #c27a45 100%)', ink: '#4a2510' },
];

const rise = keyframes({ from: { transform: 'scaleY(0)' }, to: { transform: 'scaleY(1)' } });
const fadeUp = keyframes({ from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } });

const noForward = { shouldForwardProp: (prop: PropertyKey) => !String(prop).startsWith('$') };

const Card = styled('section')({
  gridColumn: '1 / -1',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 18,
  padding: '24px 24px 20px',
  borderRadius: 16,
  color: '#fff',
  overflow: 'hidden',
  background: 'radial-gradient(circle at 50% -10%, rgba(255,255,255,0.22), transparent 55%), linear-gradient(160deg, #2a1d6e 0%, #4b3bc4 55%, #7b6cf0 100%)',
  boxShadow: '0 10px 30px rgba(42,29,110,0.3)',
  '@media (max-width: 600px)': { padding: '18px 12px 14px', borderRadius: 12, gap: 14 },
});

const Headline = styled('div')({ textAlign: 'center', minWidth: 0, maxWidth: '100%' });

const Eyebrow = styled('div')({ fontSize: 14, fontWeight: 800, opacity: 0.9 });

const WinnerName = styled('div')({
  fontSize: 32,
  fontWeight: 900,
  lineHeight: 1.15,
  overflowWrap: 'anywhere',
  '@media (max-width: 600px)': { fontSize: 26 },
});

const Stage = styled('div')({
  direction: 'ltr',
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
  gap: 10,
  width: '100%',
  maxWidth: 560,
  borderBottom: '3px solid rgba(255,255,255,0.35)',
});

const Column = styled('div')({
  flex: '1 1 0',
  maxWidth: 180,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
});

const Label = styled('div', noForward)<{ $delay: number }>(({ $delay }) => ({
  direction: 'rtl',
  textAlign: 'center',
  width: '100%',
  minWidth: 0,
  animation: `${fadeUp} 0.45s ease-out ${$delay}s both`,
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
}));

const Medal = styled('div')({ fontSize: 30, lineHeight: 1 });

const StepNames = styled('div')({
  fontSize: 15,
  fontWeight: 800,
  lineHeight: 1.25,
  overflowWrap: 'anywhere',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
});

const StepPoints = styled('div')({ fontSize: 13, fontWeight: 700, opacity: 0.85 });

const Step = styled('div', noForward)<{ $place: number; $rank: number; $delay: number }>(({ $place, $rank, $delay }) => ({
  width: '100%',
  height: STEP_HEIGHT[$place],
  borderRadius: '12px 12px 0 0',
  background: STEP_LOOK[$rank - 1].face,
  color: STEP_LOOK[$rank - 1].ink,
  boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.6), 0 -4px 18px rgba(0,0,0,0.12)',
  display: 'flex',
  justifyContent: 'center',
  paddingTop: 10,
  boxSizing: 'border-box',
  fontSize: $place === 0 ? 46 : 36,
  fontWeight: 900,
  lineHeight: 1,
  transformOrigin: 'bottom',
  animation: `${rise} 0.55s cubic-bezier(0.2, 0.9, 0.3, 1.2) ${$delay}s both`,
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
  '@media (max-width: 600px)': { height: Math.round(STEP_HEIGHT[$place] * 0.8), fontSize: $place === 0 ? 38 : 30 },
}));

const More = styled('div')({
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: 8,
});

const MoreChip = styled('span')({
  padding: '5px 12px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.16)',
  fontSize: 13,
  fontWeight: 700,
  whiteSpace: 'nowrap',
});

export default function GroupWinnerCard({ groups }: { groups: GroupStats[] }) {
  const t = useTranslations(texts);
  const winners = groupWinners(groups);
  if (winners.length === 0) return null;
  const steps = podiumSteps(groups);
  const onStage = steps.flat().length;
  const more = rankGroups(groups).filter((group) => group.totalScore > 0).slice(onStage, onStage + MORE_GROUPS_SHOWN);

  return (
    <Card aria-label={t.groupWinner}>
      <Headline>
        <Eyebrow>{`🏆 ${winners.length > 1 ? t.groupWinnerTie : t.groupWinner}`}</Eyebrow>
        <WinnerName>{winners.map((group) => group.group || '-').join(' / ')}</WinnerName>
      </Headline>
      <Stage>
        {STAGE_ORDER.filter((place) => steps[place]).map((place) => {
          const rank = steps[place][0].rank;
          return (
            <Column key={place}>
              <Label $delay={STEP_DELAY_S[place] + 0.35}>
                <Medal aria-hidden>{MEDALS[rank - 1]}</Medal>
                <StepNames>{steps[place].map((group) => group.group || '-').join(' / ')}</StepNames>
                <StepPoints>{`${steps[place][0].totalScore.toLocaleString()} ${t.groupPointsUnit}`}</StepPoints>
              </Label>
              <Step $place={place} $rank={rank} $delay={STEP_DELAY_S[place]}>{rank}</Step>
            </Column>
          );
        })}
      </Stage>
      {more.length > 0 && (
        <More>
          {more.map((group) => (
            <MoreChip key={group.group}>{`${group.rank}. ${group.group || '-'} · ${group.totalScore.toLocaleString()}`}</MoreChip>
          ))}
        </More>
      )}
    </Card>
  );
}
