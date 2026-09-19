import { useNavigate } from 'react-router-dom';
import { useApp } from '../app-context.js';
import { BADGE_DEFS, getRunStatus, getUniqueRunDayCount, isQualifiedRun } from '../domain/runs.js';
import { formatDuration, formatDistance, formatPace, getWeekRuns, getTodayRuns, getWeekStart } from '../utils/format.js';
import AiCoach from '../components/AiCoach.jsx';

export default function Home() {
  const { state } = useApp();
  const { runs, user, goal, badges } = state;
  const navigate = useNavigate();

  const todayRuns = getTodayRuns(runs);
  const weekRuns = getWeekRuns(runs);
  const qualifiedWeekRuns = weekRuns.filter(isQualifiedRun);
  const weekRunDays = getUniqueRunDayCount(qualifiedWeekRuns);
  const weekTotal = qualifiedWeekRuns.reduce((sum, run) => sum + run.distance, 0);
  const progress = Math.min(100, Math.round((weekRunDays / goal) * 100));

  const recentRuns = [...runs].reverse().slice(0, 5);

  // Day labels
  const weekStart = getWeekStart();
  const dayLabels = ['一', '二', '三', '四', '五', '六', '日'];
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const runDateSet = new Set(runs.filter(isQualifiedRun).map(r => {
    const d = new Date(r.date);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }));

  const unlockedBadges = badges.length;
  const nextBadge = BADGE_DEFS.find(b => !badges.includes(b.id));

  return (
    <div className="page-enter" style={{ padding: '20px 16px' }}>
      {/* Greeting */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
          {new Date().getHours() < 12 ? '☀️ 早上好' : new Date().getHours() < 18 ? '🌤 下午好' : '🌙 晚上好'}
        </h2>
        {user.totalRuns > 0 ? (
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 5, fontSize: 15 }}>
            {user.planStreak > 0 ? `已连续 ${user.planStreak} 周完成计划` : '正在建立本周节奏'} · {user.totalRuns === 1 ? '今天是第一步！' : `累计 ${formatDistance(user.totalDistance)}`}
          </p>
        ) : (
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 5, fontSize: 15 }}>
            不追速度，先从一次轻松跑走开始
          </p>
        )}
      </div>

      {/* Rule-based plan helper. It validates the interaction, not LLM quality. */}
      <AiCoach />

      {/* Weekly Progress Card */}
      <div style={{
        background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
        borderRadius: 20,
        padding: '20px 20px',
        color: 'white',
        marginBottom: 20,
        cursor: 'pointer',
      }}
        onClick={() => navigate('/calendar')}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') navigate('/calendar');
        }}
        role="button"
        tabIndex={0}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 14, opacity: 0.9, margin: 0 }}>本周目标</p>
            <p style={{ fontSize: 28, fontWeight: 800, margin: '4px 0 0' }}>
              {weekRunDays}<span style={{ fontSize: 16, fontWeight: 500, opacity: 0.8 }}>/{goal} 天</span>
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 14, opacity: 0.9, margin: 0 }}>本周距离</p>
            <p style={{ fontSize: 20, fontWeight: 700, margin: '4px 0 0' }}>{formatDistance(weekTotal)}</p>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ background: 'rgba(255,255,255,0.3)', borderRadius: 8, height: 8, overflow: 'hidden' }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: 'white',
            borderRadius: 8,
            transition: 'width 0.5s ease',
          }} />
        </div>
        {/* Week day dots */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
          {weekDays.map((d, i) => {
            const hasRun = runDateSet.has(d.getTime());
            const isToday = new Date().toDateString() === d.toDateString();
            return (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 16,
                  background: hasRun ? 'white' : 'rgba(255,255,255,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 4px',
                  border: isToday ? '2px solid white' : '2px solid transparent',
                  fontWeight: hasRun ? 700 : 500,
                  fontSize: 13,
                  color: hasRun ? 'var(--color-run)' : 'rgba(255,255,255,0.7)',
                }}>
                  {hasRun ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 12, opacity: 0.78 }}>{dayLabels[i]}</span>
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: 12, lineHeight: 1.5, opacity: 0.86, margin: '10px 0 0' }}>
          仅统计至少 10 分钟的真实跑走；Demo 和短时记录不会增加进度
        </p>
      </div>

      {/* Progressive disclosure: statistics become useful after the first saved record. */}
      {runs.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <StatCard
            label="计划连续达成"
            value={user.planStreak > 0 ? `${user.planStreak}周` : '--'}
            icon="🔥"
            color="#f59e0b"
            onClick={() => navigate('/calendar')}
          />
          <StatCard
            label="累计跑步"
            value={user.totalRuns > 0 ? `${user.totalRuns}次` : '--'}
            icon="🏃"
            color="#ef4444"
            onClick={() => navigate('/profile')}
          />
          <StatCard
            label="最佳配速"
            value={user.bestPace ? formatPace(user.bestPace) : '--'}
            icon="⚡"
            color="#8b5cf6"
          />
          <StatCard
            label="成就徽章"
            value={unlockedBadges > 0 ? `${unlockedBadges}个` : '0个'}
            icon="🏆"
            color="#10b981"
            onClick={() => navigate('/badges')}
            badgeHint={nextBadge ? `下一个：${nextBadge.name}` : undefined}
          />
        </div>
      ) : null}

      {/* Today's records */}
      {todayRuns.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', marginBottom: 12 }}>今日记录</h3>
          {todayRuns.map(run => (
            <RunCard key={run.id} run={run} onClick={() => navigate(`/run/${run.id}`)} />
          ))}
        </div>
      )}

      {/* Recent records */}
      {recentRuns.length > 0 ? (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', marginBottom: 12 }}>最近记录</h3>
          {recentRuns.map(run => (
            <RunCard key={run.id} run={run} onClick={() => navigate(`/run/${run.id}`)} />
          ))}
        </div>
      ) : null}

      {/* Empty state encouragement */}
      {runs.length === 0 && (
        <section style={{
          textAlign: 'center', padding: '28px 20px', color: 'var(--color-text-secondary)',
          background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 20,
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👟</div>
          <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>完成第一次出发</p>
          <p style={{ fontSize: 14, lineHeight: 1.65, marginBottom: 16 }}>
            真实记录满 10 分钟即可计入本周计划；也可以先用 Demo 熟悉流程。
          </p>
          <button type="button" className="primary-action" onClick={() => navigate('/run')}>
            开始跑走
          </button>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color, onClick, badgeHint }) {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        borderRadius: 16,
        padding: '16px',
        cursor: onClick ? 'pointer' : 'default',
        border: '1px solid var(--color-border)',
        transition: 'all 0.2s',
      }}
      onClick={onClick}
      onKeyDown={event => {
        if (onClick && (event.key === 'Enter' || event.key === ' ')) onClick();
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      {badgeHint && (
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>{badgeHint}</div>
      )}
    </div>
  );
}

function RunCard({ run, onClick }) {
  const d = new Date(run.date);
  const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const dayStr = `${d.getMonth() + 1}/${d.getDate()}`;
  const status = getRunStatus(run);
  const statusColor = status.code === 'qualified'
    ? 'var(--color-success)'
    : status.code === 'demo' ? '#6366f1' : '#d97706';

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        borderRadius: 16,
        padding: '16px',
        marginBottom: 10,
        border: '1px solid var(--color-border)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        transition: 'all 0.15s',
      }}
      onClick={onClick}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') onClick();
      }}
      role="button"
      tabIndex={0}
    >
      {/* Date */}
      <div style={{ textAlign: 'center', minWidth: 48 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-run)', lineHeight: 1 }}>{dayStr}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{timeStr}</div>
        <div style={{ fontSize: 10, color: statusColor, fontWeight: 700, marginTop: 4 }}>{status.label}</div>
      </div>
      {/* Divider */}
      <div style={{ width: 1, height: 36, background: 'var(--color-border)' }} />
      {/* Stats */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'space-around' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>{formatDistance(run.distance)}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>距离</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>{formatDuration(run.duration)}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>时长</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>{formatPace(run.pace)}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>配速</div>
        </div>
      </div>
      {/* Arrow */}
      <div style={{ color: 'var(--color-text-secondary)', fontSize: 16 }}>›</div>
    </div>
  );
}
