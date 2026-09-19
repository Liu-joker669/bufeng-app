export const DEMO_PACE_SECONDS_PER_KM = 450;
export const DEMO_SPEED_MULTIPLIER = 2;
export const DEMO_TARGET_DURATION_SECONDS = 600;

const DEMO_ROAD_ANCHORS = [
  [120, 74], [145, 71], [190, 77], [230, 84], [267, 82],
  [270, 110], [267, 142], [263, 154], [235, 159], [206, 167],
  [175, 174], [145, 180], [121, 178], [114, 160], [119, 142],
  [122, 110], [120, 74],
];

export function buildDemoRoute(pointCount = 300) {
  const segments = DEMO_ROAD_ANCHORS.slice(1).map((point, index) => {
    const start = DEMO_ROAD_ANCHORS[index];
    const length = Math.hypot(point[0] - start[0], point[1] - start[1]);
    return { start, end: point, length };
  });
  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);
  const baseLat = 31.2304;
  const baseLng = 121.4737;

  return Array.from({ length: pointCount + 1 }, (_, index) => {
    let remaining = (index / pointCount) * totalLength;
    let segment = segments[segments.length - 1];
    for (const candidate of segments) {
      if (remaining <= candidate.length) {
        segment = candidate;
        break;
      }
      remaining -= candidate.length;
    }
    const ratio = segment.length > 0 ? Math.min(1, remaining / segment.length) : 0;
    const mapX = segment.start[0] + (segment.end[0] - segment.start[0]) * ratio;
    const mapY = segment.start[1] + (segment.end[1] - segment.start[1]) * ratio;

    return {
      mapX,
      mapY,
      lat: baseLat - (mapY - 110) * 0.0000225,
      lng: baseLng + (mapX - 200) * 0.000026,
    };
  });
}

export function getDemoFrame(realElapsedSeconds, routePointCount) {
  const virtualElapsed = Math.min(
    DEMO_TARGET_DURATION_SECONDS,
    Math.max(0, Math.floor(realElapsedSeconds * DEMO_SPEED_MULTIPLIER))
  );
  const progress = virtualElapsed / DEMO_TARGET_DURATION_SECONDS;
  const lastRouteIndex = Math.max(1, routePointCount - 1);
  const routeIndex = Math.max(1, Math.min(
    lastRouteIndex,
    Math.floor(progress * lastRouteIndex)
  ));

  return {
    elapsed: virtualElapsed,
    distance: virtualElapsed / DEMO_PACE_SECONDS_PER_KM,
    pace: virtualElapsed > 0 ? DEMO_PACE_SECONDS_PER_KM : null,
    routeIndex,
  };
}
