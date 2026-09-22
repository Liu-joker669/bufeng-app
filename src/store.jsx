import { useEffect, useReducer } from 'react';
import { AppContext } from './app-context.js';
import {
  BADGE_DEFS,
  DATA_SCHEMA_VERSION,
  backfillWeeklyGoals,
  computeBadges,
  computeUserStats,
  getWeekKey,
  normalizeGoal,
} from './domain/runs.js';

const LS_KEY = 'bupin_data';
const LEGACY_LS_KEY = 'bufeng_data';

function createInitialState() {
  return {
    schemaVersion: DATA_SCHEMA_VERSION,
    runs: [],
    goal: 3,
    weeklyGoals: {},
    currentRun: null,
    badges: [],
    user: {
      totalDistance: 0,
      totalRuns: 0,
      totalDuration: 0,
      planStreak: 0,
      bestPace: null,
      joinedDate: new Date().toISOString(),
    },
  };
}

function sanitizeBadges(savedBadges, user) {
  const validIds = new Set(BADGE_DEFS.map(badge => badge.id));
  const existing = Array.isArray(savedBadges)
    ? savedBadges.filter(id => validIds.has(id))
    : [];
  return [...new Set([...existing, ...computeBadges(user)])];
}

function loadState() {
  const initialState = createInitialState();
  try {
    const raw = localStorage.getItem(LS_KEY) ?? localStorage.getItem(LEGACY_LS_KEY);
    if (!raw) return initialState;

    const saved = JSON.parse(raw);
    const runs = Array.isArray(saved.runs) ? saved.runs : [];
    const goal = normalizeGoal(saved.goal);
    const weeklyGoals = backfillWeeklyGoals(runs, goal, saved.weeklyGoals);
    const stats = computeUserStats(runs, goal, weeklyGoals);
    const user = {
      ...initialState.user,
      ...saved.user,
      ...stats,
    };

    return {
      ...initialState,
      ...saved,
      schemaVersion: DATA_SCHEMA_VERSION,
      runs,
      goal,
      weeklyGoals,
      currentRun: null,
      user,
      badges: sanitizeBadges(saved.badges, user),
    };
  } catch {
    return initialState;
  }
}

function saveState(state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      schemaVersion: DATA_SCHEMA_VERSION,
      runs: state.runs,
      goal: state.goal,
      weeklyGoals: state.weeklyGoals,
      badges: state.badges,
      user: state.user,
    }));
  } catch {
    // The Demo remains usable when browser storage is unavailable.
  }
}

function withDerivedState(state, runs, goal, weeklyGoals) {
  const user = {
    ...state.user,
    ...computeUserStats(runs, goal, weeklyGoals),
  };
  const badges = sanitizeBadges(state.badges, user);
  return { ...state, runs, goal, weeklyGoals, user, badges };
}

function reducer(state, action) {
  switch (action.type) {
    case 'SAVE_RUN': {
      const run = {
        ...action.payload,
        goalAtRun: state.goal,
      };
      const runs = [...state.runs, run];
      const weekKey = getWeekKey(run.date);
      const weeklyGoals = {
        ...state.weeklyGoals,
        [weekKey]: state.weeklyGoals[weekKey] ?? state.goal,
      };
      return withDerivedState(state, runs, state.goal, weeklyGoals);
    }
    case 'SET_GOAL': {
      const goal = normalizeGoal(action.payload);
      const weeklyGoals = {
        ...state.weeklyGoals,
        [getWeekKey()]: goal,
      };
      return withDerivedState(state, state.runs, goal, weeklyGoals);
    }
    case 'START_RUN':
      return { ...state, currentRun: action.payload };
    case 'UPDATE_RUN':
      return { ...state, currentRun: { ...state.currentRun, ...action.payload } };
    case 'PAUSE_RUN':
      return { ...state, currentRun: { ...state.currentRun, paused: true } };
    case 'RESUME_RUN':
      return { ...state, currentRun: { ...state.currentRun, paused: false } };
    case 'END_RUN':
      return { ...state, currentRun: null };
    case 'RESET_DATA': {
      const freshState = createInitialState();
      saveState(freshState);
      return freshState;
    }
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}
