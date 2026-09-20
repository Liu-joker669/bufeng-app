import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../app-context.js';
import { getRunStatus } from '../domain/runs.js';
import { formatDuration, formatDistance, formatPace, formatDate } from '../utils/format.js';
import { useState } from 'react';
import RouteMap from '../components/RouteMap.jsx';

export default function RunDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useApp();
  const { runs } = state;
  const run = runs.find(r => r.id === id);
  const [mood, setMood] = useState(null);

  if (!run) {
    return (
      <div className="page-enter" style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>未找到跑步记录</p>
        <button onClick={() => navigate('/')} style={{
          marginTop: 16, background: 'var(--color-primary)', border: 'none',
          color: 'white', padding: '10px 24px', borderRadius: 20, cursor: 'pointer',
        }}>返回首页</button>
      </div>
    );
  }

  const status = getRunStatus(run);
  const statusColor = status.code === 'qualified'
    ? 'var(--color-success)'
    : status.code === 'demo' ? '#6366f1' : '#d97706';

  return (
    <div className="page-enter" style={{ padding: '0 0 100px' }}>
      {/* Hero card */}
      <div style={{
        background: run.isDemo
          ? 'linear-gradient(135deg, #fff7ed 0%, #f5f3ff 100%)'
          : 'linear-gradient(135deg, #1c1917 0%, #44403c 100%)',
        color: run.isDemo ? 'var(--color-text)' : 'white',
        padding: '32px 20px 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
          <button onClick={() => navigate(-1)} style={{
            background: run.isDemo ? 'white' : 'rgba(255,255,255,0.1)',
            border: run.isDemo ? '1px solid var(--color-border)' : 'none',
            color: run.isDemo ? 'var(--color-text)' : 'white',
            width: 44, height: 44, borderRadius: 22, fontSize: 20, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginRight: 12,
          }}>←</button>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>跑步详情</h2>
            <p style={{ fontSize: 14, opacity: 0.7, margin: '2px 0 0' }}>{formatDate(run.date)}</p>
          </div>
        </div>

        {/* Big stats */}
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          <HeroStat label="距离" value={formatDistance(run.distance)} />
          <HeroStat label="时长" value={formatDuration(run.duration)} />
          <HeroStat label="平均配速" value={run.pace ? formatPace(run.pace) : '--'} unit="/km" />
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        <div style={{
          background: 'var(--color-surface)', border: `1px solid ${statusColor}`,
          borderRadius: 14, padding: '12px 14px',
        }}>
          <div style={{ color: statusColor, fontSize: 13, fontWeight: 700 }}>{status.label}</div>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: 12, marginTop: 3 }}>{status.detail}</div>
        </div>
      </div>

      {/* Route map */}
      {run.route && run.route.length > 1 && (
        <div style={{ padding: '16px' }}>
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: 20,
            border: '1px solid var(--color-border)',
            overflow: 'hidden',
            padding: 16,
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 12 }}>
              🗺 {run.isDemo ? 'Demo 路线示意' : 'GPS 相对轨迹（非真实地图）'}
            </h3>
            <RouteMap route={run.route} isDemo={run.isDemo} />
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 12, fontSize: 12, color: 'var(--color-text-secondary)' }}>
              <span>🟢 起点</span>
              <span>🔴 终点</span>
            </div>
          </div>
        </div>
      )}

      {/* Segment splits */}
      {run.segments && run.segments.length > 0 && (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: 20,
            border: '1px solid var(--color-border)',
            padding: 16,
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 12 }}>🏁 分段配速</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {run.segments.map((seg, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 12,
                  background: i % 2 === 0 ? '#fafaf9' : 'white',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 18,
                    background: 'var(--color-run)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700,
                  }}>
                    {seg.km}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
                      {formatDistance(seg.distance)}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
                    {seg.pace ? formatPace(seg.pace) : '--'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mood & Share */}
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: 20,
          border: '1px solid var(--color-border)',
          padding: 20,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 12 }}>💭 这次跑步感觉如何？</h3>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 20 }}>
            {['😊', '💪', '😤', '🤩', '😎'].map((m, i) => (
              <button key={i} onClick={() => setMood(i)} style={{
                fontSize: 36, background: mood === i ? 'var(--color-primary-light)' : 'transparent',
                border: mood === i ? '2px solid var(--color-primary)' : '2px solid transparent',
                borderRadius: 16, padding: 8, cursor: 'pointer', transition: 'all 0.2s',
              }}>
                {m}
              </button>
            ))}
          </div>

          {/* Share card preview */}
          <div className="share-card">
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 13, opacity: 0.6 }}>
                步频 · {status.code === 'qualified' ? '有效跑走' : status.label}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 16 }}>
              <ShareItem label="距离" value={formatDistance(run.distance)} />
              <ShareItem label="时长" value={formatDuration(run.duration)} />
              <ShareItem label="配速" value={run.pace ? formatPace(run.pace) : '--'} />
            </div>
            <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 600 }}>
              {status.code === 'qualified' ? '按自己的节奏，完成本周计划 🏃‍♂️' : status.detail}
            </div>
            <div style={{
              marginTop: 16, display: 'flex', justifyContent: 'center',
              gap: 8, opacity: 0.5, fontSize: 11,
            }}>
              <span>#步频App</span>
              <span>#跑走记录</span>
              <span>#按周计划</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroStat({ label, value, unit }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 32, fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: 13, opacity: 0.6, marginTop: 4 }}>
        {label}{unit ? <span style={{ fontSize: 11 }}>{unit}</span> : null}
      </div>
    </div>
  );
}

function ShareItem({ label, value }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 11, opacity: 0.5 }}>{label}</div>
    </div>
  );
}
