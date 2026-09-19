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
  getGpsErrorMessage,
  haversineKm,
  isUsableGpsPoint,
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
  assert.equal(isUsableGpsPoint({ lat: 30, lng: 120, accuracy: 120 }), false);
  assert.equal(isUsableGpsPoint({ lat: 30, lng: 120 }), false);
});

test('GPS route waits for roughly five metres of movement', () => {
  const start = { lat: 30, lng: 120 };
  const near = { lat: 30.00001, lng: 120 };
  const far = { lat: 30.00006, lng: 120 };

  assert.ok(haversineKm(start, near) < 0.005);
  assert.ok(haversineKm(start, far) > 0.005);
  assert.equal(shouldAppendRoutePoint(start, near), false);
  assert.equal(shouldAppendRoutePoint(start, far), true);
});

test('GPS errors give users an actionable recovery path', () => {
  assert.match(getGpsErrorMessage({ code: 1 }), /允许定位/);
  assert.match(getGpsErrorMessage({ code: 2 }), /定位服务/);
  assert.match(getGpsErrorMessage({ code: 3 }), /超时/);
});
