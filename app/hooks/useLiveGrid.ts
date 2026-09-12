import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '@/services/api';
import { getLiveGridSnapshot, GridSnapshot, getGridForecast, ForecastPoint } from '@/lib/gridData';

export function useLiveGrid(zoneId: string = 'IN-WE', stationId?: string) {
  const [liveGrid, setLiveGrid] = useState<GridSnapshot>(() => getLiveGridSnapshot(zoneId));
  const [forecast, setForecast] = useState<ForecastPoint[]>(() => getGridForecast(zoneId));
  const [loading, setLoading] = useState<boolean>(true);
  const [isLive, setIsLive] = useState<boolean>(false);

  const fetchGridData = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams({ zoneId });
      if (stationId) queryParams.append('stationId', stationId);

      // 1. Fetch live grid snapshot from server -> ML service
      const liveRes = await apiRequest<any>(`/grid/live?${queryParams.toString()}`);
      if (liveRes && typeof liveRes.renewablePct === 'number') {
        const breakdown = liveRes.breakdown || {};
        setLiveGrid({
          zoneId: liveRes.zoneId || zoneId,
          at: liveRes.at || new Date().toISOString(),
          renewablePct: Number(liveRes.renewablePct.toFixed(1)),
          carbonFreePct: Number((liveRes.carbonFreePct ?? liveRes.renewablePct).toFixed(1)),
          carbonIntensity: liveRes.carbonIntensity ?? 400,
          band: liveRes.band || (liveRes.renewablePct >= 65 ? 'HIGH' : liveRes.renewablePct >= 50 ? 'MEDIUM' : 'AMBER'),
          breakdown: {
            solar: breakdown.solar || 0,
            wind: breakdown.wind || 0,
            hydro: breakdown.hydro || 0,
            nuclear: breakdown.nuclear || 0,
            biomass: breakdown.biomass || 0,
            coal: breakdown.coal || 0,
            gas: breakdown.gas || 0,
            unknown: breakdown.unknown || 0,
          },
          quality: liveRes.quality || 'live',
          asOfAgeSec: liveRes.asOfAgeSec || 0,
          zoneName: liveRes.zoneId === 'IN-WE' ? 'West India · Gujarat' : liveRes.zoneId || 'India',
        });
        setIsLive(liveRes.quality === 'live' || liveRes.quality === 'cached');
      }

      // 2. Fetch 24h forecast from server -> ML service
      const forecastRes = await apiRequest<any[]>(`/forecast?${queryParams.toString()}`);
      if (Array.isArray(forecastRes) && forecastRes.length > 0) {
        const currentIST = Math.floor((new Date().getUTCHours() + 5.5) % 24);
        const formattedForecast: ForecastPoint[] = forecastRes.map((f: any, idx: number) => {
          const h = (currentIST + idx) % 24;
          const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
          const ampm = h >= 12 ? 'PM' : 'AM';
          return {
            hourIST: h,
            label: `${displayH} ${ampm}`,
            renewablePct: Math.round(f.renewablePct || 50),
            carbonIntensity: f.carbonIntensity || 450,
            confidence: f.confidence || 0.8,
            isRecommended: idx === 0 || f.renewablePct > 60,
          };
        });
        setForecast(formattedForecast);
      }
    } catch (err) {
      console.warn('[useLiveGrid] Live fetch failed, using realistic fallback:', err);
    } finally {
      setLoading(false);
    }
  }, [zoneId, stationId]);

  useEffect(() => {
    fetchGridData();
    const interval = setInterval(fetchGridData, 30000); // 30s live auto-refresh
    return () => clearInterval(interval);
  }, [fetchGridData]);

  return {
    liveGrid,
    forecast,
    loading,
    isLive,
    refresh: fetchGridData,
  };
}
