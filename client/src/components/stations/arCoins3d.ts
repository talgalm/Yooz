import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BoxGeometry,
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
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
  type Material,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { ArGameState } from '../../utils/arGame';
import type { ArHuntMode } from '../../utils/arStation';

export const COIN_RADIUS_M = 0.17;
export const COIN_HEIGHT_M = 1.2;
const COIN_THICKNESS_M = 0.03;
const SUITCASE_W = 0.56;
const SUITCASE_H = 0.4;
const SUITCASE_D = 0.2;
const SUITCASE_PICK_RADIUS_M = 0.32;
const SPIN_RATE = 1.6;
const BOB_M = 0.04;
const COLLECT_ANIM_S = 0.5;
const BURST_LIFE_S = 0.9;
const BURST_PARTICLES = 30;
const BURST_GRAVITY = 2.2;
const SHADOW_SIZE_M = 0.6;
const HALO_SIZE_M = 0.75;
const MIN_TAP_RADIUS_PX = 46;
const TAP_SLACK = 1.5;
const RIDDLE_SCALE = 1.18;
const RIDDLE_RELIEF_DEPTH = 0.55;
const GOLD_SPARK = 0xffe8a0;
const RIDDLE_SPARK = 0xd2b6ff;

interface CoinEntity {
  root: Group;
  spinner: Group;
  halo: Sprite;
  shadow: Mesh;
  size: number;
  collectedAt: number | null;
}

interface Burst {
  points: Points;
  velocities: Float32Array;
  bornAt: number;
}

export interface ScreenSpot {
  x: number;
  y: number;
  radius: number;
}

