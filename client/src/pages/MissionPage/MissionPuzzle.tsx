import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { styled, keyframes } from '@mui/material/styles';
import { useTranslations } from '../../context/LanguageContext';
import { texts } from './MissionPage.i18n';
import {
  MissionWrapper,
  FrameContainer,
  FrameHeaderOverlay,
  FrameFooterOverlay,
  MissionHeader,
  HeaderText,
  MissionButton,
} from './MissionFrame';
import MissionTopMenu from './MissionTopMenu';

const GRID = 4;
const TOTAL = GRID * GRID;
const MISSION_TEAL = '#39CABC';
const MISSION_FONT = "'Rubik', sans-serif";
const PUZZLE_IMAGE = '/images/puzzle-env.png';

const PD = 10;
const PE = 110;
const PR = 10;
const PM = 60;
const BK = 0.5523;
const RK = PR * BK;

type Side = 'flat' | 'tab' | 'blank';

const flip = (s: 'tab' | 'blank'): Side => (s === 'tab' ? 'blank' : 'tab');

function getSides(piece: number) {
  const r = Math.floor((piece - 1) / GRID);
  const c = (piece - 1) % GRID;
  const h = (r: number, c: number): 'tab' | 'blank' => (r + c) % 2 === 0 ? 'tab' : 'blank';
  const v = (r: number, c: number): 'tab' | 'blank' => (r + c) % 2 === 1 ? 'tab' : 'blank';
  return {
    top: (r === 0 ? 'flat' : flip(v(r - 1, c))) as Side,
    right: (c === GRID - 1 ? 'flat' : h(r, c)) as Side,
    bottom: (r === GRID - 1 ? 'flat' : v(r, c)) as Side,
    left: (c === 0 ? 'flat' : flip(h(r, c - 1))) as Side,
  };
}

function buildPath(piece: number): string {
  const s = getSides(piece);
  let d = `M ${PD},${PD}`;

  if (s.top === 'flat') {
    d += ` L ${PE},${PD}`;
  } else {
    const ty = s.top === 'tab' ? PD - PR : PD + PR;
    const cy = s.top === 'tab' ? PD - RK : PD + RK;
    d += ` L ${PM - PR},${PD} C ${PM - PR},${cy} ${PM - RK},${ty} ${PM},${ty} C ${PM + RK},${ty} ${PM + PR},${cy} ${PM + PR},${PD} L ${PE},${PD}`;
  }

  if (s.right === 'flat') {
    d += ` L ${PE},${PE}`;
  } else {
    const tx = s.right === 'tab' ? PE + PR : PE - PR;
    const cx = s.right === 'tab' ? PE + RK : PE - RK;
    d += ` L ${PE},${PM - PR} C ${cx},${PM - PR} ${tx},${PM - RK} ${tx},${PM} C ${tx},${PM + RK} ${cx},${PM + PR} ${PE},${PM + PR} L ${PE},${PE}`;
  }

  if (s.bottom === 'flat') {
    d += ` L ${PD},${PE}`;
  } else {
    const ty = s.bottom === 'tab' ? PE + PR : PE - PR;
    const cy = s.bottom === 'tab' ? PE + RK : PE - RK;
    d += ` L ${PM + PR},${PE} C ${PM + PR},${cy} ${PM + RK},${ty} ${PM},${ty} C ${PM - RK},${ty} ${PM - PR},${cy} ${PM - PR},${PE} L ${PD},${PE}`;
  }

  if (s.left === 'flat') {
    d += ` L ${PD},${PD}`;
  } else {
    const tx = s.left === 'tab' ? PD - PR : PD + PR;
    const cx = s.left === 'tab' ? PD - RK : PD + RK;
    d += ` L ${PD},${PM + PR} C ${cx},${PM + PR} ${tx},${PM + RK} ${tx},${PM} C ${tx},${PM - RK} ${cx},${PM - PR} ${PD},${PM - PR} L ${PD},${PD}`;
  }

  return d + ' Z';
}

