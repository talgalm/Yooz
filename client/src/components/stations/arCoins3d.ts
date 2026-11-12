import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CylinderGeometry,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Points,
  PointsMaterial,
  Scene,
  Shape,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
  type Material,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { ArGameState } from '../../utils/arGame';

export const COIN_RADIUS_M = 0.17;
export const COIN_HEIGHT_M = 1.2;
const COIN_THICKNESS_M = 0.03;
const SPIN_RATE = 1.6;
const BOB_M = 0.04;
const COLLECT_ANIM_S = 0.5;
const BURST_LIFE_S = 0.9;
const BURST_PARTICLES = 30;
const BURST_GRAVITY = 2.2;
const SHADOW_SIZE_M = 0.6;
const HALO_SIZE_M = 0.75;

interface CoinEntity {
  root: Group;
  spinner: Group;
  halo: Sprite;
  shadow: Mesh;
  collectedAt: number | null;
}

interface Burst {
  points: Points;
  velocities: Float32Array;
  bornAt: number;
}

export interface CoinScene {
  renderer: WebGLRenderer;
  camera: PerspectiveCamera;
  update: (game: ArGameState | null, time: number, dt: number, floorY: number) => number;
  render: () => void;
  focalPixels: (height: number) => number;
  dispose: () => void;
}

function gradientTexture(stops: Array<[number, string]>): CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  return new CanvasTexture(canvas);
}

function sparkleTexture(): CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    glow.addColorStop(0, 'rgba(255, 255, 255, 1)');
    glow.addColorStop(0.25, 'rgba(255, 236, 160, 0.9)');
    glow.addColorStop(1, 'rgba(255, 200, 60, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(32, 2);
    ctx.quadraticCurveTo(36, 28, 62, 32);
    ctx.quadraticCurveTo(36, 36, 32, 62);
    ctx.quadraticCurveTo(28, 36, 2, 32);
    ctx.quadraticCurveTo(28, 28, 32, 2);
    ctx.fill();
  }
  return new CanvasTexture(canvas);
}

