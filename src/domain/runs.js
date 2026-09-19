export const DATA_SCHEMA_VERSION = 2;
export const MIN_QUALIFIED_DURATION_SECONDS = 10 * 60;

export function normalizeGoal(value) {
  return Math.min(5, Math.max(1, Number(value) || 3));
}

export function getDayTimestamp(dateLike) {
  const date = new Date(dateLike);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function getWeekStartTimestamp(dateLike = new Date()) {
  const date = new Date(dateLike);
  const day = date.getDay();
  date.setDate(date.getDate() - day + (day === 0 ? -6 : 1));
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function getWeekKey(dateLike = new Date()) {
  return String(getWeekStartTimestamp(dateLike));
}

export function isDemoRun(run) {
  return run?.isDemo === true;
}

export function isQualifiedRun(run) {
  return Boolean(
    run
    && !isDemoRun(run)
    && Number(run.duration) >= MIN_QUALIFIED_DURATION_SECONDS,
  );
}

export function getQualifiedRuns(runs) {
  return runs.filter(isQualifiedRun);
}

export function getUniqueRunDayCount(runs) {
  return new Set(runs.map(run => getDayTimestamp(run.date))).size;
}

export function getRunStatus(run) {
  if (isDemoRun(run)) {
    return {
      code: 'demo',
      label: 'Demo 演示',
      detail: '仅用于体验交互，不计入真实进度与成就',
    };
  }
  if (!isQualifiedRun(run)) {
    return {
      code: 'short',
      label: '短时记录',
      detail: `不足 ${MIN_QUALIFIED_DURATION_SECONDS / 60} 分钟，保留记录但不计入周计划`,
    };
  }
  return {
    code: 'qualified',
    label: '有效活动',
    detail: '计入周计划、累计数据与成就',
  };
}

export function backfillWeeklyGoals(runs, currentGoal, savedWeeklyGoals = {}) {
  const weeklyGoals = { ...savedWeeklyGoals };
  const fallbackGoal = normalizeGoal(currentGoal);

  [...runs]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach(run => {
      const key = getWeekKey(run.date);
      if (weeklyGoals[key] == null) {
        weeklyGoals[key] = normalizeGoal(run.goalAtRun ?? fallbackGoal);
      }
    });

  return weeklyGoals;
}

export function getWeekGoal(weeklyGoals, dateLike, currentGoal) {
  return normalizeGoal(weeklyGoals?.[getWeekKey(dateLike)] ?? currentGoal);
}

export function computePlanStreak(runs, currentGoal, weeklyGoals = {}) {
  const activeDaysByWeek = new Map();

  getQualifiedRuns(runs).forEach(run => {
    const weekKey = getWeekKey(run.date);
    if (!activeDaysByWeek.has(weekKey)) activeDaysByWeek.set(weekKey, new Set());
    activeDaysByWeek.get(weekKey).add(getDayTimestamp(run.date));
  });

  const weekMs = 7 * 86400000;
  let cursor = getWeekStartTimestamp();
  const hasMetGoal = weekTimestamp => {
    const weekKey = String(weekTimestamp);
    const goal = normalizeGoal(weeklyGoals[weekKey] ?? currentGoal);
    return (activeDaysByWeek.get(weekKey)?.size || 0) >= goal;
  };

  if (!hasMetGoal(cursor)) cursor -= weekMs;

  let streak = 0;
  while (hasMetGoal(cursor)) {
    streak += 1;
    cursor -= weekMs;
  }
  return streak;
}

export function computeUserStats(runs, currentGoal, weeklyGoals = {}) {
  const qualifiedRuns = getQualifiedRuns(runs);
  const totalDistance = qualifiedRuns.reduce((sum, run) => sum + Number(run.distance || 0), 0);
  const totalRuns = qualifiedRuns.length;
  const totalDuration = qualifiedRuns.reduce((sum, run) => sum + Number(run.duration || 0), 0);
  const validPaces = qualifiedRuns
    .map(run => Number(run.pace))
    .filter(pace => Number.isFinite(pace) && pace > 0);
  const bestPace = validPaces.length > 0 ? Math.min(...validPaces) : null;
  const planStreak = computePlanStreak(runs, currentGoal, weeklyGoals);

  return { totalDistance, totalRuns, totalDuration, planStreak, bestPace };
}

export const BADGE_DEFS = [
  { id: 'first_run', name: '第一次出发', icon: '👟', desc: '完成第一次有效跑走', req: user => user.totalRuns >= 1 },
  { id: 'ten_minutes', name: '十分钟也算数', icon: '⏱️', desc: '完成一次至少 10 分钟的跑走', req: user => user.totalRuns >= 1 },
  { id: 'plan_week_1', name: '第一周达成', icon: '🌱', desc: '完成一周计划', req: user => user.planStreak >= 1 },
  { id: 'plan_week_2', name: '稳稳两周', icon: '🔥', desc: '连续 2 周完成计划', req: user => user.planStreak >= 2 },
  { id: 'plan_week_4', name: '月度节奏', icon: '💎', desc: '连续 4 周完成计划', req: user => user.planStreak >= 4 },
  { id: 'distance_5', name: '五公里积累', icon: '🏃', desc: '有效活动累计 5 公里', req: user => user.totalDistance >= 5 },
  { id: 'distance_20', name: '二十公里积累', icon: '🎯', desc: '有效活动累计 20 公里', req: user => user.totalDistance >= 20 },
  { id: 'distance_50', name: '五十公里积累', icon: '🗺️', desc: '有效活动累计 50 公里', req: user => user.totalDistance >= 50 },
  { id: 'runs_5', name: '第五次出发', icon: '⭐', desc: '完成 5 次有效跑走', req: user => user.totalRuns >= 5 },
  { id: 'runs_10', name: '十次入门', icon: '🏅', desc: '完成 10 次有效跑走', req: user => user.totalRuns >= 10 },
];

export function computeBadges(user) {
  return BADGE_DEFS.filter(badge => badge.req(user)).map(badge => badge.id);
}