function pieceToGrid(piece: number) {
  return { row: Math.floor((piece - 1) / GRID), col: (piece - 1) % GRID };
}

function PieceSvg({ piece, clipId }: { piece: number; clipId: string }) {
  const { row, col } = pieceToGrid(piece);
  const d = useMemo(() => buildPath(piece), [piece]);
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        <clipPath id={clipId}>
          <path d={d} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <image
          href={PUZZLE_IMAGE}
          x={PD - col * 100}
          y={PD - row * 100}
          width={GRID * 100}
          height={GRID * 100}
          preserveAspectRatio="xMidYMid slice"
        />
      </g>
      <path d={d} fill="none" stroke={MISSION_TEAL} strokeWidth={2.5} strokeLinejoin="round" />
    </svg>
  );
}

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const snapIn = keyframes`
  0%   { transform: scale(1.12); opacity: 0.6; }
  50%  { transform: scale(0.97); }
  100% { transform: scale(1); opacity: 1; }
`;

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 8px ${MISSION_TEAL}60; }
  50%      { box-shadow: 0 0 20px ${MISSION_TEAL}A0; }
`;

const PuzzleContent = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px 12px',
  gap: 10,
  position: 'relative',
  zIndex: 3,
  fontFamily: MISSION_FONT,
});

const PuzzleInstruction = styled('p')({
  fontFamily: MISSION_FONT,
  fontSize: 'clamp(16px, 5vw, 22px)',
  color: '#F2F7FF',
  textAlign: 'center',
  margin: 0,
  padding: '0 16px',
  lineHeight: 1.5,
  position: 'absolute',
  top: '2%',
  left: 0,
  right: 0,
  zIndex: 4,
});

const GridArea = styled('div')({
  position: 'relative',
  width: '85vw',
  maxWidth: 380,
  marginTop: '24%',
  aspectRatio: '1 / 1',
  borderRadius: 4,
  overflow: 'hidden',
  border: `2px solid ${MISSION_TEAL}`,
  boxShadow: `0 0 12px ${MISSION_TEAL}60`,
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: 0,
    zIndex: 0,
    backgroundImage: `url(${PUZZLE_IMAGE})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    filter: 'blur(3px) brightness(0.45)',
  },
});

const GridCell = styled('div')<{ highlight?: boolean }>(({ highlight }) => ({
  position: 'absolute',
  boxSizing: 'border-box',
  border: `2px solid ${MISSION_TEAL}90`,
  transition: 'background 0.2s, border-color 0.2s',
  zIndex: 1,
  ...(highlight ? {
    background: `${MISSION_TEAL}20`,
    borderColor: `${MISSION_TEAL}60`,
  } : {}),
}));

const PlacedPieceWrapper = styled('div')({
  position: 'absolute',
  pointerEvents: 'none',
  zIndex: 2,
  animation: `${snapIn} 0.35s ease-out`,
});

const DragZone = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 10,
  marginTop: '10%',
  padding: '12px 0',
});

const DragPieceContainer = styled('div')({
  width: '24vw',
  maxWidth: 120,
  aspectRatio: '1 / 1',
  cursor: 'grab',
  animation: `${fadeIn} 0.4s ease-out, ${glow} 2s infinite`,
  touchAction: 'none',
  userSelect: 'none',
  borderRadius: 8,
  '&:active': { cursor: 'grabbing' },
});

const GhostContainer = styled('div')({
  position: 'fixed',
  pointerEvents: 'none',
  zIndex: 100,
  opacity: 0.85,
});

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface MissionPuzzleProps {
  onComplete: () => void;
  backgroundImage?: string;
  playCorrect?: () => void;
  playWrong?: () => void;
  playClick?: () => void;
  playComplete?: () => void;
  muted?: boolean;
  toggleMute?: () => void;
  code?: string;
  completeHeader?: string;
  completeButton?: string;
  onLogout?: () => void;
  onHelp?: () => void;
}

