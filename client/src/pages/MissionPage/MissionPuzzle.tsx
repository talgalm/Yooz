import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { styled, keyframes } from '@mui/material/styles';
import {
  MissionWrapper,
  FrameContainer,
  FrameHeaderOverlay,
  FrameFooterOverlay,
  MissionHeader,
  HeaderText,
  MissionButton,
} from './MissionFrame';

// ─── Config ───
const GRID = 4;
const TOTAL = GRID * GRID;
const MISSION_TEAL = '#39CABC';
const MISSION_TEXT = '#F2F7FF';
const MISSION_FONT = "'Rubik One', sans-serif";
const PUZZLE_IMAGE = '/images/puzzle-env.png';

// ─── Jigsaw Geometry ───
// SVG viewBox: 0 0 120 120
// Base square: (10,10) → (110,110) = 100×100, with 10-unit padding for tab overflow
const PD = 10;          // padding / base start
const PE = 110;         // base end
const PR = 10;          // tab semicircle radius
const PM = 60;          // midpoint
const BK = 0.5523;     // cubic-bezier constant for circle approximation
const RK = PR * BK;    // pre-computed

type Side = 'flat' | 'tab' | 'blank';

const flip = (s: 'tab' | 'blank'): Side => (s === 'tab' ? 'blank' : 'tab');

/** Determine the 4 sides of a jigsaw piece (flat on edges, tab/blank internally) */
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

