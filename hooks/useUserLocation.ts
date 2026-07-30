import { useCallback, useEffect, useState } from 'react';
import {
  getUserLocation,
  LatLng,
  UserLocationResult,
  DEFAULT_OTTAWA_CENTER,
  areaLabel,
} from '../lib/location';

export function useUserLocation() {
  const [coords, setCoords] = useState<LatLng>(DEFAULT_OTTAWA_CENTER);
  const [area, setArea] = useState(areaLabel(DEFAULT_OTTAWA_CENTER));
  const [source, setSource] = useState<UserLocationResult['source']>('fallback');
  const [permission, setPermission] =
    useState<UserLocationResult['permission']>('undetermined');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await getUserLocation();
    setCoords(result.coords);
    setArea(result.area);
    setSource(result.source);
    setPermission(result.permission);
    setLoading(false);
    return result;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    coords,
    area,
    source,
    permission,
    loading,
    refresh,
    isLive: source === 'gps',
  };
}