function starShape(outer: number, inner: number): Shape {
  const shape = new Shape();
  for (let i = 0; i < 10; i++) {
    const angle = Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? outer : inner;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function buildCoin(face: MeshStandardMaterial, edge: MeshStandardMaterial, relief: MeshStandardMaterial) {
  const body = new CylinderGeometry(COIN_RADIUS_M, COIN_RADIUS_M, COIN_THICKNESS_M, 72, 1, false);
  body.rotateX(Math.PI / 2);
  const rim = new TorusGeometry(COIN_RADIUS_M * 0.9, COIN_THICKNESS_M * 0.2, 14, 72);
  const star = new ExtrudeGeometry(starShape(COIN_RADIUS_M * 0.52, COIN_RADIUS_M * 0.22), {
    depth: COIN_THICKNESS_M * 0.18,
    bevelEnabled: true,
    bevelThickness: COIN_THICKNESS_M * 0.12,
    bevelSize: COIN_RADIUS_M * 0.035,
    bevelSegments: 3,
  });
  star.center();
  const coin = new Group();
  coin.add(new Mesh(body, [edge, face, face]));
  const front = COIN_THICKNESS_M / 2;
  for (const side of [1, -1]) {
    const ring = new Mesh(rim, relief);
    ring.position.z = side * front;
    coin.add(ring);
    const emblem = new Mesh(star, relief);
    emblem.position.z = side * (front + COIN_THICKNESS_M * 0.12);
    if (side < 0) emblem.rotation.y = Math.PI;
    coin.add(emblem);
  }
  return { coin, geometries: [body, rim, star] };
}

function goldStage(canvas: HTMLCanvasElement) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environment;
  scene.add(new HemisphereLight(0xffffff, 0x554466, 0.7));
  const sun = new DirectionalLight(0xfff4dd, 1.6);
  sun.position.set(2, 5, 1.5);
  scene.add(sun);
  const face = new MeshStandardMaterial({ color: 0xffc43d, metalness: 1, roughness: 0.22 });
  const edge = new MeshStandardMaterial({ color: 0xd99a1e, metalness: 1, roughness: 0.38 });
  const relief = new MeshStandardMaterial({ color: 0xffdc6e, metalness: 1, roughness: 0.14 });
  const { coin, geometries } = buildCoin(face, edge, relief);
  const disposables: Array<{ dispose: () => void }> = [face, edge, relief, environment, pmrem, ...geometries];
  return { renderer, scene, coin, disposables };
}

export function createCoinScene(canvas: HTMLCanvasElement): CoinScene {
  const { renderer, scene, coin: template, disposables } = goldStage(canvas);
  const camera = new PerspectiveCamera(60, 1, 0.05, 100);
  const shadowTexture = gradientTexture([[0, 'rgba(0, 0, 0, 0.32)'], [0.4, 'rgba(0, 0, 0, 0.16)'], [1, 'rgba(0, 0, 0, 0)']]);
  const haloTexture = gradientTexture([[0, 'rgba(255, 214, 90, 0.55)'], [0.45, 'rgba(255, 190, 40, 0.18)'], [1, 'rgba(255, 180, 0, 0)']]);
  const sparkle = sparkleTexture();
  const shadowGeometry = new PlaneGeometry(SHADOW_SIZE_M, SHADOW_SIZE_M);
  shadowGeometry.rotateX(-Math.PI / 2);

  const entities: CoinEntity[] = [];
  const bursts: Burst[] = [];
  disposables.push(shadowTexture, haloTexture, sparkle, shadowGeometry);

  const addEntity = () => {
    const root = new Group();
    const spinner = template.clone();
    root.add(spinner);
    const halo = new Sprite(new SpriteMaterial({ map: haloTexture, blending: AdditiveBlending, depthWrite: false, transparent: true }));
    halo.scale.set(HALO_SIZE_M, HALO_SIZE_M, 1);
    root.add(halo);
    const shadow = new Mesh(shadowGeometry, new MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, toneMapped: false }));
    scene.add(root, shadow);
    disposables.push(halo.material, shadow.material as Material);
    entities.push({ root, spinner, halo, shadow, collectedAt: null });
  };

  const addBurst = (at: Vector3, time: number) => {
    const positions = new Float32Array(BURST_PARTICLES * 3);
    const velocities = new Float32Array(BURST_PARTICLES * 3);
    for (let i = 0; i < BURST_PARTICLES; i++) {
      const angle = (i / BURST_PARTICLES) * Math.PI * 2;
      const lift = Math.random();
      const speed = 0.6 + Math.random() * 0.8;
      positions.set([at.x, at.y, at.z], i * 3);
      velocities.set([Math.cos(angle) * speed, 0.6 + lift * 1.4, Math.sin(angle) * speed], i * 3);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    const material = new PointsMaterial({ map: sparkle, size: 0.07, transparent: true, depthWrite: false, blending: AdditiveBlending, color: 0xffe8a0 });
    const points = new Points(geometry, material);
    scene.add(points);
    bursts.push({ points, velocities, bornAt: time });
  };

  const updateBursts = (time: number, dt: number) => {
    for (let i = bursts.length - 1; i >= 0; i--) {
      const burst = bursts[i];
      const age = time - burst.bornAt;
      if (age > BURST_LIFE_S) {
        scene.remove(burst.points);
        burst.points.geometry.dispose();
        (burst.points.material as Material).dispose();
        bursts.splice(i, 1);
        continue;
      }
      const attribute = burst.points.geometry.getAttribute('position') as BufferAttribute;
      const positions = attribute.array as Float32Array;
      for (let p = 0; p < BURST_PARTICLES; p++) {
        burst.velocities[p * 3 + 1] -= BURST_GRAVITY * dt;
        positions[p * 3] += burst.velocities[p * 3] * dt;
        positions[p * 3 + 1] += burst.velocities[p * 3 + 1] * dt;
        positions[p * 3 + 2] += burst.velocities[p * 3 + 2] * dt;
      }
      attribute.needsUpdate = true;
      (burst.points.material as PointsMaterial).opacity = 1 - age / BURST_LIFE_S;
    }
  };

  const activeCamera = () => (renderer.xr.isPresenting ? renderer.xr.getCamera() : camera);

  return {
    renderer,
    camera,
    update(game, time, dt, floorY) {
      let newlyCollected = 0;
      if (game) {
        while (entities.length < game.coins.length) addEntity();
        game.coins.forEach((coin, i) => {
          const entity = entities[i];
          const hover = floorY + COIN_HEIGHT_M + Math.sin(time * 2 + coin.phase) * BOB_M;
          if (coin.collectedAt !== null && entity.collectedAt === null) {
            entity.collectedAt = time;
            newlyCollected += 1;
            addBurst(new Vector3(coin.x, hover, coin.z), time);
          }
          const age = entity.collectedAt === null ? -1 : time - entity.collectedAt;
          const gone = age >= COLLECT_ANIM_S;
          entity.root.visible = !gone;
          entity.shadow.visible = !gone;
          if (gone) return;
          const t = Math.max(0, age) / COLLECT_ANIM_S;
          const shrink = age < 0 ? 1 : (1 - t) * (1 + 0.6 * Math.sin(t * Math.PI));
          const rise = age < 0 ? 0 : 0.5 * (1 - (1 - t) ** 3);
          entity.root.position.set(coin.x, hover + rise, coin.z);
          entity.root.scale.setScalar(Math.max(0.001, shrink));
          entity.spinner.rotation.y = time * (age < 0 ? SPIN_RATE : SPIN_RATE * 7) + coin.phase;
          (entity.halo.material as SpriteMaterial).opacity = age < 0 ? 1 : 1 - t;
          entity.shadow.position.set(coin.x, floorY + 0.004, coin.z);
          const shadowScale = (1 - Math.sin(time * 2 + coin.phase) * 0.12) * (age < 0 ? 1 : 1 - t);
          entity.shadow.scale.set(shadowScale, 1, shadowScale);
        });
      }
      updateBursts(time, dt);
      return newlyCollected;
    },
    render() {
      renderer.render(scene, camera);
    },
    focalPixels(height) {
      return (activeCamera().projectionMatrix.elements[5] * height) / 2;
    },
    dispose() {
      renderer.setAnimationLoop(null);
      bursts.forEach((burst) => {
        burst.points.geometry.dispose();
        (burst.points.material as Material).dispose();
      });
      disposables.forEach((item) => item.dispose());
      renderer.dispose();
    },
  };
}

