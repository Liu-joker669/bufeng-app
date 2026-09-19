import { useState } from 'react';
import { useApp } from '../app-context.js';
import {
  getDayTimestamp,
  getUniqueRunDayCount,
  getWeekGoal,
  isDemoRun,
  isQualifiedRun,
} from '../domain/runs.js';
import { formatDistance } from '../utils/format.js';

const DAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

function buildRunMap(runs) {
  const runMap = new Map();
  runs.forEach(run => {
    const key = getDayTimestamp(run.date);
    const current = runMap.get(key) || { qualified: [], demo: [], short: [] };
    if (isDemoRun(run)) current.demo.push(run);
    else if (isQualifiedRun(run)) current.qualified.push(run);
    else current.short.push(run);
    runMap.set(key, current);
  });
  return runMap;
}

export default function Calendar() {
  const { state } = useApp();
  const { runs, goal, weeklyGoals } = state;
  const today = new Date();
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const runMap = buildRunMap(runs);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, index) => {
    const dayNum = index - firstDay + 1;
    const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth;
    const date = new Date(year, month, dayNum);
    date.setHours(0, 0, 0, 0);
    return {
      dayNum,
      displayDay: date.getDate(),
      isCurrentMonth,
      date,
      runData: runMap.get(date.getTime()),
      isToday: date.toDateString() === today.toDateString(),
    };
  });

  const weeks = [];
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7));

  const monthRuns = runs.filter(run => {
    const date = new Date(run.date);
    return date.getMonth() === month && date.getFullYear() === year;
  });
  const qualifiedMonthRuns = monthRuns.filter(isQualifiedRun);
  const monthDistance = qualifiedMonthRuns.reduce((sum, run) => sum + run.distance, 0);
  const runDays = getUniqueRunDayCount(qualifiedMonthRuns);

  return (
    <div className="page-enter" style={{ padding: '20px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button type="button" aria-label="上个月" onClick={() => setViewDate(new Date(year, month - 1, 1))} style={navButtonStyle}>‹</button>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>{year} 年 {month + 1} 月</h2>
        <button type="button" aria-label="下个月" onClick={() => setViewDate(new Date(year, month + 1, 1))} style={navButtonStyle}>›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        <SummaryCard label="有效活动" value={`${qualifiedMonthRuns.length}次`} icon="🏃" />
        <SummaryCard label="完成天数" value={`${runDays}天`} icon="📅" />
        <SummaryCard label="有效里程" value={formatDistance(monthDistance)} icon="📍" />
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10,
        marginBottom: 16, fontSize: 13, color: 'var(--color-text-secondary)',
      }}>
        <Legend color="#dcfce7" label="有效活动" />
        <Legend color="#fef3c7" label="短时记录" />
        <Legend color="#ede9fe" label="Demo" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8, textAlign: 'center' }}>
        {DAY_NAMES.map(name => (
          <div key={name} style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)', padding: '4px 0' }}>{name}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map(cell => {
          const qualifiedCount = cell.runData?.qualified.length || 0;
          const hasDemo = (cell.runData?.demo.length || 0) > 0;
          const hasShort = (cell.runData?.short.length || 0) > 0;
          const background = qualifiedCount > 0
            ? '#dcfce7'
            : hasShort ? '#fef3c7' : hasDemo ? '#ede9fe' : 'var(--color-surface)';
          const titleParts = [];
          if (qualifiedCount) titleParts.push(`${qualifiedCount} 次有效活动`);
          if (hasShort) titleParts.push(`${cell.runData.short.length} 条短时记录`);
          if (hasDemo) titleParts.push(`${cell.runData.demo.length} 条 Demo`);

          return (
            <div
              key={cell.date.toISOString()}
              title={titleParts.join('；')}
              style={{
                aspectRatio: '1', borderRadius: 12, display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 15,
                fontWeight: cell.isToday ? 700 : 500,
                color: cell.isCurrentMonth ? 'var(--color-text)' : 'var(--color-border)',
                position: 'relative', background,
                border: cell.isToday ? '2px solid var(--color-run)' : '1px solid var(--color-border)',
              }}
            >
              {cell.displayDay}
              {qualifiedCount > 0 ? (
                <span style={{ position: 'absolute', bottom: 2, fontSize: 9, color: 'var(--color-success)' }}>✓</span>
              ) : null}
            </div>
          );
        })}
      </div>

      <section style={{
        marginTop: 24, background: 'var(--color-surface)', borderRadius: 20,
        border: '1px solid var(--color-border)', padding: 20,
      }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>📊 每周计划日</h3>
        <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
          同日多次只计 1 天；短时记录和 Demo 不进入计划。
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {weeks.map((week, weekIndex) => {
            const weekGoal = getWeekGoal(weeklyGoals, week[0].date, goal);
            const weekDays = week.filter(cell => (cell.runData?.qualified.length || 0) > 0).length;
            const weekDistance = week.reduce((sum, cell) => (
              sum + (cell.runData?.qualified || []).reduce((distance, run) => distance + run.distance, 0)
            ), 0);
            const achieved = weekDays >= weekGoal;
            return (
              <div key={week[0].date.toISOString()} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', minWidth: 48 }}>第 {weekIndex + 1} 周</span>
                <div style={{
                  flex: 1, background: '#f5f5f4', borderRadius: 6, minHeight: 26,
                  overflow: 'hidden', position: 'relative',
                }}>
                  <div style={{
                    width: `${Math.min(100, (weekDays / weekGoal) * 100)}%`, minWidth: weekDays > 0 ? 74 : 0,
                    minHeight: 26, background: achieved ? 'var(--color-success)' : 'var(--color-primary)', borderRadius: 6,
                  }} />
                  <span style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: 8,
                    fontSize: 12, fontWeight: 600, color: achieved ? 'white' : 'var(--color-text-secondary)',
                    whiteSpace: 'nowrap',
                  }}>
                    {weekDays}/{weekGoal} 天{weekDays > 0 ? ` · ${formatDistance(weekDistance)}` : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

const navButtonStyle = {
  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
  width: 44, height: 44, borderRadius: 22, fontSize: 24, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

function Legend({ color, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 14, height: 14, borderRadius: 4, background: color, border: '1px solid var(--color-border)' }} />
      {label}
    </span>
  );
}

function SummaryCard({ label, value, icon }) {
  return (
    <div style={{
      background: 'var(--color-surface)', borderRadius: 16, padding: 14,
      border: '1px solid var(--color-border)', textAlign: 'center',
    }}>
      <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>{value}</div>
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 3 }}>{label}</div>
    </div>
  );
}
