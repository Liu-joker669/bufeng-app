import { useId, useState } from 'react';
import { projectGpsRoute } from '../domain/gps.js';

function projectRoute(route, referenceRoute = route) {
  if (!route || route.length === 0) return null;

  const boundsRoute = referenceRoute?.length > 1 ? referenceRoute : route;
  const hasMapCoordinates = boundsRoute.every(point => (
    Number.isFinite(point.mapX) && Number.isFinite(point.mapY)
  ));

  if (hasMapCoordinates) {
    const projectedPoints = route.map(point => ({
      ...point,
      x: point.mapX,
      y: point.mapY,
    }));
    return {
      segments: splitProjectedSegments(projectedPoints),
      start: { x: route[0].mapX, y: route[0].mapY },
      end: { x: route[route.length - 1].mapX, y: route[route.length - 1].mapY },
    };
  }

  const referenceProjection = projectGpsRoute(boundsRoute);
  const projectedRoute = boundsRoute === route
    ? referenceProjection
    : projectGpsRoute(route, {
      minimumViewportWidthMeters: Math.max(300, 360 / referenceProjection.pixelsPerMeter),
    });
  const projectedPoints = projectedRoute.points;

  return {
    segments: splitProjectedSegments(projectedPoints),
    start: projectedRoute.start,
    end: projectedRoute.end,
    scaleDistanceMeters: projectedRoute.scaleDistanceMeters,
    scaleWidthPixels: projectedRoute.scaleWidthPixels,
  };
}

function splitProjectedSegments(points) {
  return points.reduce((segments, point, index) => {
    if (index === 0 || point.segmentStart) segments.push([]);
    segments[segments.length - 1].push(`${point.x},${point.y}`);
    return segments;
  }, []);
}

const buildingBlocks = [
  [153, 14, 45, 25], [207, 16, 38, 22], [251, 18, 31, 22],
  [14, 96, 38, 25], [60, 98, 34, 22], [151, 98, 34, 22], [194, 99, 41, 23],
  [291, 98, 35, 24], [334, 95, 30, 27], [15, 132, 30, 22], [54, 130, 42, 25],
  [165, 179, 42, 22], [216, 176, 33, 24], [294, 177, 35, 24], [337, 172, 34, 29],
];

const trees = [[40, 42], [59, 31], [77, 47], [95, 35], [31, 60], [102, 59], [161, 145], [181, 137], [203, 143], [228, 127], [247, 118]];

function DemoMapBackdrop() {
  return (
    <>
      <rect width="400" height="220" fill="#f1f6ef" />
      <path d="M337 -15 C308 31 351 69 325 111 C305 143 334 184 302 235 L425 235 L425 -15 Z" fill="#d9ecff" />
      <path d="M347 -10 C323 32 360 70 338 112 C322 146 347 185 320 229" fill="none" stroke="#b8d9f5" strokeWidth="2" strokeDasharray="5 5" />
      <path d="M-8 154 C55 131 106 150 145 129 C183 107 220 118 259 91" fill="none" stroke="#c7e8c7" strokeWidth="46" opacity="0.9" />
      <ellipse cx="74" cy="49" rx="59" ry="34" fill="#d6efd0" />
      <rect x="275" y="25" width="42" height="25" rx="7" fill="#dbeafe" stroke="#93c5fd" strokeWidth="1.5" />
      <path d="M281 37 H311 M296 29 V47" stroke="#93c5fd" strokeWidth="1" opacity="0.8" />

      <g fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" opacity="0.95">
        <path d="M8 18 C61 25 97 16 144 24" />
        <path d="M147 48 C198 54 242 47 291 54" />
        <path d="M8 126 C64 117 108 127 145 115" />
        <path d="M146 153 C207 145 255 155 302 136" />
        <path d="M21 207 C78 192 113 203 162 190" />
        <path d="M329 57 C356 62 375 55 405 60" />
        <path d="M34 76 C29 96 31 115 23 137" />
        <path d="M189 -8 C181 36 193 69 184 104" />
        <path d="M235 86 C228 115 240 141 231 174" />
        <path d="M353 132 C348 158 357 182 347 216" />
      </g>

      <g fill="none" strokeLinecap="round">
        <path d="M-20 74 C72 87 122 64 190 77 C262 92 322 69 422 78" stroke="#d3d0cc" strokeWidth="16" />
        <path d="M-20 74 C72 87 122 64 190 77 C262 92 322 69 422 78" stroke="white" strokeWidth="11" />
        <path d="M-20 74 C72 87 122 64 190 77 C262 92 322 69 422 78" stroke="#e7e5e4" strokeWidth="1" strokeDasharray="10 7" />
        <path d="M118 -20 C104 45 132 92 119 142 C111 174 119 204 144 240" stroke="#d3d0cc" strokeWidth="15" />
        <path d="M118 -20 C104 45 132 92 119 142 C111 174 119 204 144 240" stroke="white" strokeWidth="10" />
        <path d="M274 -20 C255 35 277 95 267 142 C259 176 268 208 286 240" stroke="#d9d6d2" strokeWidth="11" />
        <path d="M274 -20 C255 35 277 95 267 142 C259 176 268 208 286 240" stroke="white" strokeWidth="7" />
        <path d="M4 184 C86 166 145 184 206 167 C270 149 327 168 410 150" stroke="#d9d6d2" strokeWidth="11" />
        <path d="M4 184 C86 166 145 184 206 167 C270 149 327 168 410 150" stroke="white" strokeWidth="7" />
      </g>

      <g fill="#ffffff" stroke="#dedbd7" strokeWidth="1">
        {buildingBlocks.map(([x, y, width, height], index) => (
          <rect key={index} x={x} y={y} width={width} height={height} rx="5" />
        ))}
      </g>

      <g fill="#6fbd73" stroke="#ffffff" strokeWidth="1">
        {trees.map(([x, y], index) => <circle key={index} cx={x} cy={y} r="4" />)}
      </g>

      <g fill="#627064" fontSize="8.5" fontWeight="600">
        <text x="45" y="52">社区公园</text>
        <text x="157" y="69">晨光路</text>
        <text x="279" y="20">社区球场</text>
        <text x="309" y="146">滨水步道</text>
        <text x="24" y="176">绿荫支路</text>
        <text x="210" y="162">跑走绿道</text>
      </g>

      <g fontSize="11">
        <text x="88" y="44">☕</text>
        <text x="287" y="43">⚽</text>
        <text x="319" y="124">💧</text>
        <text x="196" y="196">🚻</text>
      </g>
    </>
  );
}

