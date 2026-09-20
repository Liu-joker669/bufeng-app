import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../app-context.js';
import { getRunStatus } from '../domain/runs.js';
import { formatDuration, formatPace, formatDistance } from '../utils/format.js';
import RouteMap from '../components/RouteMap.jsx';
import {
  getGpsErrorMessage,
  haversineKm,
  isUsableGpsPoint,
  shouldAppendRoutePoint,
  toGpsPoint,
} from '../domain/gps.js';
import {
  DEMO_PACE_SECONDS_PER_KM,
  DEMO_TARGET_DURATION_SECONDS,
  buildDemoRoute,
  getDemoFrame,
} from '../domain/demo.js';

export default function RunActive() {
  const navigate = useNavigate();
  const { dispatch } = useApp();
  const [phase, setPhase] = useState('ready'); // ready | running | paused | ended
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [pace, setPace] = useState(null);
  const [route, setRoute] = useState([]);
  const [currentPos, setCurrentPos] = useState(null);
  const [error, setError] = useState(null);
  const [gpsErrorCode, setGpsErrorCode] = useState(null);
  const [copyStatus, setCopyStatus] = useState('');
  const [completedRun, setCompletedRun] = useState(null);
  const [mode, setMode] = useState(null); // gps | demo
  const [gpsStatus, setGpsStatus] = useState('idle'); // idle | locating | weak | located | tracking
  const [gpsAccuracy, setGpsAccuracy] = useState(null);

  const watchRef = useRef(null);        // GPS watchId 或 demo 计时器 id
  const timerRef = useRef(null);        // GPS 模式下独立刷新计时
  const isDemoRef = useRef(false);       // 当前是否为 demo 模式
  const startTimeRef = useRef(null);     // 跑步开始时间戳
  const pausedTotalRef = useRef(0);      // 累计暂停时长（ms）
  const pauseStartRef = useRef(null);    // 本次暂停开始时间戳
  const lastPosRef = useRef(null);       // 上一个 GPS 点
  const totalDistRef = useRef(0);        // 累计距离（km）
  const demoRouteRef = useRef(null);     // demo 路线缓存
  const lastTickRef = useRef(0);         // 计时器上次 tick 时间（防止重复渲染）
  const isResumingGpsRef = useRef(false); // 暂停恢复后的首点不计入距离

  // ============ 计时核心：扣除暂停时长 ============
  function getActiveElapsedPrecise() {
    if (!startTimeRef.current) return 0;
    const raw = Date.now() - startTimeRef.current - pausedTotalRef.current;
    return Math.max(0, raw / 1000);
  }

  function getActiveElapsed() {
    return Math.floor(getActiveElapsedPrecise());
  }

  function tick() {
    const now = Date.now();
    // 节流：500ms 内的重复 tick 忽略
    if (now - lastTickRef.current < 250) return;
    lastTickRef.current = now;

    const totalKm = totalDistRef.current;
    if (isDemoRef.current) {
      setElapsed(Math.round(totalKm * DEMO_PACE_SECONDS_PER_KM));
      setPace(totalKm > 0.01 ? DEMO_PACE_SECONDS_PER_KM : null);
      return;
    }

    const activeElapsed = getActiveElapsed();
    setElapsed(activeElapsed);
    // 配速用活动时长计算
    if (totalKm > 0.01) {
      setPace(activeElapsed / totalKm);
    }
  }

  // ============ 追踪停止（GPS 与 demo 通用） ============
  function stopTracking() {
    if (watchRef.current != null) {
      if (isDemoRef.current) {
        clearInterval(watchRef.current);
      } else {
        navigator.geolocation.clearWatch(watchRef.current);
      }
      watchRef.current = null;
    }
    if (timerRef.current != null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  // ============ GPS 模式 ============
  const startGpsWatch = useCallback(() => {
    if (!navigator.geolocation) {
      setError('当前浏览器不支持 GPS 定位，请使用 Demo 模式体验完整流程。');
      setGpsStatus('idle');
      return false;
    }
    setGpsStatus('locating');
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const point = toGpsPoint(pos);
        setCurrentPos(point);
        setGpsAccuracy(Math.round(point.accuracy));

        if (!isUsableGpsPoint(point)) {
          setGpsStatus('weak');
          return;
        }

        // 等到首个有效定位点后再开始计时，定位等待时间不计入运动。
        if (!startTimeRef.current) {
          startTimeRef.current = Date.now();
        }

        if (isResumingGpsRef.current) {
          setRoute(prev => (
            prev.length < 2000 ? [...prev, { ...point, segmentStart: true }] : prev
          ));
          lastPosRef.current = point;
          isResumingGpsRef.current = false;
          setGpsStatus('located');
          tick();
          return;
        }

        if (!lastPosRef.current) {
          setRoute([point]);
          lastPosRef.current = point;
          setGpsStatus('located');
          tick();
          return;
        }

        if (shouldAppendRoutePoint(lastPosRef.current, point)) {
          const dist = haversineKm(lastPosRef.current, point);
          totalDistRef.current += dist;
          setDistance(totalDistRef.current);
          setRoute(prev => (
            prev.length < 2000 ? [...prev, point] : prev
          ));
          lastPosRef.current = point;
          setGpsStatus('tracking');
        }
        tick();
      },
      (err) => {
        setError(getGpsErrorMessage(err));
        setGpsErrorCode(err?.code || 'unknown');
        setGpsStatus('idle');
        stopTracking();
        setPhase('ready');
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 12000 }
    );
    return true;
  }, []);

  const startRun = useCallback(() => {
    setError(null);
    setGpsErrorCode(null);
    setCopyStatus('');
    setPhase('running');
    isDemoRef.current = false;
    setMode('gps');
    setGpsStatus('locating');
    setGpsAccuracy(null);
    startTimeRef.current = null;
    pausedTotalRef.current = 0;
    pauseStartRef.current = null;
    totalDistRef.current = 0;
    lastPosRef.current = null;
    isResumingGpsRef.current = false;
    setCurrentPos(null);
    setDistance(0);
    setPace(null);
    setRoute([]);
    lastTickRef.current = 0;

    const ok = startGpsWatch();
    if (!ok) {
      setPhase('ready');
      return;
    }
    timerRef.current = setInterval(tick, 500);
  }, [startGpsWatch]);

  // ============ Demo 模式 ============
  const startDemoTimer = useCallback(() => {
    watchRef.current = setInterval(() => {
      const demoRoute = demoRouteRef.current;
      if (demoRoute) {
        const frame = getDemoFrame(getActiveElapsedPrecise(), demoRoute.length);
        const point = demoRoute[frame.routeIndex];

        totalDistRef.current = frame.distance;
        setElapsed(frame.elapsed);
        setDistance(frame.distance);
        setPace(frame.pace);
        setCurrentPos(point);
        setRoute(demoRoute.slice(0, frame.routeIndex + 1));
        lastPosRef.current = point;
      }
    }, 250);
  }, []);

  function startDemo() {
    setError(null);
    setGpsErrorCode(null);
    setCopyStatus('');
    setPhase('running');
    isDemoRef.current = true;
    setMode('demo');
    setGpsStatus('idle');
    setGpsAccuracy(null);
    startTimeRef.current = Date.now();
    pausedTotalRef.current = 0;
    pauseStartRef.current = null;
    totalDistRef.current = 0;
    lastPosRef.current = null;
    demoRouteRef.current = buildDemoRoute();
    setCurrentPos(null);
    setDistance(0);
    setPace(null);
    setRoute([]);
    lastTickRef.current = 0;
    startDemoTimer();
  }

  function continueDemo() {
    startDemoTimer();
  }

  // ============ 暂停 / 继续 / 结束 ============
  const pauseRun = () => {
    stopTracking();
    pauseStartRef.current = startTimeRef.current ? Date.now() : null;
    setPhase('paused');
  };

  const resumeRun = () => {
    if (pauseStartRef.current) {
      pausedTotalRef.current += Date.now() - pauseStartRef.current;
      pauseStartRef.current = null;
    }
    lastTickRef.current = 0;
    setPhase('running');
    if (isDemoRef.current) {
      continueDemo();
    } else {
      isResumingGpsRef.current = true;
      startGpsWatch();
    }
  };

  const endRun = () => {
    stopTracking();

    if (!isDemoRef.current && route.length === 0) {
      setError('尚未获得有效 GPS 位置，本次记录未保存。请移到室外重试，或使用 Demo 模式。');
      setGpsStatus('idle');
      setPhase('ready');
      return;
    }

    setPhase('ended');

    const demoRoute = demoRouteRef.current || buildDemoRoute();
    const finalRoute = isDemoRef.current ? demoRoute : route;
    const demoDistance = isDemoRef.current ? getRouteDistance(demoRoute) : 0;

    // Demo 快速演示交互，但保存为一条约 10 分钟、配速合理的明确模拟记录。
    const finalElapsed = isDemoRef.current
      ? Math.max(DEMO_TARGET_DURATION_SECONDS, Math.round(demoDistance * DEMO_PACE_SECONDS_PER_KM))
      : getActiveElapsed();

    const totalDistance = parseFloat((isDemoRef.current ? demoDistance : totalDistRef.current).toFixed(2));
    const totalDuration = finalElapsed;
    const avgPace = totalDistance > 0.05 ? Math.round(totalDuration / totalDistance) : null;

    const run = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      duration: totalDuration,
      distance: totalDistance,
      pace: avgPace,
      route: finalRoute,
      segments: [],
      mood: null,
      isDemo: isDemoRef.current,
    };

    setElapsed(finalElapsed);
    setDistance(totalDistance);
    setPace(avgPace);
    setCompletedRun(run);
    dispatch({ type: 'SAVE_RUN', payload: run });
  };

  async function copyExperienceLink() {
    const experienceUrl = new URL(import.meta.env.BASE_URL, window.location.origin).href;
    try {
      await navigator.clipboard.writeText(experienceUrl);
      setCopyStatus('链接已复制，请粘贴到 Chrome 等系统浏览器中打开。');
    } catch {
      setCopyStatus(`请手动复制：${experienceUrl}`);
    }
  }

  // 卸载时清理
  useEffect(() => {
    return () => {
      stopTracking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============ 结束屏 ============
  if (phase === 'ended') {
    return (
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, #fff7ed 0%, #fff 58%, #fef2f2 100%)',
        color: 'var(--color-text)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 40, zIndex: 200,
      }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>{completedRun?.isDemo ? '模拟体验完成！' : '跑步完成！'}</h2>
        <p style={{ fontSize: 15, color: 'var(--color-text-secondary)', marginBottom: 8, textAlign: 'center' }}>
          {completedRun ? getRunStatus(completedRun).detail : ''}
        </p>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 28 }}>
          有效活动需为至少 10 分钟的真实跑走
        </p>

        <div style={{ display: 'flex', gap: 32, marginBottom: 40 }}>
          <EndStat label="距离" value={formatDistance(distance)} />
          <EndStat label="时长" value={formatDuration(elapsed)} />
          <EndStat label="配速" value={pace ? formatPace(Math.round(pace)) : '--\'--"'} />
        </div>

        <button
          onClick={() => completedRun && navigate(`/run/${completedRun.id}`)}
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            border: 'none', color: 'white', fontSize: 18, fontWeight: 700,
            padding: '14px 48px', borderRadius: 28, cursor: 'pointer',
            marginBottom: 12,
          }}
        >
          查看本次详情
        </button>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'white', border: '1px solid var(--color-border)',
            color: 'var(--color-text)', fontSize: 15, padding: '10px 32px',
            borderRadius: 28, cursor: 'pointer',
          }}
        >
          返回首页
        </button>
      </div>
    );
  }

  // ============ 准备屏 ============
  if (phase === 'ready') {
    return (
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, #fff7ed 0%, #fff 62%, #fef2f2 100%)',
        color: 'var(--color-text)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
        padding: '88px 32px 40px', zIndex: 200, overflowY: 'auto',
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            position: 'absolute', top: 16, left: 16,
            background: 'white', border: '1px solid var(--color-border)', color: 'var(--color-text)',
            width: 44, height: 44, borderRadius: 22, fontSize: 20, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ✕
        </button>

        <div style={{ fontSize: 80, marginBottom: 24 }}>🏃</div>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>准备开始跑走</h1>
        <p style={{ fontSize: 16, lineHeight: 1.6, textAlign: 'center', color: 'var(--color-text-secondary)', marginBottom: 44 }}>记录时长、距离与路线，至少 10 分钟计入周计划</p>

        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 14px',
            marginBottom: 16, fontSize: 13, lineHeight: 1.6, color: '#991b1b', width: '100%', maxWidth: 320,
          }}>
            <div>{error}</div>
            {gpsErrorCode === 1 ? (
              <>
                <ol style={{ margin: '8px 0 10px', paddingLeft: 20 }}>
                  <li>复制链接并用 Chrome 等系统浏览器打开</li>
                  <li>允许浏览器应用使用精确位置</li>
                  <li>在地址栏的网站权限中允许定位</li>
                </ol>
                <button type="button" onClick={copyExperienceLink} style={{
                  border: '1px solid #fca5a5', background: 'white', color: '#991b1b',
                  borderRadius: 999, padding: '8px 12px', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer',
                }}>
                  复制体验链接
                </button>
                {copyStatus ? <div style={{ marginTop: 8, fontSize: 12 }}>{copyStatus}</div> : null}
              </>
            ) : null}
          </div>
        )}

        <button
          onClick={startRun}
          style={{
            width: 200, height: 200, borderRadius: 100,
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            border: 'none', color: 'white', fontSize: 24, fontWeight: 800,
            cursor: 'pointer', boxShadow: '0 8px 40px rgba(239,68,68,0.5)',
            marginBottom: 16,
          }}
        >
          {gpsErrorCode === 1 ? '重新检测定位' : '开始真实记录'}
        </button>

        <button
          onClick={startDemo}
          style={{
            background: 'white', border: '1px solid #fdba74',
            color: '#9a3412', fontSize: 15, fontWeight: 600, padding: '10px 22px',
            borderRadius: 24, cursor: 'pointer', minHeight: 46,
          }}
        >
          或使用模拟跑步 (Demo)
        </button>

        <details style={{
          width: '100%', maxWidth: 320, marginTop: 14, padding: '10px 12px',
          borderRadius: 12, border: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.86)',
          color: 'var(--color-text-secondary)', fontSize: 12, lineHeight: 1.6,
        }}>
          <summary style={{ color: 'var(--color-text)', fontWeight: 700, cursor: 'pointer' }}>定位权限打不开？</summary>
          <div style={{ marginTop: 8 }}>
            应用内置浏览器可能没有权限入口。请用系统浏览器打开，并在“手机设置 → 应用 → 浏览器 → 权限 → 位置信息”中开启精确位置。
          </div>
        </details>
      </div>
    );
  }

  // ============ 跑步中 / 暂停屏 ============
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'linear-gradient(180deg, #fff7ed 0%, #fff 48%, #f8fafc 100%)',
      color: 'var(--color-text)', display: 'flex', flexDirection: 'column', zIndex: 200,
    }}>
      <div style={{ padding: '18px 20px 0', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          borderRadius: 999, padding: '7px 12px', fontSize: 12, fontWeight: 700,
          color: mode === 'demo' ? '#6d28d9' : '#047857',
          background: mode === 'demo' ? '#ede9fe' : '#d1fae5',
          border: `1px solid ${mode === 'demo' ? '#ddd6fe' : '#a7f3d0'}`,
        }}>
          {mode === 'demo'
            ? 'Demo 模拟进行中 · 数据不计入计划'
            : gpsStatus === 'locating'
              ? '正在获取 GPS · 计时尚未开始'
              : gpsStatus === 'weak'
                ? 'GPS 信号较弱 · 等待有效位置'
                : 'GPS 真实记录中'}
        </div>
      </div>

      <div style={{ padding: '12px 20px 0', textAlign: 'center' }}>
        <div style={{ fontSize: 68, fontWeight: 350, fontVariantNumeric: 'tabular-nums', letterSpacing: -2 }}>
          {formatDuration(elapsed)}
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12,
          background: 'white', border: '1px solid var(--color-border)', borderRadius: 18, padding: '14px 20px',
          boxShadow: '0 8px 24px rgba(120,113,108,0.08)',
        }}>
          <div style={{ textAlign: 'center', borderRight: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: 36, fontWeight: 700 }}>{distance.toFixed(2)}</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>公里</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 700 }}>{pace ? formatPace(Math.round(pace)) : '--\'--"'}</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>配速</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 20px 0' }}>
        <RouteMap
          route={route}
          referenceRoute={mode === 'demo' ? demoRouteRef.current : null}
          isDemo={mode === 'demo'}
          compact
          markerLabel={`${formatDuration(elapsed)} · ${distance.toFixed(2)} km · ${pace ? formatPace(Math.round(pace)) : '--\'--"'}/km`}
          emptyMessage={mode === 'gps'
            ? gpsStatus === 'weak'
              ? `GPS 信号较弱${gpsAccuracy ? `（精度约 ${gpsAccuracy} 米）` : ''}，请移到室外`
              : '正在获取 GPS 定位…'
            : '正在生成路线…'}
          singlePointMessage={mode === 'gps'
            ? `定位成功${gpsAccuracy ? `（精度约 ${gpsAccuracy} 米）` : ''}，继续移动后绘制相对轨迹`
            : null}
        />
        <div style={{
          display: 'flex', justifyContent: 'space-between', marginTop: 8,
          fontSize: 12, color: 'var(--color-text-secondary)',
        }}>
          <span>{gpsStatus === 'weak'
            ? `△ 信号较弱${gpsAccuracy ? ` · ±${gpsAccuracy} 米` : ''}`
            : currentPos
              ? `● 位置已更新${gpsAccuracy && mode === 'gps' ? ` · ±${gpsAccuracy} 米` : ''}`
              : '○ 等待位置'}</span>
          <span>{route.length} 个记录点</span>
        </div>
      </div>

      {phase === 'paused' && (
        <div style={{ marginTop: 14, fontSize: 18, fontWeight: 700, color: '#d97706', textAlign: 'center' }} className="animate-pulse-slow">
          已暂停 ⏸
        </div>
      )}

      {/* 控制按钮 */}
      <div style={{ marginTop: 'auto', padding: '18px 32px 26px', display: 'flex', justifyContent: 'center', gap: 40 }}>
        {phase === 'running' ? (
          <>
            <ControlBtn label="暂停" icon="⏸" onClick={pauseRun} bg="white" />
            <ControlBtn label="结束" icon="⏹" onClick={endRun} bg="#ef4444" main danger />
          </>
        ) : (
          <>
            <ControlBtn label="继续" icon="▶" onClick={resumeRun} bg="#10b981" main danger />
            <ControlBtn label="结束" icon="⏹" onClick={endRun} bg="#ef4444" danger />
          </>
        )}
      </div>
    </div>
  );
}

function EndStat({ label, value }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 28, fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: 13, opacity: 0.5, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function ControlBtn({ label, icon, onClick, bg, main, danger = false }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <button type="button" aria-label={label} onClick={onClick} style={{
        width: main ? 80 : 68, height: main ? 80 : 68, borderRadius: main ? 40 : 34,
        background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: main ? 32 : 26, margin: '0 auto 8px', cursor: 'pointer',
        border: danger ? 'none' : '1px solid var(--color-border)', color: danger ? 'white' : 'var(--color-text)',
        boxShadow: danger ? '0 8px 22px rgba(239,68,68,0.22)' : '0 6px 18px rgba(120,113,108,0.12)',
      }}>
        {icon}
      </button>
      <div style={{
        fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)',
      }}>
        {label}
      </div>
    </div>
  );
}

function getRouteDistance(route) {
  return route.reduce((total, point, index) => (
    index === 0 || point.segmentStart ? total : total + haversineKm(route[index - 1], point)
  ), 0);
}
