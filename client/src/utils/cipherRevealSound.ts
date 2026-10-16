const CIPHER_REVEAL_SOUND = '/sounds/cipher-reveal.wav';

let revealAudio: HTMLAudioElement | null = null;

function audio(): HTMLAudioElement | null {
  if (revealAudio || typeof Audio === 'undefined') return revealAudio;
  revealAudio = new Audio(CIPHER_REVEAL_SOUND);
  revealAudio.preload = 'auto';
  return revealAudio;
}

function unlockOnFirstTap() {
  const element = audio();
  if (!element || !element.paused) return;
  element.muted = true;
  element.play()
    .then(() => {
      element.pause();
      element.currentTime = 0;
    })
    .catch(() => undefined)
    .finally(() => {
      element.muted = false;
    });
}

if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', unlockOnFirstTap, { once: true, capture: true });
}

export function playCipherRevealSound(): void {
  const element = audio();
  if (!element) return;
  element.muted = false;
  element.currentTime = 0;
  element.play().catch(() => undefined);
}

export function stopCipherRevealSound(): void {
  if (!revealAudio) return;
  revealAudio.pause();
  revealAudio.currentTime = 0;
}
