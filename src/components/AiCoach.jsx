import { useApp } from '../app-context.js';
import { useState } from 'react';
import { getUniqueRunDayCount, isQualifiedRun } from '../domain/runs.js';
import { formatDistance, getWeekRuns } from '../utils/format.js';
import { useNavigate } from 'react-router-dom';

// 本地规则助手：只验证“状态输入 → 可执行建议”的交互价值，不验证 LLM 能力。

export default function AiCoach() {
  const { state } = useApp();
  const { runs, user } = state;
  const navigate = useNavigate();
  const [mood, setMood] = useState(null);
  const [advice, setAdvice] = useState(null);

  const weekRuns = getWeekRuns(runs).filter(isQualifiedRun);
  const weekRunDays = getUniqueRunDayCount(weekRuns);
  const weekDistance = weekRuns.reduce((s, r) => s + r.distance, 0);

  function generateAdvice(selectedMood) {
    const planStreak = user.planStreak;
    const hasRunThisWeek = weekRunDays > 0;
    const suggestions = [];

    // 规则 1：根据状态给出最低门槛方案
    const moodPlans = {
      tired: {
        title: '今天先恢复，再决定是否跑',
        plan: '如果只是轻微疲劳，可以做 10 分钟轻松跑走，以能完整说话为强度上限；若疼痛或明显不适，请休息。',
        reason: '新手阶段，恢复和连续训练同样重要。',
      },
      busy: {
        title: '时间紧？保留一个最小行动',
        plan: '先安排 10 分钟快走或轻松跑走。时间不足时不追求里程，也不需要为了打卡连续多天跑。',
        reason: '目标是建立可持续节奏，不是维护一个每天不断的数字。',
      },
      lazy: {
        title: '不想跑是完全正常的',
        plan: `今天只做一件事：穿上跑鞋出门走 5 分钟。如果走完想跑，就跑 ${hasRunThisWeek ? '10 分钟' : '5 分钟'}。`,
        reason: '先降低启动阻力，再根据身体感受决定是否继续。',
      },
      good: {
        title: '状态不错，完成一次轻松跑走',
        plan: `建议 ${hasRunThisWeek ? '15-20 分钟' : '10-15 分钟'}，保持可以说完整句子的轻松强度。`,
        reason: '新手优先稳定完成，不用追配速或一次加太多时长。',
      },
    };
    const plan = moodPlans[selectedMood];
    suggestions.push({ type: 'plan', ...plan });

    // 规则 2：基于连续达成周数的鼓励（与北极星指标一致）
    if (planStreak >= 4) {
      suggestions.push({
        type: 'streak',
        text: `你已经连续 ${planStreak} 周完成计划。保持当前频率，比临时加量更重要。`,
      });
    } else if (planStreak >= 1) {
      suggestions.push({
        type: 'streak',
        text: `已连续 ${planStreak} 周达成目标。下一次计划内完成，才是你要守住的节奏。`,
      });
    } else {
      suggestions.push({
        type: 'streak',
        text: '先完成本周计划，不要求每天都跑。第一次完成即可解锁「第一次出发」徽章 👟',
      });
    }

    // 规则 3：本周进度提示
    const goal = state.goal;
    const remaining = Math.max(0, goal - weekRunDays);
    if (remaining > 0) {
      suggestions.push({
        type: 'goal',
        text: `本周目标 ${goal} 天，已完成 ${weekRunDays} 天（${formatDistance(weekDistance)}）。再完成 ${remaining} 天即达成。`,
      });
    } else {
      suggestions.push({
        type: 'goal',
        text: `本周目标 ${goal} 天已达成！本周累计 ${formatDistance(weekDistance)}。下一步优先恢复，不必为超额完成而加跑。`,
      });
    }

    return suggestions;
  }

  function handleMoodSelect(m) {
    if (mood === m) return;
    setMood(m);
    setAdvice(generateAdvice(m));
  }

  const moodOptions = [
    { key: 'tired', icon: '😮‍💨', label: '有点累' },
    { key: 'busy', icon: '⏰', label: '没时间' },
    { key: 'lazy', icon: '🛋', label: '不想动' },
    { key: 'good', icon: '💪', label: '状态好' },
  ];

  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: 20,
      border: '1px solid var(--color-border)',
      padding: 20,
      marginBottom: 20,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 20,
          background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, color: 'white', flexShrink: 0,
        }}>
          🤖
        </div>
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
            今日计划助手
          </h3>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '3px 0 0' }}>
            规则版建议 · 不是医疗或专业训练意见
          </p>
        </div>
      </div>

      {/* Mood selection */}
      {!advice && (
        <>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
            今天的状态怎么样？
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {moodOptions.map(m => (
              <button key={m.key} onClick={() => handleMoodSelect(m.key)} style={{
                background: mood === m.key ? '#ede9fe' : '#fafaf9',
                border: mood === m.key ? '2px solid #8b5cf6' : '1px solid var(--color-border)',
                borderRadius: 14, padding: '14px 4px', cursor: 'pointer', minHeight: 88,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: 28 }}>{m.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{m.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Advice */}
      {advice && (
        <div className="page-enter">
          {advice.map((item, i) => (
            <div key={i} style={{
              background: item.type === 'plan' ? '#f5f3ff' : '#fafaf9',
              borderRadius: 14,
              padding: '14px 16px',
              marginBottom: 8,
              border: item.type === 'plan' ? '1px solid #ddd6fe' : '1px solid var(--color-border)',
            }}>
              {item.type === 'plan' && (
                <>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#6d28d9', marginBottom: 6 }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--color-text)', lineHeight: 1.65, marginBottom: 6 }}>
                    {item.plan}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
                    💡 {item.reason}
                  </div>
                </>
              )}
              {item.type !== 'plan' && (
                <div style={{ fontSize: 14, color: 'var(--color-text)', lineHeight: 1.6 }}>
                  {item.type === 'streak' ? '🔥 ' : '🎯 '}{item.text}
                </div>
              )}
            </div>
          ))}
          <button
            onClick={() => navigate('/run')}
            style={{
              width: '100%', marginTop: 8,
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              border: 'none', color: 'white', fontSize: 16, fontWeight: 700,
              padding: '15px', borderRadius: 14, cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(139,92,246,0.3)',
            }}
          >
            🏃 按建议去跑步
          </button>
        </div>
      )}
    </div>
  );
}
