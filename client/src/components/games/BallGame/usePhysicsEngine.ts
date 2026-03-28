import { useEffect, useRef, useCallback } from 'react';
import Matter from 'matter-js';
import type { LevelConfig } from './types';

interface UsePhysicsEngineProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  levelConfig: LevelConfig;
  enabled: boolean;
  onBallInBasket: () => void;
  onBallBounce: () => void;
}

interface UsePhysicsEngineReturn {
  resetBall: () => void;
}

// Preload images
const imageCache = new Map<string, HTMLImageElement>();
function getImage(src: string): HTMLImageElement {
  if (imageCache.has(src)) return imageCache.get(src)!;
  const img = new Image();
  img.src = src;
  imageCache.set(src, img);
  return img;
}

const BALL_RADIUS_FRAC = 0.04; // fraction of canvas width
const ACCELERATION = 5;
const RESTITUTION = 0.6;

export function usePhysicsEngine({
  canvasRef,
  levelConfig,
  enabled,
  onBallInBasket,
  onBallBounce,
}: UsePhysicsEngineProps): UsePhysicsEngineReturn {
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderLoopRef = useRef<number>(0);
  const ballRef = useRef<Matter.Body | null>(null);
  const basketSensorRef = useRef<Matter.Body | null>(null);
  const dragStateRef = useRef<{ dragging: boolean; startX: number; startY: number }>({
    dragging: false,
    startX: 0,
    startY: 0,
  });
  const scoredRef = useRef(false);
  const onBallInBasketRef = useRef(onBallInBasket);
  const onBallBounceRef = useRef(onBallBounce);
  const enabledRef = useRef(enabled);
  const levelConfigRef = useRef(levelConfig);

  onBallInBasketRef.current = onBallInBasket;
  onBallBounceRef.current = onBallBounce;
  enabledRef.current = enabled;
  levelConfigRef.current = levelConfig;

  // Preload level images
  useEffect(() => {
    getImage(levelConfig.bgImage);
    getImage(levelConfig.basketImage);
    getImage('/images/ballgame/yellowBall.png');
    getImage('/images/ballgame/fliper1.png');
    getImage('/images/ballgame/fliper2.png');
  }, [levelConfig]);

  const setupWorld = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = canvas.width;
    const h = canvas.height;
    const config = levelConfigRef.current;
    const ballRadius = w * BALL_RADIUS_FRAC;

    // Cleanup previous
    if (engineRef.current) {
      Matter.Engine.clear(engineRef.current);
    }
    if (renderLoopRef.current) {
      cancelAnimationFrame(renderLoopRef.current);
    }

    const engine = Matter.Engine.create({
      gravity: { x: 0, y: 1.5, scale: 0.001 },
    });
    engineRef.current = engine;
    scoredRef.current = false;

    // Boundary walls
    const wallThickness = 20;
    const floor = Matter.Bodies.rectangle(w / 2, h + wallThickness / 2, w * 2, wallThickness, {
      isStatic: true,
      restitution: RESTITUTION,
      label: 'wall',
    });
    const leftWall = Matter.Bodies.rectangle(-wallThickness / 2, h / 2, wallThickness, h * 2, {
      isStatic: true,
      restitution: RESTITUTION,
      label: 'wall',
    });
    const rightWall = Matter.Bodies.rectangle(w + wallThickness / 2, h / 2, wallThickness, h * 2, {
      isStatic: true,
      restitution: RESTITUTION,
      label: 'wall',
    });

    // Level-specific walls
    const levelWalls = config.walls.map((wc) =>
      Matter.Bodies.rectangle(
        wc.x * w,
        wc.y * h,
        wc.width * w,
        wc.height * h,
        {
          isStatic: true,
          restitution: RESTITUTION,
          angle: wc.angle || 0,
          label: 'wall',
          render: { visible: false },
        }
      )
    );

    // Basket sensor (invisible, detects ball entry)
    const bx = config.basketPosition.x * w;
    const by = config.basketPosition.y * h;
    const sensorW = w * 0.08;
    const sensorH = h * 0.04;
    const basketSensor = Matter.Bodies.rectangle(bx, by, sensorW, sensorH, {
      isStatic: true,
      isSensor: true,
      label: 'basket',
    });
    basketSensorRef.current = basketSensor;

    // Ball
    const spawnX = config.ballSpawn.x * w;
    const spawnY = config.ballSpawn.y * h;
    const ball = Matter.Bodies.circle(spawnX, spawnY, ballRadius, {
      restitution: RESTITUTION,
      friction: 0.05,
      density: 0.002,
      label: 'ball',
    });
    ballRef.current = ball;

    Matter.Composite.add(engine.world, [
      floor,
      leftWall,
      rightWall,
      ...levelWalls,
      basketSensor,
      ball,
    ]);

    // Collision detection
    Matter.Events.on(engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        const labels = [pair.bodyA.label, pair.bodyB.label];
        if (labels.includes('ball') && labels.includes('basket') && !scoredRef.current) {
          scoredRef.current = true;
          onBallInBasketRef.current();
        }
        if (labels.includes('ball') && labels.includes('wall')) {
          onBallBounceRef.current();
        }
      }
    });

    // Rendering loop
    const bgImg = getImage(config.bgImage);
    const basketImg = getImage(config.basketImage);
    const ballImg = getImage('/images/ballgame/yellowBall.png');
    const flipper1Img = getImage('/images/ballgame/fliper1.png');
    const flipper2Img = getImage('/images/ballgame/fliper2.png');
    const ctx = canvas.getContext('2d')!;

    let lastTime = performance.now();

    const renderLoop = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;

      if (enabledRef.current) {
        Matter.Engine.update(engine, Math.min(delta, 33.33));
      }

      ctx.clearRect(0, 0, w, h);

      // Draw background
      if (bgImg.complete) {
        ctx.drawImage(bgImg, 0, h * 0.45, w, h * 0.55);
      }

      // Draw basket
      if (basketImg.complete) {
        const basketW = w * 0.22;
        const basketH = basketW * (basketImg.naturalHeight / (basketImg.naturalWidth || 1));
        ctx.drawImage(
          basketImg,
          bx - basketW / 2,
          by - basketH * 0.7,
          basketW,
          basketH
        );
      }

      // Draw flippers (static decorative elements near ball spawn)
      const flipW = w * 0.08;
      const flipH = flipW * 2.5;
      const flipY = spawnY + ballRadius * 2;
      if (flipper1Img.complete) {
        ctx.save();
        ctx.translate(spawnX - w * 0.12, flipY);
        ctx.rotate(-0.6);
        ctx.drawImage(flipper1Img, -flipW / 2, -flipH / 2, flipW, flipH);
        ctx.restore();
      }
      if (flipper2Img.complete) {
        ctx.save();
        ctx.translate(spawnX + w * 0.12, flipY);
        ctx.rotate(0.6);
        ctx.drawImage(flipper2Img, -flipW / 2, -flipH / 2, flipW, flipH);
        ctx.restore();
      }

      // Draw ball
      if (ballRef.current && ballImg.complete) {
        const pos = ballRef.current.position;
        const size = ballRadius * 2.2;
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(ballRef.current.angle);
        ctx.drawImage(ballImg, -size / 2, -size / 2, size, size);
        ctx.restore();
      }

      renderLoopRef.current = requestAnimationFrame(renderLoop);
    };

    renderLoopRef.current = requestAnimationFrame(renderLoop);
  }, [canvasRef]);

  // Setup and teardown
  useEffect(() => {
    if (!enabled) return;
    setupWorld();

    return () => {
      if (renderLoopRef.current) {
        cancelAnimationFrame(renderLoopRef.current);
      }
      if (engineRef.current) {
        Matter.Engine.clear(engineRef.current);
        engineRef.current = null;
      }
    };
  }, [enabled, setupWorld]);

  // Pointer events for drag-to-throw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled) return;

    const ballRadius = canvas.width * BALL_RADIUS_FRAC;

    const isOnBall = (x: number, y: number): boolean => {
      if (!ballRef.current) return false;
      const pos = ballRef.current.position;
      const dx = x - pos.x;
      const dy = y - pos.y;
      return dx * dx + dy * dy < (ballRadius * 2.5) * (ballRadius * 2.5);
    };

    const getCanvasPos = (e: PointerEvent): { x: number; y: number } => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    const handlePointerDown = (e: PointerEvent) => {
      const pos = getCanvasPos(e);
      if (isOnBall(pos.x, pos.y) && ballRef.current) {
        dragStateRef.current = { dragging: true, startX: pos.x, startY: pos.y };
        Matter.Body.setStatic(ballRef.current, true);
        canvas.setPointerCapture(e.pointerId);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!dragStateRef.current.dragging || !ballRef.current) return;
      const pos = getCanvasPos(e);
      Matter.Body.setPosition(ballRef.current, { x: pos.x, y: pos.y });
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!dragStateRef.current.dragging || !ballRef.current) return;
      const pos = getCanvasPos(e);
      const dx = (dragStateRef.current.startX - pos.x) * ACCELERATION;
      const dy = (dragStateRef.current.startY - pos.y) * ACCELERATION;

      Matter.Body.setStatic(ballRef.current, false);
      Matter.Body.setVelocity(ballRef.current, {
        x: dx * 0.04,
        y: dy * 0.04,
      });
      dragStateRef.current.dragging = false;
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [canvasRef, enabled]);

  const resetBall = useCallback(() => {
    const canvas = canvasRef.current;
    if (!ballRef.current || !canvas) return;
    const config = levelConfigRef.current;
    scoredRef.current = false;
    Matter.Body.setStatic(ballRef.current, false);
    Matter.Body.setVelocity(ballRef.current, { x: 0, y: 0 });
    Matter.Body.setAngularVelocity(ballRef.current, 0);
    Matter.Body.setPosition(ballRef.current, {
      x: config.ballSpawn.x * canvas.width,
      y: config.ballSpawn.y * canvas.height,
    });
  }, [canvasRef]);

  return { resetBall };
}
