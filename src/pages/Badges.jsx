import { useApp } from '../app-context.js';
import { BADGE_DEFS } from '../domain/runs.js';
import { useNavigate } from 'react-router-dom';

export default function Badges() {
  const { state } = useApp();
  const navigate = useNavigate();
  const { badges } = state;
  const unlocked = badges.length;
  const total = BADGE_DEFS.length;
  const progress = Math.round((unlocked / total) * 100);
  const latestBadge = badges.length > 0
    ? BADGE_DEFS.find(badge => badge.id === badges[badges.length - 1])
    : null;

  return (
    <div className="page-enter" style={{ padding: '20px 16px' }}>
      <section style={{
        background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
        borderRadius: 20, padding: '24px 20px', color: 'white', marginBottom: 24,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>一致性成就</h2>
            <p style={{ fontSize: 15, opacity: 0.82, marginTop: 4 }}>奖励可持续节奏，不奖励冒险追速度</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, fontWeight: 800 }}>{unlocked}</div>
            <div style={{ fontSize: 13, opacity: 0.7 }}>/ {total}</div>
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 8, height: 8, overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: 'white', borderRadius: 8 }} />
        </div>
        <p style={{ fontSize: 13, opacity: 0.78, marginTop: 8 }}>已完成 {progress}%</p>
      </section>

      {latestBadge ? (
        <section style={{
          background: 'var(--color-surface)', borderRadius: 20,
          border: '2px solid var(--color-primary)', padding: 20,
          marginBottom: 24, textAlign: 'center',
        }}>
          <p style={{ fontSize: 13, color: 'var(--color-primary-dark)', fontWeight: 600, marginBottom: 8 }}>🎉 最近获得</p>
          <div style={{ fontSize: 56 }} className="animate-bounce-in">{latestBadge.icon}</div>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: '8px 0 4px' }}>{latestBadge.name}</h3>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>{latestBadge.desc}</p>
        </section>
      ) : (
        <section style={{
          background: '#fffbeb', borderRadius: 18, border: '1px solid #fde68a',
          padding: 18, marginBottom: 20,
        }}>
          <p style={{ fontSize: 13, color: '#92400e', fontWeight: 700, marginBottom: 5 }}>下一枚 · 第一次出发</p>
          <p style={{ fontSize: 15, color: 'var(--color-text)', lineHeight: 1.6, marginBottom: 14 }}>
            完成 1 次至少 10 分钟的真实跑走。Demo 和短时记录不会解锁。
          </p>
          <button type="button" className="primary-action primary-action--compact" onClick={() => navigate('/run')}>
            去完成第一次出发
          </button>
        </section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {BADGE_DEFS.map(badge => {
          const isUnlocked = badges.includes(badge.id);
          return (
            <article
              key={badge.id}
              className={isUnlocked ? '' : 'badge-locked'}
              style={{
                background: 'var(--color-surface)', borderRadius: 16,
                padding: '16px 8px', border: '1px solid var(--color-border)',
                textAlign: 'center',
              }}
            >
              <div style={{
                fontSize: 36, marginBottom: 8,
                filter: isUnlocked ? 'none' : 'grayscale(1)', opacity: isUnlocked ? 1 : 0.55,
              }}>{badge.icon}</div>
              <div style={{
                fontSize: 14, fontWeight: 700,
                color: isUnlocked ? 'var(--color-text)' : 'var(--color-text-secondary)',
                marginBottom: 4,
              }}>
                {badge.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{badge.desc}</div>
              <div style={{
                marginTop: 8, fontSize: 12,
                color: isUnlocked ? 'var(--color-success)' : '#78716c',
                fontWeight: 600,
              }}>
                {isUnlocked ? '✓ 已获得' : '🔒 未解锁'}
              </div>
            </article>
          );
        })}
      </div>

    </div>
  );
}
