import { useRef, useEffect } from 'react';
import { usePhysicsEngine } from './usePhysicsEngine';
import type { LevelConfig } from './types';

interface BallGameCanvasProps {
  levelConfig: LevelConfig;
  enabled: boolean;
  onBallInBasket: () => void;
  onBallBounce: () => void;
}

const GAME_WIDTH = 360;
const GAME_HEIGHT = 640;

export default function BallGameCanvas({
  levelConfig,
  enabled,
  onBallInBasket,
  onBallBounce,
}: BallGameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const aspect = GAME_WIDTH / GAME_HEIGHT;
      let w: number, h: number;

      if (cw / ch > aspect) {
        h = ch;
        w = h * aspect;
      } else {
        w = cw;
        h = w / aspect;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${Math.round(w)}px`;
      canvas.style.height = `${Math.round(h)}px`;
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  usePhysicsEngine({
    canvasRef,
    levelConfig,
    enabled,
    onBallInBasket,
    onBallBounce,
  });

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          touchAction: 'none',
          display: 'block',
          background: '#000',
        }}
      />
    </div>
  );
}
