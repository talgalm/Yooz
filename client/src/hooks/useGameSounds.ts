import { useRef, useEffect, useCallback, useState } from 'react';

export interface GameSoundPaths {
  correct: string;
  wrong: string;
  gameOver: string;
  bgMusic: string;
}

const DEFAULT_PATHS: GameSoundPaths = {
  correct: '/sounds/correct.mp3',
  wrong: '/sounds/wrong.mp3',
  gameOver: '/sounds/Gameover.mp3',
  bgMusic: '/sounds/GameBg.mp3',
};

const BG_MUSIC_VOLUME = 0.3;
const SFX_VOLUME = 0.7;

export function useGameSounds(custom?: Partial<GameSoundPaths>) {
  const paths = { ...DEFAULT_PATHS, ...custom };
  const [isMuted, setIsMuted] = useState(false);
  const mutedRef = useRef(false);

  const correctRef = useRef<HTMLAudioElement | null>(null);
  const wrongRef = useRef<HTMLAudioElement | null>(null);
  const gameOverRef = useRef<HTMLAudioElement | null>(null);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    correctRef.current = new Audio(paths.correct);
    correctRef.current.volume = SFX_VOLUME;

    wrongRef.current = new Audio(paths.wrong);
    wrongRef.current.volume = SFX_VOLUME;

    gameOverRef.current = new Audio(paths.gameOver);
    gameOverRef.current.volume = SFX_VOLUME;

    bgMusicRef.current = new Audio(paths.bgMusic);
    bgMusicRef.current.volume = BG_MUSIC_VOLUME;
    bgMusicRef.current.loop = true;

    return () => {
      [correctRef, wrongRef, gameOverRef, bgMusicRef].forEach((ref) => {
        if (ref.current) {
          ref.current.pause();
          ref.current.src = '';
          ref.current = null;
        }
      });
    };
  }, []);

  const playSfx = useCallback((audio: HTMLAudioElement | null) => {
    if (!audio || mutedRef.current) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }, []);

  const playCorrect = useCallback(() => playSfx(correctRef.current), [playSfx]);
  const playWrong = useCallback(() => playSfx(wrongRef.current), [playSfx]);
  const playGameOver = useCallback(() => {
    if (bgMusicRef.current) {
      bgMusicRef.current.pause();
    }
    playSfx(gameOverRef.current);
  }, [playSfx]);

  const startBgMusic = useCallback(() => {
    if (bgMusicRef.current && !mutedRef.current) {
      bgMusicRef.current.currentTime = 0;
      bgMusicRef.current.play().catch(() => {});
    }
  }, []);

  const stopBgMusic = useCallback(() => {
    if (bgMusicRef.current) {
      bgMusicRef.current.pause();
    }
  }, []);

  const toggleMute = useCallback(() => {
    const newMuted = !mutedRef.current;
    mutedRef.current = newMuted;
    setIsMuted(newMuted);

    if (newMuted) {
      if (bgMusicRef.current) bgMusicRef.current.pause();
    } else {
      if (bgMusicRef.current && bgMusicRef.current.currentTime > 0) {
        bgMusicRef.current.play().catch(() => {});
      }
    }
  }, []);

  return { playCorrect, playWrong, playGameOver, startBgMusic, stopBgMusic, isMuted, toggleMute };
}