/** Build SVG path for a jigsaw piece shape */
function buildPath(piece: number): string {
  const s = getSides(piece);
  let d = `M ${PD},${PD}`;

  // Top edge (L → R along y=PD)
  if (s.top === 'flat') {
    d += ` L ${PE},${PD}`;
  } else {
    const ty = s.top === 'tab' ? PD - PR : PD + PR;
    const cy = s.top === 'tab' ? PD - RK : PD + RK;
    d += ` L ${PM - PR},${PD} C ${PM - PR},${cy} ${PM - RK},${ty} ${PM},${ty} C ${PM + RK},${ty} ${PM + PR},${cy} ${PM + PR},${PD} L ${PE},${PD}`;
  }

  // Right edge (T → B along x=PE)
  if (s.right === 'flat') {
    d += ` L ${PE},${PE}`;
  } else {
    const tx = s.right === 'tab' ? PE + PR : PE - PR;
    const cx = s.right === 'tab' ? PE + RK : PE - RK;
    d += ` L ${PE},${PM - PR} C ${cx},${PM - PR} ${tx},${PM - RK} ${tx},${PM} C ${tx},${PM + RK} ${cx},${PM + PR} ${PE},${PM + PR} L ${PE},${PE}`;
  }

  // Bottom edge (R → L along y=PE)
  if (s.bottom === 'flat') {
    d += ` L ${PD},${PE}`;
  } else {
    const ty = s.bottom === 'tab' ? PE + PR : PE - PR;
    const cy = s.bottom === 'tab' ? PE + RK : PE - RK;
    d += ` L ${PM + PR},${PE} C ${PM + PR},${cy} ${PM + RK},${ty} ${PM},${ty} C ${PM - RK},${ty} ${PM - PR},${cy} ${PM - PR},${PE} L ${PD},${PE}`;
  }

  // Left edge (B → T along x=PD)
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

// ─── SVG Piece ───

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

// ─── Animations ───
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

// ─── Styled ───

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

const ProgressBar = styled('div')({
  width: '80%',
  maxWidth: 360,
  height: 6,
  borderRadius: 3,
  background: `${MISSION_TEXT}20`,
  overflow: 'hidden',
});

const ProgressFill = styled('div')<{ pct: number }>(({ pct }) => ({
  height: '100%',
  borderRadius: 3,
  background: `linear-gradient(90deg, ${MISSION_TEAL}, #6dd5c8)`,
  width: `${pct}%`,
  transition: 'width 0.4s ease-out',
}));

const CounterText = styled('div')({
  color: MISSION_TEXT,
  fontSize: 14,
  fontFamily: MISSION_FONT,
  textAlign: 'center',
  opacity: 0.7,
});

const GridArea = styled('div')({
  position: 'relative',
  width: '85vw',
  maxWidth: 380,
  marginTop: '25%',
  aspectRatio: '1 / 1',
  borderRadius: 4,
  overflow: 'hidden',
  // Blurred puzzle image as background hint (via pseudo to avoid blurring children)
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
  border: `1px solid ${MISSION_TEAL}15`,
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

const DragLabel = styled('div')({
  color: MISSION_TEXT,
  fontSize: 16,
  fontFamily: MISSION_FONT,
  direction: 'rtl',
  opacity: 0.8,
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

const CompleteImage = styled('img')({
  width: '85vw',
  maxWidth: 380,
  aspectRatio: '1 / 1',
  objectFit: 'cover',
  borderRadius: 4,
  marginTop: '-10%',
  animation: `${fadeIn} 0.6s ease-out`,
});

// ─── Mute button (puzzle) ───

const MuteBtn = styled('button')({
  position: 'absolute',
  top: 18,
  left: 16,
  right: 'auto',
  zIndex: 10,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 6,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  opacity: 0.85,
  transition: 'opacity 0.2s',
  '&:hover': { opacity: 1 },
});

const MuteBtnIcon = styled('img')<{ $muted: boolean }>(({ $muted }) => ({
  width: 32,
  height: 32,
  filter: $muted ? 'grayscale(1) brightness(0.5)' : 'brightness(1)',
  transition: 'filter 0.2s',
}));

const MuteBtnSlash = styled('div')({
  position: 'absolute',
  width: 3,
  height: 36,
  background: '#ff4444',
  borderRadius: 2,
  transform: 'rotate(45deg)',
  pointerEvents: 'none',
});

// ─── Helpers ───

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Props ───

interface MissionPuzzleProps {
  onComplete: () => void;
  backgroundImage?: string;
  playCorrect?: () => void;
  playClick?: () => void;
  playComplete?: () => void;
  muted?: boolean;
  toggleMute?: () => void;
  code?: string;
}

// ─── Session helpers ───

function puzzleKey(code: string) { return `mission_puzzle_${code}`; }

function loadPuzzleSession(code?: string): { queue: number[]; placed: number[] } | null {
  if (!code) return null;
  try {
    const raw = sessionStorage.getItem(puzzleKey(code));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function savePuzzleSession(code: string, queue: number[], placed: number[]) {
  sessionStorage.setItem(puzzleKey(code), JSON.stringify({ queue, placed }));
}

// ─── Component ───

export default function MissionPuzzle({ onComplete, backgroundImage, playCorrect, playClick, playComplete, muted, toggleMute, code }: MissionPuzzleProps) {
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

  // Cell size = 25% of the grid. Piece wrapper = 30% (120% of cell for tab overflow).
  const cellPct = 100 / GRID; // 25
  const piecePct = cellPct * 1.2; // 30
  const offsetPct = (piecePct - cellPct) / 2; // 2.5

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

  // ─── Touch ───
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
    }
  }, [dragging, currentPiece, coordToCell, playCorrect]);

  // ─── Mouse ───
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
      if (coordToCell(e.clientX, e.clientY) === currentPiece) {
        playCorrect?.();
        setPlaced((prev) => new Set(prev).add(currentPiece));
        setQueue((prev) => prev.slice(1));
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, currentPiece, coordToCell, playCorrect]);

  // Persist puzzle state
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

  // ─── Complete state: show full image, header, footer button ───
  if (complete) {
    return (
      <MissionWrapper bg={backgroundImage} step={3}>
        <FrameContainer>
          <FrameHeaderOverlay src="/images/mission-header.svg" alt="" />
          <FrameFooterOverlay src="/images/mission-footer.svg" alt="" />

          {toggleMute && (
            <MuteBtn onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
              <MuteBtnIcon src="/images/mic.svg" alt="" $muted={!!muted} />
              {muted && <MuteBtnSlash />}
            </MuteBtn>
          )}

          <MissionHeader>
            <HeaderText>!כל הכבוד</HeaderText>
          </MissionHeader>

          <PuzzleContent>
            <CompleteImage src={PUZZLE_IMAGE} alt="" />
          </PuzzleContent>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <MissionButton step={3} onClick={() => { playClick?.(); onComplete(); }}>
              לשלב הבא
            </MissionButton>
          </div>
        </FrameContainer>
      </MissionWrapper>
    );
  }

  // ─── Puzzle in progress ───
  return (
    <MissionWrapper bg={backgroundImage} step={3}>
      <FrameContainer>
        <FrameHeaderOverlay src="/images/mission-header.svg" alt="" />
        <FrameFooterOverlay src="/images/mission-footer.svg" alt="" />

        {/* Mic / mute button */}
        {toggleMute && (
          <MuteBtn onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
            <MuteBtnIcon src="/images/mic.svg" alt="" $muted={!!muted} />
            {muted && <MuteBtnSlash />}
          </MuteBtn>
        )}

        <PuzzleContent>
          {/* 4×4 Grid */}
          <GridArea ref={gridRef}>
            {/* Cell borders (guide) */}
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

            {/* Placed jigsaw pieces (oversized to show tabs) */}
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

          {/* Drag zone */}
          {currentPiece && (
            <DragZone>
              <DragPieceContainer
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
              >
                <PieceSvg piece={currentPiece} clipId="jd" />
              </DragPieceContainer>
            </DragZone>
          )}
        </PuzzleContent>
      </FrameContainer>

      {/* Ghost piece while dragging */}
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
