import { useRef, useCallback, useState, useEffect } from 'react';

const SOUNDS = {
  bg: '/sounds/mission/background-music.mp3',
  click: '/sounds/mission/button-click.wav',
  correct: '/sounds/mission/puzzle-correct.wav',
  complete: '/sounds/complete.wav',
  trashBg: '/sounds/backgroundMusicTrash.mp3',
  wrong: '/sounds/wrong-bin-sound.mp3',
} as const;

export function useMissionSounds() {
  const bgRef = useRef<HTMLAudioElement | null>(null);
  const trashBgRef = useRef<HTMLAudioElement | null>(null);
  const clickRef = useRef<HTMLAudioElement | null>(null);
  const correctRef = useRef<HTMLAudioElement | null>(null);
  const wrongRef = useRef<HTMLAudioElement | null>(null);
  const completeRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const bg = new Audio(SOUNDS.bg);
    bg.loop = true;
    bg.volume = 0.35;
    bgRef.current = bg;

    const click = new Audio(SOUNDS.click);
    click.volume = 0.6;
    clickRef.current = click;

    const correct = new Audio(SOUNDS.correct);
    correct.volume = 0.7;
    correctRef.current = correct;

    const wrong = new Audio(SOUNDS.wrong);
    wrong.volume = 0.7;
    wrongRef.current = wrong;

    const complete = new Audio(SOUNDS.complete);
    complete.volume = 0.8;
    completeRef.current = complete;

    const trashBg = new Audio(SOUNDS.trashBg);
    trashBg.loop = true;
    trashBg.volume = 0.35;
    trashBgRef.current = trashBg;

    return () => {
      bg.pause();
      bg.src = '';
      trashBg.pause();
      trashBg.src = '';
      click.src = '';
      correct.src = '';
      wrong.src = '';
      complete.src = '';
    };
  }, []);

  const startBg = useCallback(() => {
    if (bgRef.current && bgRef.current.paused && !muted) {
      bgRef.current.play().catch(() => { });
    }
  }, [muted]);

  const playClick = useCallback(() => {
    if (muted || !clickRef.current) return;
    clickRef.current.currentTime = 0;
    clickRef.current.play().catch(() => {});
  }, [muted]);

  const playCorrect = useCallback(() => {
    if (muted || !correctRef.current) return;
    correctRef.current.currentTime = 0;
    correctRef.current.play().catch(() => {});
  }, [muted]);

  const playWrong = useCallback(() => {
    if (muted || !wrongRef.current) return;
    wrongRef.current.currentTime = 0;
    wrongRef.current.play().catch(() => {});
  }, [muted]);

  const stopBg = useCallback(() => {
    if (bgRef.current) bgRef.current.pause();
  }, []);

  const playComplete = useCallback(() => {
    if (bgRef.current) bgRef.current.pause();
    if (muted || !completeRef.current) return;
    completeRef.current.currentTime = 0;
    completeRef.current.play().catch(() => {});
  }, [muted]);

  const startTrashBg = useCallback(() => {
    if (bgRef.current) bgRef.current.pause();
    if (trashBgRef.current && trashBgRef.current.paused && !muted) {
      trashBgRef.current.currentTime = 0;
      trashBgRef.current.play().catch(() => {});
    }
  }, [muted]);

  const stopTrashBg = useCallback(() => {
    if (trashBgRef.current) trashBgRef.current.pause();
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      if (bgRef.current) {
        if (next) bgRef.current.pause();
        else if (!bgRef.current.ended) bgRef.current.play().catch(() => {});
      }
      if (trashBgRef.current) {
        if (next) trashBgRef.current.pause();
        else if (!trashBgRef.current.ended && trashBgRef.current.currentTime > 0) {
          trashBgRef.current.play().catch(() => {});
        }
      }
      return next;
    });
  }, []);

  return { muted, toggleMute, startBg, stopBg, playClick, playCorrect, playWrong, playComplete, startTrashBg, stopTrashBg };
}