function userFingerprint(): string {
  try { return (localStorage.getItem('yooz_token') ?? '').slice(-10); } catch { return ''; }
}

function puzzleKey(code: string) { return `mission_puzzle_${code}_${userFingerprint()}`; }

function loadPuzzleSession(code?: string): { queue: number[]; placed: number[] } | null {
  if (!code) return null;
  try {
    const raw = sessionStorage.getItem(puzzleKey(code));
    if (raw) return JSON.parse(raw);
  } catch { }
  return null;
}

function savePuzzleSession(code: string, queue: number[], placed: number[]) {
  sessionStorage.setItem(puzzleKey(code), JSON.stringify({ queue, placed }));
}

export default function MissionPuzzle({ onComplete, backgroundImage, playCorrect, playWrong, playClick, playComplete, muted, toggleMute, code, completeHeader, completeButton, onLogout, onHelp }: MissionPuzzleProps) {
  const t = useTranslations(texts);
  const savedPuzzle = useRef(loadPuzzleSession(code));

  const [queue, setQueue] = useState<number[]>(() => {
    if (savedPuzzle.current) return savedPuzzle.current.queue;
    return shuffle(Array.from({ length: TOTAL }, (_, i) => i + 1));
  });
  const [placed, setPlaced] = useState<Set<number>>(() => {
    if (savedPuzzle.current) return new Set(savedPuzzle.current.placed);
    return new Set();
  });
  const [complete, setComplete] = useState(() => {
    return savedPuzzle.current ? savedPuzzle.current.placed.length === TOTAL : false;
  });
  const [highlightCell, setHighlightCell] = useState<number | null>(null);

  const [dragging, setDragging] = useState(false);
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const ghostSize = useRef(0);

  const currentPiece = queue[0];
  const placedCount = placed.size;

  const cellPct = 100 / GRID;
  const piecePct = cellPct * 1.2;
  const offsetPct = (piecePct - cellPct) / 2;

  const getCellSize = useCallback(() => {
    if (!gridRef.current) return 0;
    return gridRef.current.getBoundingClientRect().width / GRID;
  }, []);

  const coordToCell = useCallback((px: number, py: number): number | null => {
    if (!gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    const col = Math.floor(((px - rect.left) / rect.width) * GRID);
    const row = Math.floor(((py - rect.top) / rect.height) * GRID);
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return null;
    return row * GRID + col + 1;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const t = e.touches[0];
    setDragging(true);
    ghostSize.current = getCellSize() * 1.2;
    setGhostPos({ x: t.clientX, y: t.clientY });
  }, [getCellSize]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging) return;
    const t = e.touches[0];
    setGhostPos({ x: t.clientX, y: t.clientY });
    setHighlightCell(coordToCell(t.clientX, t.clientY));
  }, [dragging, coordToCell]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!dragging || !currentPiece) return;
    setDragging(false);
    setGhostPos(null);
    setHighlightCell(null);
    const t = e.changedTouches[0];
    const cell = coordToCell(t.clientX, t.clientY);
    if (cell === currentPiece) {
      playCorrect?.();
      setPlaced((prev) => new Set(prev).add(currentPiece));
      setQueue((prev) => prev.slice(1));
    } else if (cell !== null) {
      playWrong?.();
    }
  }, [dragging, currentPiece, coordToCell, playCorrect, playWrong]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    ghostSize.current = getCellSize() * 1.2;
    setGhostPos({ x: e.clientX, y: e.clientY });
  }, [getCellSize]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      setGhostPos({ x: e.clientX, y: e.clientY });
      setHighlightCell(coordToCell(e.clientX, e.clientY));
    };
    const onUp = (e: MouseEvent) => {
      setDragging(false);
      setGhostPos(null);
      setHighlightCell(null);
      if (!currentPiece) return;
      const cell = coordToCell(e.clientX, e.clientY);
      if (cell === currentPiece) {
        playCorrect?.();
        setPlaced((prev) => new Set(prev).add(currentPiece));
        setQueue((prev) => prev.slice(1));
      } else if (cell !== null) {
        playWrong?.();
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, currentPiece, coordToCell, playCorrect, playWrong]);

  useEffect(() => {
    if (code) savePuzzleSession(code, queue, Array.from(placed));
  }, [code, queue, placed]);

  useEffect(() => {
    if (placedCount === TOTAL && !complete) {
      setComplete(true);
      playComplete?.();
    }
  }, [placedCount, complete, playComplete]);

  const gridCells = useMemo(() => {
    const cells = [];
    for (let i = 1; i <= TOTAL; i++) {
      const { row, col } = pieceToGrid(i);
      cells.push({ i, row, col });
    }
    return cells;
  }, []);

  const gs = ghostSize.current || getCellSize() * 1.2;

  if (complete) {
    return (
      <MissionWrapper bg={backgroundImage} step={0}>
        <FrameContainer>
          <FrameHeaderOverlay src="/images/mission-header.svg" alt="" />
          <FrameFooterOverlay src="/images/mission-footer.svg" alt="" />

          <MissionTopMenu onLogout={onLogout} toggleMute={toggleMute} muted={muted} onHelp={onHelp} />

          <MissionHeader>
            <HeaderText>{completeHeader ?? t.completeHeader}</HeaderText>
          </MissionHeader>

          <PuzzleContent style={{ justifyContent: 'flex-start', paddingTop: 10 }} />

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <MissionButton step={3} onClick={() => { playClick?.(); onComplete(); }}>
              {completeButton ?? t.completeButton}
            </MissionButton>
          </div>
        </FrameContainer>
      </MissionWrapper>
    );
  }

  return (
    <MissionWrapper bg={backgroundImage} step={3}>
      <FrameContainer>
        <FrameHeaderOverlay src="/images/mission-header.svg" alt="" />
        <FrameFooterOverlay src="/images/mission-footer.svg" alt="" />

        <MissionTopMenu onLogout={onLogout} toggleMute={toggleMute} muted={muted} onHelp={onHelp} />

        <PuzzleInstruction>
          {t.puzzleInstruction[0]}<br />{t.puzzleInstruction[1]}
        </PuzzleInstruction>

        <PuzzleContent>
          <GridArea ref={gridRef}>
            {gridCells.map(({ i, row, col }) => (
              <GridCell
                key={`cell-${i}`}
                highlight={highlightCell === i}
                style={{
                  left: `${col * cellPct}%`,
                  top: `${row * cellPct}%`,
                  width: `${cellPct}%`,
                  height: `${cellPct}%`,
                }}
              />
            ))}

            {Array.from(placed).map((p) => {
              const { row, col } = pieceToGrid(p);
              return (
                <PlacedPieceWrapper
                  key={`placed-${p}`}
                  style={{
                    left: `${col * cellPct - offsetPct}%`,
                    top: `${row * cellPct - offsetPct}%`,
                    width: `${piecePct}%`,
                    height: `${piecePct}%`,
                    zIndex: 3,
                  }}
                >
                  <PieceSvg piece={p} clipId={`jp-${p}`} />
                </PlacedPieceWrapper>
              );
            })}
          </GridArea>

          {currentPiece && (
            <DragZone>
              <DragPieceContainer
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                style={{ visibility: dragging ? 'hidden' : 'visible' }}
              >
                <PieceSvg piece={currentPiece} clipId="jd" />
              </DragPieceContainer>
            </DragZone>
          )}
        </PuzzleContent>
      </FrameContainer>

      {dragging && ghostPos && currentPiece && (
        <GhostContainer
          style={{
            left: ghostPos.x - gs / 2,
            top: ghostPos.y - gs / 2,
            width: gs,
            height: gs,
          }}
        >
          <PieceSvg piece={currentPiece} clipId="jg" />
        </GhostContainer>
      )}
    </MissionWrapper>
  );
}