export interface CoinScene {
  renderer: WebGLRenderer;
  camera: PerspectiveCamera;
  update: (game: ArGameState | null, time: number, dt: number, floorY: number, reachable: ReadonlySet<number>) => void;
  render: () => void;
  focalPixels: (height: number) => number;
  screenOf: (id: number, width: number, height: number) => ScreenSpot | null;
  pick: (x: number, y: number, width: number, height: number) => number | null;
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

function tagTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#efe2c2';
    ctx.fillRect(0, 0, 128, 80);
    ctx.fillStyle = '#b3261e';
    ctx.font = '900 54px Rubik, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('47', 64, 44);
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

interface GoldMaterials {
  face: MeshStandardMaterial;
  edge: MeshStandardMaterial;
  relief: MeshStandardMaterial;
}

function starEmblem(): { parts: BufferGeometry[]; lift: number } {
  const star = new ExtrudeGeometry(starShape(COIN_RADIUS_M * 0.52, COIN_RADIUS_M * 0.22), {
    depth: COIN_THICKNESS_M * 0.18,
    bevelEnabled: true,
    bevelThickness: COIN_THICKNESS_M * 0.12,
    bevelSize: COIN_RADIUS_M * 0.035,
    bevelSegments: 3,
  });
  star.center();
  return { parts: [star], lift: COIN_THICKNESS_M * 0.12 };
}

function questionEmblem(): { parts: BufferGeometry[]; lift: number } {
  const tube = COIN_RADIUS_M * 0.085;
  const bend = COIN_RADIUS_M * 0.24;
  const middle = COIN_RADIUS_M * 0.26;
  const stem = COIN_RADIUS_M * 0.2;
  const dotRadius = COIN_RADIUS_M * 0.11;
  const hook = new TorusGeometry(bend, tube, 14, 48, Math.PI * 1.5);
  hook.rotateZ(-Math.PI / 2);
  hook.translate(0, middle, 0);
  const neck = new CylinderGeometry(tube, tube, stem, 14);
  neck.translate(0, middle - bend - stem / 2, 0);
  const dot = new SphereGeometry(dotRadius, 18, 12);
  dot.translate(0, middle - bend - stem - COIN_RADIUS_M * 0.1 - dotRadius, 0);
  const parts = [hook, neck, dot];
  parts.forEach((part) => part.scale(1, 1, RIDDLE_RELIEF_DEPTH));
  return { parts, lift: 0 };
}

function buildCoin({ face, edge, relief }: GoldMaterials, emblem: { parts: BufferGeometry[]; lift: number }) {
  const body = new CylinderGeometry(COIN_RADIUS_M, COIN_RADIUS_M, COIN_THICKNESS_M, 72, 1, false);
  body.rotateX(Math.PI / 2);
  const rim = new TorusGeometry(COIN_RADIUS_M * 0.9, COIN_THICKNESS_M * 0.2, 14, 72);
  const coin = new Group();
  coin.add(new Mesh(body, [edge, face, face]));
  const front = COIN_THICKNESS_M / 2;
  for (const side of [1, -1]) {
    const ring = new Mesh(rim, relief);
    ring.position.z = side * front;
    coin.add(ring);
    const mark = new Group();
    emblem.parts.forEach((part) => mark.add(new Mesh(part, relief)));
    mark.position.z = side * (front + emblem.lift);
    if (side < 0) mark.rotation.y = Math.PI;
    coin.add(mark);
  }
  return { model: coin, disposables: [body, rim, ...emblem.parts] };
}

function buildRiddleCoin(gold: GoldMaterials) {
  const face = new MeshStandardMaterial({ color: 0x7b4dff, metalness: 0.85, roughness: 0.26 });
  const edge = new MeshStandardMaterial({ color: 0x4f22c4, metalness: 0.9, roughness: 0.36 });
  const built = buildCoin({ face, edge, relief: gold.relief }, questionEmblem());
  return { model: built.model, disposables: [face, edge, ...built.disposables] };
}

function buildSuitcase({ face }: GoldMaterials) {
  const leather = new MeshStandardMaterial({ color: 0x7a4527, roughness: 0.62, metalness: 0.04 });
  const strapLeather = new MeshStandardMaterial({ color: 0x3e2213, roughness: 0.7, metalness: 0.02 });
  const tagMap = tagTexture();
  const tagPaper = new MeshStandardMaterial({ map: tagMap, roughness: 0.85 });
  const body = new RoundedBoxGeometry(SUITCASE_W, SUITCASE_H, SUITCASE_D, 4, 0.045);
  const strap = new BoxGeometry(0.042, SUITCASE_H + 0.006, SUITCASE_D + 0.008);
  const buckle = new BoxGeometry(0.06, 0.05, 0.012);
  const lock = new BoxGeometry(0.11, 0.065, 0.016);
  const handle = new TorusGeometry(0.075, 0.014, 10, 28, Math.PI);
  const foot = new BoxGeometry(0.03, 0.016, 0.03);
  const tag = new PlaneGeometry(0.1, 0.062);
  const suitcase = new Group();
  suitcase.add(new Mesh(body, leather));
  for (const x of [-0.15, 0.15]) {
    const band = new Mesh(strap, strapLeather);
    band.position.x = x;
    suitcase.add(band);
    const clasp = new Mesh(buckle, face);
    clasp.position.set(x, 0.07, SUITCASE_D / 2 + 0.007);
    suitcase.add(clasp);
  }
  const plate = new Mesh(lock, face);
  plate.position.set(0, 0.12, SUITCASE_D / 2 + 0.008);
  suitcase.add(plate);
  const grip = new Mesh(handle, strapLeather);
  grip.position.y = SUITCASE_H / 2 - 0.005;
  suitcase.add(grip);
  for (const x of [-0.23, 0.23]) {
    const leg = new Mesh(foot, face);
    leg.position.set(x, -SUITCASE_H / 2 - 0.004, 0);
    suitcase.add(leg);
  }
  const label = new Mesh(tag, tagPaper);
  label.position.set(0.21, -0.05, SUITCASE_D / 2 + 0.006);
  label.rotation.z = -0.22;
  suitcase.add(label);
  return { model: suitcase, disposables: [leather, strapLeather, tagMap, tagPaper, body, strap, buckle, lock, handle, foot, tag] };
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
  const gold: GoldMaterials = {
    face: new MeshStandardMaterial({ color: 0xffc43d, metalness: 1, roughness: 0.22 }),
    edge: new MeshStandardMaterial({ color: 0xd99a1e, metalness: 1, roughness: 0.38 }),
    relief: new MeshStandardMaterial({ color: 0xffdc6e, metalness: 1, roughness: 0.14 }),
  };
  const disposables: Array<{ dispose: () => void }> = [gold.face, gold.edge, gold.relief, environment, pmrem];
  return { renderer, scene, gold, disposables };
}

export function createCoinScene(canvas: HTMLCanvasElement, mode: ArHuntMode = 'coins'): CoinScene {
  const { renderer, scene, gold, disposables } = goldStage(canvas);
  const suitcase = mode === 'suitcase';
  const built = suitcase ? buildSuitcase(gold) : buildCoin(gold, starEmblem());
  const riddleBuilt = suitcase ? null : buildRiddleCoin(gold);
  const template = built.model;
  const targetRadius = suitcase ? SUITCASE_PICK_RADIUS_M : COIN_RADIUS_M;
  const vanishAfter = suitcase ? COLLECT_ANIM_S : 0;
  const camera = new PerspectiveCamera(60, 1, 0.05, 100);
  const shadowTexture = gradientTexture([[0, `rgba(0, 0, 0, ${suitcase ? 0.45 : 0.32})`], [0.4, 'rgba(0, 0, 0, 0.16)'], [1, 'rgba(0, 0, 0, 0)']]);
  const haloTexture = gradientTexture([[0, 'rgba(255, 214, 90, 0.55)'], [0.45, 'rgba(255, 190, 40, 0.18)'], [1, 'rgba(255, 180, 0, 0)']]);
  const riddleHaloTexture = gradientTexture([[0, 'rgba(176, 130, 255, 0.7)'], [0.45, 'rgba(140, 90, 255, 0.24)'], [1, 'rgba(120, 70, 255, 0)']]);
  const sparkle = sparkleTexture();
  const shadowGeometry = new PlaneGeometry(SHADOW_SIZE_M, SHADOW_SIZE_M);
  shadowGeometry.rotateX(-Math.PI / 2);

  const entities: CoinEntity[] = [];
  const bursts: Burst[] = [];
  disposables.push(shadowTexture, haloTexture, riddleHaloTexture, sparkle, shadowGeometry, ...built.disposables, ...(riddleBuilt?.disposables ?? []));

  const addEntity = (riddle: boolean) => {
    const special = riddle && riddleBuilt !== null;
    const root = new Group();
    const spinner = (special ? riddleBuilt.model : template).clone();
    root.add(spinner);
    const halo = new Sprite(new SpriteMaterial({ map: special ? riddleHaloTexture : haloTexture, blending: AdditiveBlending, depthWrite: false, transparent: true }));
    const haloSize = suitcase ? HALO_SIZE_M * 1.5 : HALO_SIZE_M;
    halo.scale.set(haloSize, haloSize, 1);
    root.add(halo);
    const shadow = new Mesh(shadowGeometry, new MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, toneMapped: false }));
    scene.add(root, shadow);
    disposables.push(halo.material, shadow.material as Material);
    entities.push({ root, spinner, halo, shadow, size: special ? RIDDLE_SCALE : 1, collectedAt: null });
  };

  const addBurst = (at: Vector3, time: number, color: number) => {
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
    const material = new PointsMaterial({ map: sparkle, size: 0.07, transparent: true, depthWrite: false, blending: AdditiveBlending, color });
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
  const focalPixels = (height: number) => (activeCamera().projectionMatrix.elements[5] * height) / 2;

  const screenOf = (id: number, width: number, height: number): ScreenSpot | null => {
    const entity = entities[id];
    if (!entity || !entity.root.visible) return null;
    const view = activeCamera();
    const projected = entity.root.position.clone().project(view);
    if (projected.z < -1 || projected.z > 1) return null;
    const meters = entity.root.position.distanceTo(new Vector3().setFromMatrixPosition(view.matrixWorld));
    return {
      x: ((projected.x + 1) / 2) * width,
      y: ((1 - projected.y) / 2) * height,
      radius: (focalPixels(height) * targetRadius * entity.size) / Math.max(0.1, meters),
    };
  };

  return {
    renderer,
    camera,
    update(game, time, dt, floorY, reachable) {
      if (game) {
        while (entities.length < game.coins.length) addEntity(game.coins[entities.length].riddle);
        game.coins.forEach((coin, i) => {
          const entity = entities[i];
          const rest = suitcase ? floorY + SUITCASE_H / 2 + 0.01 : floorY + COIN_HEIGHT_M + Math.sin(time * 2 + coin.phase) * BOB_M;
          if (coin.collectedAt !== null && entity.collectedAt === null) {
            entity.collectedAt = time;
            addBurst(new Vector3(coin.x, rest, coin.z), time, coin.riddle ? RIDDLE_SPARK : GOLD_SPARK);
          }
          const age = entity.collectedAt === null ? -1 : time - entity.collectedAt;
          const gone = age >= vanishAfter;
          entity.root.visible = !gone;
          entity.shadow.visible = !gone;
          if (gone) return;
          const t = Math.max(0, age) / COLLECT_ANIM_S;
          const shrink = age < 0 ? 1 : (1 - t) * (1 + 0.6 * Math.sin(t * Math.PI));
          const rise = age < 0 ? 0 : 0.5 * (1 - (1 - t) ** 3);
          const ready = age < 0 && reachable.has(coin.id);
          const pulse = ready ? 1 + 0.12 * Math.sin(time * 7) : 1;
          entity.root.position.set(coin.x, rest + rise, coin.z);
          entity.root.scale.setScalar(Math.max(0.001, shrink * entity.size * (suitcase ? 1 : pulse)));
          entity.spinner.rotation.y = suitcase
            ? coin.phase + (age < 0 ? 0 : t * Math.PI * 2)
            : time * (age < 0 ? SPIN_RATE : SPIN_RATE * 7) + coin.phase;
          const haloMaterial = entity.halo.material as SpriteMaterial;
          haloMaterial.opacity = age >= 0 ? 1 - t : ready ? 0.75 + 0.25 * Math.sin(time * 7) : suitcase ? 0.45 : 1;
          entity.halo.scale.setScalar((suitcase ? HALO_SIZE_M * 1.5 : HALO_SIZE_M) * (ready ? 1.35 : 1));          entity.shadow.position.set(coin.x, floorY + 0.004, coin.z);
          const shadowScale = suitcase ? (age < 0 ? 1 : 1 - t) : (1 - Math.sin(time * 2 + coin.phase) * 0.12) * (age < 0 ? 1 : 1 - t);
          entity.shadow.rotation.y = suitcase ? coin.phase : 0;
          entity.shadow.scale.set(shadowScale * (suitcase ? 1.25 : 1), 1, shadowScale * (suitcase ? 0.6 : 1));
        });
      }
      updateBursts(time, dt);
    },
    render() {
      renderer.render(scene, camera);
    },
    focalPixels,
    screenOf,
    pick(x, y, width, height) {
      let best: number | null = null;
      let bestGap = Number.POSITIVE_INFINITY;
      entities.forEach((entity, id) => {
        if (entity.collectedAt !== null) return;
        const spot = screenOf(id, width, height);
        if (!spot) return;
        const gap = Math.hypot(spot.x - x, spot.y - y);
        if (gap <= Math.max(MIN_TAP_RADIUS_PX, spot.radius * TAP_SLACK) && gap < bestGap) {
          best = id;
          bestGap = gap;
        }
      });
      return best;
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
