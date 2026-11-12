import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EYE_HEIGHT_M,
  cameraFromQuat,
  easeQuat,
  edgeMarker,
  floorForward,
  focalForViewport,
  pitchOf,
  projectToScreen,
  quatFromDeviceOrientation,
  quatFromYawPitch,
  radarDot,
  yawOf,
} from './arCamera';

const near = (actual: number, expected: number, tolerance = 1e-6) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} is not close to ${expected}`);

test('an upright phone looks at the horizon and a phone lying face up looks at the floor', () => {
  const upright = cameraFromQuat(quatFromDeviceOrientation(0, 90, 0));
  near(upright.forward.x, 0);
  near(upright.forward.y, 0);
  near(upright.forward.z, -1);
  near(upright.up.y, 1);

  const flat = cameraFromQuat(quatFromDeviceOrientation(0, 0, 0));
  near(flat.forward.y, -1);
  near(pitchOf(flat), -90);
});

test('tilting the phone down and turning it are read back as pitch and yaw', () => {
  const camera = cameraFromQuat(quatFromYawPitch(30, -40));
  near(pitchOf(camera), -40);
  near(yawOf(camera), 30);
});

test('looking straight down still knows which way is forward, from the top of the screen', () => {
  const camera = cameraFromQuat(quatFromYawPitch(0, -90));
  const forward = floorForward(camera);
  near(forward.x, 0);
  near(forward.z, -1);
});

test('a point straight ahead lands in the middle of the screen and shrinks with distance', () => {
  const camera = cameraFromQuat(quatFromYawPitch(0, 0));
  const viewport = { width: 400, height: 800, focal: 700 };
  const close = projectToScreen({ x: 0, y: EYE_HEIGHT_M, z: -2 }, camera, viewport);
  const far = projectToScreen({ x: 0, y: EYE_HEIGHT_M, z: -4 }, camera, viewport);
  assert.ok(close && far);
  near(close.x, 200);
  near(close.y, 400);
  near(close.pixelsPerMeter, 350);
  near(far.pixelsPerMeter, 175);
});

test('the floor sits below the middle of the screen and nothing behind the camera is drawn', () => {
  const camera = cameraFromQuat(quatFromYawPitch(0, 0));
  const viewport = { width: 400, height: 800, focal: 700 };
  const floor = projectToScreen({ x: 0, y: 0, z: -2 }, camera, viewport);
  assert.ok(floor && floor.y > 400);
  assert.equal(projectToScreen({ x: 0, y: 0, z: 2 }, camera, viewport), null);
});

test('the focal length follows the camera picture the way object-fit cover crops it', () => {
  const portraitVideo = focalForViewport(390, 844, 720, 960);
  const noVideo = focalForViewport(390, 844);
  assert.ok(portraitVideo > 600 && portraitVideo < 720);
  assert.ok(noVideo > 600 && noVideo < 720);
});

test('easing between two orientations never takes the long way round', () => {
  const from = quatFromYawPitch(10, -40);
  const to = quatFromYawPitch(20, -40);
  const flipped = { x: -to.x, y: -to.y, z: -to.z, w: -to.w };
  const eased = cameraFromQuat(easeQuat(from, flipped, 0.5));
  near(yawOf(eased), 15, 0.5);
});

test('a coin in view needs no arrow, a coin behind gets one at the edge pointing the way to turn', () => {
  const camera = cameraFromQuat(quatFromYawPitch(0, 0), { x: 0, y: 1.4, z: 0 });
  const viewport = { width: 400, height: 800, focal: 650 };
  assert.equal(edgeMarker({ x: 0, y: 1, z: -3 }, camera, viewport, 40).onScreen, true);
  assert.equal(edgeMarker({ x: 0.85, y: 1.4, z: -3 }, camera, viewport, 40).onScreen, true);
  const behindRight = edgeMarker({ x: 2, y: 1.4, z: 3 }, camera, viewport, 40);
  assert.equal(behindRight.onScreen, false);
  near(behindRight.x, 360);
  assert.ok(Math.abs(behindRight.angle) < 0.01);
  const farLeft = edgeMarker({ x: -6, y: 1.4, z: -1 }, camera, viewport, 40);
  near(farLeft.x, 40);
  assert.ok(Math.abs(Math.abs(farLeft.angle) - Math.PI) < 0.01);
});

test('the radar puts what is ahead at the top and turns with the phone', () => {
  const facingNorth = cameraFromQuat(quatFromYawPitch(0, -10));
  const ahead = radarDot({ x: 0, z: -2 }, { x: 0, z: 0 }, facingNorth, 4);
  near(ahead.x, 0);
  near(ahead.y, -0.5);
  const facingLeft = cameraFromQuat(quatFromYawPitch(90, -10));
  const sameCoin = radarDot({ x: 0, z: -2 }, { x: 0, z: 0 }, facingLeft, 4);
  near(sameCoin.x, 0.5);
  near(sameCoin.y, 0, 1e-6);
  const outside = radarDot({ x: 0, z: -20 }, { x: 0, z: 0 }, facingNorth, 4);
  assert.equal(outside.inRange, false);
  near(Math.hypot(outside.x, outside.y), 1);
});
