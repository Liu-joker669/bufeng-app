import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../app-context.js';
import {
  BADGE_DEFS,
  getQualifiedRuns,
  getUniqueRunDayCount,
  isDemoRun,
  isQualifiedRun,
} from '../domain/runs.js';
import { formatDuration, formatDistance, formatPace, getWeekRuns } from '../utils/format.js';

export default function Profile() {
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const { user, runs, goal, badges } = state;
  const [showReset, setShowReset] = useState(false);

  const qualifiedRuns = getQualifiedRuns(runs);
  const demoCount = runs.filter(isDemoRun).length;
  const shortCount = runs.filter(run => !isDemoRun(run) && !isQualifiedRun(run)).length;
  const joinedAt = new Date(user.joinedDate || Date.now()).getTime();
  const activeWeeks = Math.max(1, (Date.now() - joinedAt) / (7 * 86400000));
  const avgPerWeek = (qualifiedRuns.length / activeWeeks).toFixed(1);
  const bestRun = qualifiedRuns.length > 0
    ? [...qualifiedRuns].sort((a, b) => b.distance - a.distance)[0]
    : null;

  const qualifiedWeekRuns = getWeekRuns(runs).filter(isQualifiedRun);
  const weekRunDays = getUniqueRunDayCount(qualifiedWeekRuns);
  const goalOptions = [1, 2, 3, 4, 5];

  function resetData() {
    dispatch({ type: 'RESET_DATA' });
    setShowReset(false);
  }

  return (
    <div className="page-enter" style={{ padding: '20px 16px' }}>
      <section style={{
        background: 'linear-gradient(135deg, #1c1917 0%, #44403c 100%)',
        borderRadius: 20, padding: '24px 20px', color: 'white', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 32,
          background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
        }}>🏃</div>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>正在建立跑走习惯</h2>
          <p style={{ fontSize: 14, opacity: 0.78, marginTop: 4 }}>
            {user.planStreak > 0 ? `连续 ${user.planStreak} 周达成计划` : '正在建立可持续的运动节奏'}
          </p>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <ProfileStat icon="🏃" label="有效活动" value={`${user.totalRuns} 次`} />
        <ProfileStat icon="📍" label="有效里程" value={formatDistance(user.totalDistance)} />
        <ProfileStat icon="⏱" label="有效时长" value={formatDuration(user.totalDuration)} />
        <ProfileStat icon="⚡" label="最佳配速" value={user.bestPace ? formatPace(user.bestPace) : '--'} />
        <ProfileStat icon="🔥" label="计划连续达成" value={`${user.planStreak} 周`} />
        <ProfileStat icon="🏆" label="获得徽章" value={`${badges.length} 个`} />
      </div>

      <section style={{
        background: 'var(--color-surface)', borderRadius: 20,
        border: '1px solid var(--color-border)', padding: 20, marginBottom: 20,
      }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>🎯 每周跑走目标</h3>
        <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
          修改目标只更新本周及未来计划，不会改写过去周的达成标准。
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {goalOptions.map(option => (
            <button
              key={option}
              type="button"
              aria-label={`每周 ${option} 天`}
              aria-pressed={goal === option}
              onClick={() => dispatch({ type: 'SET_GOAL', payload: option })}
              style={{
                width: 44, height: 44, borderRadius: 22,
                border: goal === option ? '2px solid var(--color-run)' : '1px solid var(--color-border)',
                background: goal === option ? 'var(--color-run)' : 'var(--color-surface)',
                color: goal === option ? 'white' : 'var(--color-text)',
                fontSize: 16, fontWeight: 700, cursor: 'pointer',
              }}
            >
              {option}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--color-text-secondary)', marginTop: 12 }}>
          本周已完成 {weekRunDays}/{goal} 天。同日多次有效活动只计 1 天，跑步日之间建议安排恢复。
        </p>
      </section>

      <section style={{
        background: '#f5f3ff', borderRadius: 20,
        border: '1px solid #ddd6fe', padding: 20, marginBottom: 20,
      }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: '#6d28d9', marginBottom: 12 }}>🧾 数据口径透明</h3>
        <StatRow label="全部保存记录" value={`${runs.length} 条`} />
        <StatRow label="计入进度的有效活动" value={`${qualifiedRuns.length} 条`} />
        <StatRow label="不计入进度的 Demo" value={`${demoCount} 条`} />
        <StatRow label="不足 10 分钟的短时记录" value={`${shortCount} 条`} />
      </section>

      {bestRun ? (
        <button
          type="button"
          onClick={() => navigate(`/run/${bestRun.id}`)}
          style={{
            width: '100%', background: 'var(--color-surface)', borderRadius: 20,
            border: '1px solid var(--color-border)', padding: 20, marginBottom: 20,
            cursor: 'pointer', textAlign: 'left', color: 'inherit',
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 12 }}>🏅 最长有效活动</h3>
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            <ProfileValue label="距离" value={formatDistance(bestRun.distance)} highlight />
            <ProfileValue label="时长" value={formatDuration(bestRun.duration)} />
            <ProfileValue label="日期" value={formatDateShort(bestRun.date)} />
          </div>
        </button>
      ) : null}

      {qualifiedRuns.length > 0 ? (
        <section style={{
          background: 'var(--color-surface)', borderRadius: 20,
          border: '1px solid var(--color-border)', padding: 20, marginBottom: 20,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 16 }}>📊 有效活动概览</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <StatRow label="有效活动次数" value={`${user.totalRuns} 次`} />
            <StatRow label="周均有效活动" value={`${avgPerWeek} 次`} />
            <StatRow label="平均距离" value={formatDistance(user.totalDistance / user.totalRuns)} />
            <StatRow label="获得徽章" value={`${badges.length} / ${BADGE_DEFS.length}`} />
            <StatRow label="计划连续达成" value={`${user.planStreak} 周`} />
          </div>
        </section>
      ) : null}

      <div style={{ textAlign: 'center', paddingBottom: 20 }}>
        {!showReset ? (
          <button type="button" onClick={() => setShowReset(true)} style={secondaryButtonStyle}>重置本机数据</button>
        ) : (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14,
            padding: 14, color: '#991b1b',
          }}>
            <p style={{ fontSize: 13, marginBottom: 12 }}>重置会删除本机保存的全部真实记录与 Demo 记录。</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
              <button type="button" onClick={() => setShowReset(false)} style={secondaryButtonStyle}>取消</button>
              <button type="button" onClick={resetData} style={{ ...secondaryButtonStyle, background: '#ef4444', color: 'white', borderColor: '#ef4444' }}>确认重置</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const secondaryButtonStyle = {
  background: 'transparent', border: '1px solid var(--color-border)',
  color: 'var(--color-text-secondary)', fontSize: 13,
  padding: '8px 20px', borderRadius: 20, cursor: 'pointer',
};

function ProfileStat({ icon, label, value }) {
  return (
    <div style={{
      background: 'var(--color-surface)', borderRadius: 16, padding: 14,
      border: '1px solid var(--color-border)', textAlign: 'center',
    }}>
      <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>{value}</div>
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 3 }}>{label}</div>
    </div>
  );
}

function ProfileValue({ label, value, highlight = false }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: highlight ? 'var(--color-run)' : 'var(--color-text)' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{label}</div>
    </div>
  );
}

function StatRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
      <span style={{ fontSize: 15, color: 'var(--color-text-secondary)' }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>{value}</span>
    </div>
  );
}

function formatDateShort(dateStr) {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
