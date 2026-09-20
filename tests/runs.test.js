import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computePlanStreak,
  computeUserStats,
  getRunStatus,
  getWeekKey,
  getWeekStartTimestamp,
  isQualifiedRun,
} from '../src/domain/runs.js';
import { formatPace } from '../src/utils/format.js';
import { buildDemoRoute, getDemoFrame } from '../src/domain/demo.js';
import {
  getGpsPointDecision,
  getGpsStepThresholdMeters,
  getGpsErrorMessage,
  haversineKm,
  isUsableGpsPoint,
  projectGpsRoute,
  shouldAppendRoutePoint,
} from '../src/domain/gps.js';

const dayMs = 86400000;

function makeRun({ weekOffset = 0, dayOffset = 0, duration = 600, distance = 1, isDemo = false, id = 'run' } = {}) {
  const currentMonday = getWeekStartTimestamp();
  return {
    id: `${id}-${weekOffset}-${dayOffset}`,
    date: new Date(currentMonday + weekOffset * 7 * dayMs + dayOffset * dayMs + 12 * 3600000).toISOString(),
    duration,
    distance,
    pace: distance > 0 ? Math.round(duration / distance) : null,
    isDemo,
  };
}

test('only real runs of at least ten minutes are qualified', () => {
  const qualified = makeRun();
  const short = makeRun({ duration: 599, id: 'short' });
  const demo = makeRun({ isDemo: true, id: 'demo' });

  assert.equal(isQualifiedRun(qualified), true);
  assert.equal(isQualifiedRun(short), false);
  assert.equal(isQualifiedRun(demo), false);
  assert.equal(getRunStatus(short).code, 'short');
  assert.equal(getRunStatus(demo).code, 'demo');
});

test('lifetime stats exclude demo and short records', () => {
  const runs = [
    makeRun({ duration: 720, distance: 2 }),
    makeRun({ duration: 300, distance: 1, id: 'short' }),
    makeRun({ duration: 900, distance: 3, isDemo: true, id: 'demo' }),
  ];
  const stats = computeUserStats(runs, 3, {});

  assert.equal(stats.totalRuns, 1);
  assert.equal(stats.totalDuration, 720);
  assert.equal(stats.totalDistance, 2);
  assert.equal(stats.bestPace, 360);
});

test('same-day records count as one plan day', () => {
  const runs = [
    makeRun({ dayOffset: 0, id: 'morning' }),
    makeRun({ dayOffset: 0, id: 'evening' }),
    makeRun({ dayOffset: 1, id: 'next-day' }),
  ];
  const weeklyGoals = { [getWeekKey()]: 2 };

  assert.equal(computePlanStreak(runs, 2, weeklyGoals), 1);
});

test('weekly goal snapshots preserve historical targets', () => {
  const runs = [
    makeRun({ weekOffset: -1, dayOffset: 0, id: 'previous-a' }),
    makeRun({ weekOffset: -1, dayOffset: 1, id: 'previous-b' }),
    makeRun({ dayOffset: 0, id: 'current-a' }),
    makeRun({ dayOffset: 1, id: 'current-b' }),
    makeRun({ dayOffset: 2, id: 'current-c' }),
  ];
  const weeklyGoals = {
    [getWeekKey(runs[0].date)]: 2,
    [getWeekKey()]: 3,
  };

  assert.equal(computePlanStreak(runs, 5, weeklyGoals), 2);
});

test('pace formatting uses seconds per kilometre', () => {
  assert.equal(formatPace(360), '6\'00"');
  assert.equal(formatPace(null), '--\'--"');
});

test('demo frames keep time, distance, pace and route progress synchronized', () => {
  const first = getDemoFrame(10, 301);
  const middle = getDemoFrame(10.5, 301);
  const second = getDemoFrame(11, 301);

  assert.deepEqual(first, {
    elapsed: 20,
    distance: 20 / 450,
    pace: 450,
    routeIndex: 10,
  });
  assert.equal(middle.elapsed, 21);
  assert.equal(second.elapsed - first.elapsed, 2);
  assert.ok(Math.abs((second.distance - first.distance) - (2 / 450)) < 1e-12);
  assert.equal(second.pace, first.pace);
  assert.ok(second.routeIndex >= first.routeIndex);
});

