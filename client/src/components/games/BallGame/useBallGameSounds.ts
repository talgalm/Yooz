import { useRef, useEffect, useCallback, useState } from 'react';

const SOUND_PATHS = {
  bgMusic: '/sounds/ballgame/bgmusic.mp3',
  correct: '/sounds/ballgame/correct.mp3',
  wrong: '/sounds/ballgame/wrong.mp3',
  applause: '/sounds/ballgame/applause.mp3',
  ballBounce: '/sounds/ballgame/ball_bounce.mp3',
  ballIntoBucket: '/sounds/ballgame/ball_into_bucket.mp3',
  flipper: '/sounds/ballgame/fliper.mp3',
  click: '/sounds/ballgame/click.mp3',
};

const SFX_VOLUME = 0.7;
const BG_MUSIC_VOLUME = 0.15;

function createAudio(src: string, loop = false, volume = SFX_VOLUME): HTMLAudioElement {
  const audio = new Audio(src);
  audio.loop = loop;
  audio.volume = volume;
  return audio;
}

export function useBallGameSounds() {
  const [isMuted, setIsMuted] = useState(false);
  const mutedRef = useRef(false);

  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const correctRef = useRef<HTMLAudioElement | null>(null);
  const wrongRef = useRef<HTMLAudioElement | null>(null);
  const applauseRef = useRef<HTMLAudioElement | null>(null);
  const ballBounceRef = useRef<HTMLAudioElement | null>(null);
  const ballIntoBucketRef = useRef<HTMLAudioElement | null>(null);
  const flipperRef = useRef<HTMLAudioElement | null>(null);
  const clickRef = useRef<HTMLAudioElement | null>(null);

  const lastBounceTimeRef = useRef(0);

  useEffect(() => {
    bgMusicRef.current = createAudio(SOUND_PATHS.bgMusic, true, BG_MUSIC_VOLUME);
    correctRef.current = createAudio(SOUND_PATHS.correct);
    wrongRef.current = createAudio(SOUND_PATHS.wrong);
    applauseRef.current = createAudio(SOUND_PATHS.applause);
    ballBounceRef.current = createAudio(SOUND_PATHS.ballBounce);
    ballIntoBucketRef.current = createAudio(SOUND_PATHS.ballIntoBucket);
    flipperRef.current = createAudio(SOUND_PATHS.flipper);
    clickRef.current = createAudio(SOUND_PATHS.click);

    return () => {
      [bgMusicRef, correctRef, wrongRef, applauseRef, ballBounceRef, ballIntoBucketRef, flipperRef, clickRef].forEach((ref) => {
        if (ref.current) {
          ref.current.pause();
          ref.current = null;
        }
      });
    };
  }, []);

  const playSfx = useCallback((ref: React.RefObject<HTMLAudioElement | null>, volume?: number) => {
    if (mutedRef.current || !ref.current) return;
    ref.current.volume = volume ?? SFX_VOLUME;
    ref.current.currentTime = 0;
    ref.current.play().catch(() => {});
  }, []);

  const playCorrect = useCallback(() => playSfx(correctRef), [playSfx]);
  const playWrong = useCallback(() => playSfx(wrongRef), [playSfx]);
  const playApplause = useCallback(() => playSfx(applauseRef), [playSfx]);
  const playFlipper = useCallback(() => playSfx(flipperRef), [playSfx]);
  const playClick = useCallback(() => playSfx(clickRef), [playSfx]);
  const playBallIntoBucket = useCallback(() => playSfx(ballIntoBucketRef), [playSfx]);

  const playBallBounce = useCallback(() => {
    if (mutedRef.current || !ballBounceRef.current) return;
    const now = Date.now();
    const diff = now - lastBounceTimeRef.current;
    lastBounceTimeRef.current = now;
    const vol = diff >= 400 ? SFX_VOLUME : Math.min(SFX_VOLUME, (diff / 400) * SFX_VOLUME);
    ballBounceRef.current.volume = vol;
    ballBounceRef.current.currentTime = 0;
    ballBounceRef.current.play().catch(() => {});
  }, []);

  const startBgMusic = useCallback(() => {
    if (!bgMusicRef.current) return;
    bgMusicRef.current.volume = mutedRef.current ? 0 : BG_MUSIC_VOLUME;
    bgMusicRef.current.play().catch(() => {});
  }, []);

  const stopBgMusic = useCallback(() => {
    if (!bgMusicRef.current) return;
    bgMusicRef.current.pause();
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      mutedRef.current = next;
      if (bgMusicRef.current) {
        bgMusicRef.current.volume = next ? 0 : BG_MUSIC_VOLUME;
      }
      return next;
    });
  }, []);

  return {
    playCorrect,
    playWrong,
    playApplause,
    playBallBounce,
    playBallIntoBucket,
    playFlipper,
    playClick,
    startBgMusic,
    stopBgMusic,
    isMuted,
    toggleMute,
  };
}
