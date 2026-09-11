import { useQuery } from '@tanstack/react-query';
import { http } from '../../api/http';
import { GridSnapshot } from '@contracts/types';
import { DataQuality, GreennessBand } from '@contracts/enums';

const fallbackGridSnapshot: GridSnapshot = {
  zoneId: 'IN-WE',
  at: new Date().toISOString(),
  renewablePct: 72,
  carbonFreePct: 74,
  carbonIntensity: 410,
  band: GreennessBand.HIGH,
  breakdown: {
    solar: 4800,
    wind: 3200,
    hydro: 1600,
    nuclear: 420,
    coal: 5800,
    gas: 900,
    biomass: 280,
    unknown: 200,
  },
  quality: DataQuality.MOCK,
  asOfAgeSec: 30,
};

export function useLiveGrid() {
  const query = useQuery<GridSnapshot>({
    queryKey: ['grid', 'live'],
    queryFn: async () => {
      try {
        const res = await http.get<GridSnapshot>('/grid/live');
        return res;
      } catch (err) {
        console.warn('[useLiveGrid] Failed to fetch live grid, using fallback', err);
        return fallbackGridSnapshot;
      }
    },
    staleTime: 15000,
    refetchInterval: 30000,
    initialData: fallbackGridSnapshot,
  });

  return {
    grid: query.data || fallbackGridSnapshot,
    isFetching: query.isFetching,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
