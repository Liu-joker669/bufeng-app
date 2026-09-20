export const GPS_MIN_ROUTE_STEP_METERS = 8;
export const GPS_MAX_DYNAMIC_STEP_METERS = 30;
export const GPS_MAX_ACCEPTED_ACCURACY_METERS = 40;
export const GPS_MAX_RUNNING_SPEED_METERS_PER_SECOND = 8;

const METERS_PER_DEGREE_LATITUDE = 111320;

export function haversineKm(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const la1 = a.lat * Math.PI / 180;
  const la2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function toGpsPoint(position) {
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: position.coords.accuracy,
    timestamp: position.timestamp,
  };
}

export function isUsableGpsPoint(point) {
  return Number.isFinite(point?.lat)
    && Number.isFinite(point?.lng)
    && Number.isFinite(point?.accuracy)
    && point.accuracy <= GPS_MAX_ACCEPTED_ACCURACY_METERS;
}

export function getGpsStepThresholdMeters(previousPoint, nextPoint) {
  const usableAccuracies = [previousPoint?.accuracy, nextPoint?.accuracy]
    .filter(value => Number.isFinite(value) && value > 0);
  const accuracyThreshold = usableAccuracies.length > 0
    ? Math.max(...usableAccuracies) * 0.75
    : GPS_MIN_ROUTE_STEP_METERS;

  return Math.min(
    GPS_MAX_DYNAMIC_STEP_METERS,
    Math.max(GPS_MIN_ROUTE_STEP_METERS, accuracyThreshold),
  );
}

export function getGpsPointDecision(previousPoint, nextPoint) {
  if (!previousPoint) {
    return { accepted: true, reason: 'first', distanceMeters: 0, thresholdMeters: 0 };
  }

  const distanceMeters = haversineKm(previousPoint, nextPoint) * 1000;
  const thresholdMeters = getGpsStepThresholdMeters(previousPoint, nextPoint);
  const elapsedSeconds = Number.isFinite(previousPoint.timestamp) && Number.isFinite(nextPoint.timestamp)
    ? (nextPoint.timestamp - previousPoint.timestamp) / 1000
    : null;

  if (elapsedSeconds > 0 && distanceMeters / elapsedSeconds > GPS_MAX_RUNNING_SPEED_METERS_PER_SECOND) {
    return { accepted: false, reason: 'implausible-speed', distanceMeters, thresholdMeters };
  }

  return {
    accepted: distanceMeters >= thresholdMeters,
    reason: distanceMeters >= thresholdMeters ? 'movement' : 'within-accuracy',
    distanceMeters,
    thresholdMeters,
  };
}

export function shouldAppendRoutePoint(previousPoint, nextPoint) {
  return getGpsPointDecision(previousPoint, nextPoint).accepted;
}

function toLocalMeters(point, origin) {
  const latitudeRadians = origin.lat * Math.PI / 180;
  return {
    ...point,
    localX: (point.lng - origin.lng) * METERS_PER_DEGREE_LATITUDE * Math.cos(latitudeRadians),
    localY: (point.lat - origin.lat) * METERS_PER_DEGREE_LATITUDE,
  };
}

function getNiceScaleDistance(rawMeters) {
  if (!Number.isFinite(rawMeters) || rawMeters <= 0) return 50;
  const exponent = Math.floor(Math.log10(rawMeters));
  const magnitude = 10 ** exponent;
  const normalized = rawMeters / magnitude;
  const nice = normalized < 1.5 ? 1 : normalized < 3.5 ? 2 : normalized < 7.5 ? 5 : 10;
  return nice * magnitude;
}

export function projectGpsRoute(route, {
  width = 400,
  height = 220,
  horizontalPadding = 20,
  verticalPadding = 20,
  minimumViewportWidthMeters = 300,
} = {}) {
  if (!route || route.length === 0) return null;

  const origin = route[0];
  const localPoints = route.map(point => toLocalMeters(point, origin));
  const xs = localPoints.map(point => point.localX);
  const ys = localPoints.map(point => point.localY);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const drawableWidth = width - horizontalPadding * 2;
  const drawableHeight = height - verticalPadding * 2;
  const minimumViewportHeightMeters = minimumViewportWidthMeters * drawableHeight / drawableWidth;
  const routeWidthMeters = maxX - minX;
  const routeHeightMeters = maxY - minY;
  const viewportWidthMeters = Math.max(routeWidthMeters, minimumViewportWidthMeters);
  const viewportHeightMeters = Math.max(routeHeightMeters, minimumViewportHeightMeters);
  const pixelsPerMeter = Math.min(
    drawableWidth / viewportWidthMeters,
    drawableHeight / viewportHeightMeters,
  );
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const points = localPoints.map(point => ({
    ...point,
    x: width / 2 + (point.localX - centerX) * pixelsPerMeter,
    y: height / 2 - (point.localY - centerY) * pixelsPerMeter,
  }));
  const scaleDistanceMeters = getNiceScaleDistance(72 / pixelsPerMeter);

  return {
    points,
    start: points[0],
    end: points[points.length - 1],
    pixelsPerMeter,
    scaleDistanceMeters,
    scaleWidthPixels: scaleDistanceMeters * pixelsPerMeter,
  };
}

export function getGpsErrorMessage(error) {
  if (error?.code === 1) {
    return '定位权限未开启。请用手机系统浏览器打开本页，并同时允许浏览器应用与本网站使用精确位置。设置完成后返回重试。';
  }
  if (error?.code === 2) {
    return '暂时无法获取位置。请开启设备定位服务并移到室外后重试。';
  }
  if (error?.code === 3) {
    return '获取 GPS 超时。请检查定位权限、移到室外后重试，或使用 Demo 模式。';
  }
  return '定位失败。请检查浏览器与网站的定位权限后重试，或使用 Demo 模式。';
}