function GpsTrackBackdrop({ gridId }) {
  return (
    <>
      <rect width="400" height="220" fill="#f8fafc" />
      <rect width="400" height="220" fill={`url(#${gridId})`} />
      <circle cx="200" cy="110" r="72" fill="none" stroke="#dbeafe" strokeWidth="1" strokeDasharray="4 6" />
      <line x1="200" y1="18" x2="200" y2="202" stroke="#e2e8f0" strokeWidth="1" />
      <line x1="20" y1="110" x2="380" y2="110" stroke="#e2e8f0" strokeWidth="1" />
    </>
  );
}

export default function RouteMap({
  route,
  referenceRoute = null,
  isDemo = false,
  compact = false,
  markerLabel = null,
  emptyMessage = '正在生成路线…',
  singlePointMessage = null,
}) {
  const rawId = useId();
  const safeId = rawId.replace(/:/g, '');
  const gradientId = `route-${safeId}`;
  const clipId = `map-clip-${safeId}`;
  const gridId = `grid-${safeId}`;
  const [zoom, setZoom] = useState(1);
  const [showMarkerInfo, setShowMarkerInfo] = useState(false);
  const projected = projectRoute(route, referenceRoute || route);
  const plannedRoute = referenceRoute?.length > route?.length
    ? projectRoute(referenceRoute, referenceRoute)
    : null;
  const hasPosition = Boolean(projected);
  const hasRoute = Boolean(projected?.segments.some(segment => segment.length > 1));
  const hasRunner = Boolean(markerLabel && projected);
  const mapFocus = hasRunner ? projected.end : { x: 200, y: 110 };

  function changeZoom(delta) {
    setZoom(current => Math.min(1.45, Math.max(1, Number((current + delta).toFixed(2)))));
  }

  function toggleMarker(event) {
    event.stopPropagation();
    setShowMarkerInfo(current => !current);
  }

  return (
    <div style={{
      borderRadius: compact ? 18 : 16,
      overflow: 'hidden',
      border: '1px solid #d6d3d1',
      background: '#eef6ef',
      position: 'relative',
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.7)',
    }}>
      <svg
        viewBox="0 0 400 220"
        role="img"
        aria-label={isDemo ? 'Demo 路线示意图，非真实地图' : 'GPS 相对轨迹图，非真实地图'}
        onClick={() => setShowMarkerInfo(false)}
        style={{ width: '100%', height: compact ? 200 : 228, display: 'block' }}
      >
        <defs>
          <clipPath id={clipId}><rect width="400" height="220" /></clipPath>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
          <pattern id={gridId} width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="0.75" />
          </pattern>
        </defs>

        <g clipPath={`url(#${clipId})`} style={{
          transformOrigin: `${mapFocus.x}px ${mapFocus.y}px`,
          transform: `scale(${zoom})`,
          transition: 'transform 240ms ease, transform-origin 240ms linear',
        }}>
          {isDemo ? <DemoMapBackdrop /> : <GpsTrackBackdrop gridId={gridId} />}

          {plannedRoute ? (
            plannedRoute.segments.map((points, index) => (
              <polyline key={index} points={points.join(' ')} fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="7 7" strokeLinecap="round" strokeLinejoin="round" opacity="0.48" />
            ))
          ) : null}

          {hasPosition ? (
            <>
              {projected.segments.map((points, index) => (
                <g key={index}>
                  <polyline points={points.join(' ')} fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" opacity="0.96" />
                  <polyline points={points.join(' ')} fill="none" stroke={`url(#${gradientId})`} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                </g>
              ))}
              <circle cx={projected.start.x} cy={projected.start.y} r="7" fill="#10b981" stroke="white" strokeWidth="3" />
              {hasRunner ? (
                <g
                  role="button"
                  tabIndex="0"
                  aria-label="查看跑者当前状态"
                  onClick={toggleMarker}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') toggleMarker(event);
                  }}
                  className="route-runner-marker"
                  style={{
                    transform: `translate(${projected.end.x}px, ${projected.end.y}px)`,
                    transition: 'transform 240ms linear', cursor: 'pointer',
                  }}
                >
                  <circle className="route-runner-pulse" r="18" fill="#fb923c" opacity="0.2" />
                  <circle r="13" fill="white" stroke="#f97316" strokeWidth="3" />
                  <text x="0" y="5" textAnchor="middle" fontSize="15">🏃</text>
                </g>
              ) : (
                <circle cx={projected.end.x} cy={projected.end.y} r="7" fill={plannedRoute ? '#f59e0b' : '#ef4444'} stroke="white" strokeWidth="3" />
              )}
            </>
          ) : null}
        </g>
      </svg>

      {!hasPosition ? (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#57534e', fontSize: 14, fontWeight: 600, background: 'rgba(255,255,255,0.36)',
        }}>
          {emptyMessage}
        </div>
      ) : null}

      {hasPosition && !hasRoute && singlePointMessage ? (
        <div style={{
          position: 'absolute', left: 14, right: 14, bottom: 14, padding: '8px 10px',
          borderRadius: 10, textAlign: 'center', color: '#57534e', fontSize: 12,
          fontWeight: 600, background: 'rgba(255,255,255,0.94)',
          boxShadow: '0 3px 12px rgba(87,83,78,0.12)',
        }}>
          {singlePointMessage}
        </div>
      ) : null}

      <div style={{
        position: 'absolute', top: 10, left: 10, background: 'rgba(255,255,255,0.95)',
        border: '1px solid #e7e5e4', borderRadius: 999, padding: '6px 9px',
        fontSize: 11, fontWeight: 700, color: isDemo ? '#6d28d9' : '#57534e',
        boxShadow: '0 3px 10px rgba(87,83,78,0.08)',
      }}>
        {isDemo ? 'Demo 示意 · 非真实地图' : 'GPS 相对轨迹 · 非真实地图'}
      </div>

      {isDemo ? (
        <div style={{ position: 'absolute', top: 46, right: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button type="button" className="map-control" aria-label="放大地图" onClick={() => changeZoom(0.15)} disabled={zoom >= 1.45}>＋</button>
          <button type="button" className="map-control" aria-label="缩小地图" onClick={() => changeZoom(-0.15)} disabled={zoom <= 1}>−</button>
        </div>
      ) : null}

      {!isDemo && hasRoute && projected?.scaleDistanceMeters ? (
        <div style={{
          position: 'absolute', right: 10, bottom: 10, padding: '5px 7px', borderRadius: 6,
          background: 'rgba(255,255,255,0.94)', color: '#475569', fontSize: 9, fontWeight: 700,
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2,
        }}>
          <span style={{
            display: 'block', width: projected.scaleWidthPixels, maxWidth: 110,
            borderTop: '2px solid #475569', borderLeft: '1px solid #475569', borderRight: '1px solid #475569',
          }} />
          <span>{projected.scaleDistanceMeters} m</span>
        </div>
      ) : null}

      {showMarkerInfo && markerLabel ? (
        <button type="button" className="route-runner-info" onClick={event => event.stopPropagation()} aria-label="跑者当前状态">
          <span style={{ fontSize: 17 }}>🏃</span>
          <span>{markerLabel}</span>
        </button>
      ) : null}
    </div>
  );
}
