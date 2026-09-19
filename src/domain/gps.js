export const GPS_MIN_ROUTE_STEP_KM = 0.005;
export const GPS_MAX_ACCEPTED_ACCURACY_METERS = 80;

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

export function shouldAppendRoutePoint(previousPoint, nextPoint) {
  return !previousPoint || haversineKm(previousPoint, nextPoint) >= GPS_MIN_ROUTE_STEP_KM;
}

export function getGpsErrorMessage(error) {
  if (error?.code === 1) {
    return '定位权限被拒绝。请在浏览器地址栏中允许定位后重试，或使用 Demo 模式。';
  }
  if (error?.code === 2) {
    return '暂时无法获取位置。请开启设备定位服务并移到室外后重试。';
  }
  if (error?.code === 3) {
    return '获取 GPS 超时。请检查定位权限、移到室外后重试，或使用 Demo 模式。';
  }
  return '定位失败。请检查浏览器定位权限后重试，或使用 Demo 模式。';
}