test('demo route carries fixed map-road coordinates and closes the road loop', () => {
  const route = buildDemoRoute();
  const start = route[0];
  const end = route[route.length - 1];

  assert.equal(route.length, 301);
  assert.ok(route.every(point => Number.isFinite(point.mapX) && Number.isFinite(point.mapY)));
  assert.equal(start.mapX, 120);
  assert.equal(start.mapY, 74);
  assert.ok(Math.abs(end.mapX - start.mapX) < 1e-9);
  assert.ok(Math.abs(end.mapY - start.mapY) < 1e-9);
});

test('GPS points require usable accuracy before entering the route', () => {
  assert.equal(isUsableGpsPoint({ lat: 30, lng: 120, accuracy: 20 }), true);
  assert.equal(isUsableGpsPoint({ lat: 30, lng: 120, accuracy: 40 }), true);
  assert.equal(isUsableGpsPoint({ lat: 30, lng: 120, accuracy: 41 }), false);
  assert.equal(isUsableGpsPoint({ lat: 30, lng: 120, accuracy: 120 }), false);
  assert.equal(isUsableGpsPoint({ lat: 30, lng: 120 }), false);
});

test('GPS route uses an accuracy-aware movement threshold', () => {
  const start = { lat: 30, lng: 120 };
  const near = { lat: 30.00001, lng: 120 };
  const far = { lat: 30.00010, lng: 120 };

  assert.ok(haversineKm(start, near) < 0.008);
  assert.ok(haversineKm(start, far) > 0.008);
  assert.equal(shouldAppendRoutePoint(start, near), false);
  assert.equal(shouldAppendRoutePoint(start, far), true);

  const uncertainStart = { ...start, accuracy: 30 };
  const uncertainNear = { lat: 30.00018, lng: 120, accuracy: 30 };
  const uncertainFar = { lat: 30.00030, lng: 120, accuracy: 30 };
  assert.equal(getGpsStepThresholdMeters(uncertainStart, uncertainNear), 22.5);
  assert.equal(shouldAppendRoutePoint(uncertainStart, uncertainNear), false);
  assert.equal(shouldAppendRoutePoint(uncertainStart, uncertainFar), true);
});

test('GPS route rejects implausible one-second jumps', () => {
  const start = { lat: 30, lng: 120, accuracy: 10, timestamp: 1000 };
  const jump = { lat: 30.001, lng: 120, accuracy: 10, timestamp: 2000 };
  const decision = getGpsPointDecision(start, jump);

  assert.equal(decision.accepted, false);
  assert.equal(decision.reason, 'implausible-speed');
});

test('GPS projection keeps metres proportional and does not stretch a 90 metre route', () => {
  const latitude = 30;
  const start = { lat: latitude, lng: 120 };
  const east90 = {
    lat: latitude,
    lng: 120 + 90 / (111320 * Math.cos(latitude * Math.PI / 180)),
  };
  const north90 = { lat: latitude + 90 / 111320, lng: 120 };
  const projected = projectGpsRoute([start, east90, north90]);
  const eastPixels = Math.abs(projected.points[1].x - projected.points[0].x);
  const northPixels = Math.abs(projected.points[2].y - projected.points[0].y);

  assert.ok(eastPixels > 100 && eastPixels < 120);
  assert.ok(Math.abs(eastPixels - northPixels) < 1);
  assert.equal(projected.scaleDistanceMeters, 50);
  assert.ok(projected.scaleWidthPixels >= 50 && projected.scaleWidthPixels <= 70);
});

test('GPS errors give users an actionable recovery path', () => {
  assert.match(getGpsErrorMessage({ code: 1 }), /系统浏览器/);
  assert.match(getGpsErrorMessage({ code: 2 }), /定位服务/);
  assert.match(getGpsErrorMessage({ code: 3 }), /超时/);
});
