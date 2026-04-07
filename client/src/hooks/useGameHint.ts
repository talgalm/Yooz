import { useState, useCallback } from 'react';

interface HintConfig {
  enabled: boolean;
  text: string;
}

const HINT_PENALTY = 5;

interface UseGameHintReturn {
  hintUsed: boolean;
  showHintWarning: boolean;
  showHintText: boolean;
  hintPenalty: number;
  handleHintClick: () => void;
  confirmHint: () => void;
  dismissHintWarning: () => void;
  dismissHintText: () => void;
  applyHintPenalty: (score: number) => number;
  /** Force hint as already used (for restoring saved game progress) */
  forceHintUsed: () => void;
}

/**
 * Shared hook for game-level hint logic.
 * Manages hint state (warning modal, text modal, used flag) and penalty calculation.
 */
export function useGameHint(_hint?: HintConfig): UseGameHintReturn {
  const [hintUsed, setHintUsed] = useState(false);
  const [showHintWarning, setShowHintWarning] = useState(false);
  const [showHintText, setShowHintText] = useState(false);

  const handleHintClick = useCallback(() => {
    if (hintUsed) {
      setShowHintText(true);
      return;
    }
    setShowHintWarning(true);
  }, [hintUsed]);

  const confirmHint = useCallback(() => {
    setShowHintWarning(false);
    setHintUsed(true);
    setShowHintText(true);
  }, []);

  const dismissHintWarning = useCallback(() => {
    setShowHintWarning(false);
  }, []);

  const dismissHintText = useCallback(() => {
    setShowHintText(false);
  }, []);

  const forceHintUsed = useCallback(() => {
    setHintUsed(true);
  }, []);

  const applyHintPenalty = useCallback(
    (score: number) => (hintUsed ? Math.max(0, score - HINT_PENALTY) : score),
    [hintUsed],
  );

  return {
    hintUsed,
    showHintWarning,
    showHintText,
    hintPenalty: HINT_PENALTY,
    handleHintClick,
    confirmHint,
    dismissHintWarning,
    dismissHintText,
    applyHintPenalty,
    forceHintUsed,
  };
}
