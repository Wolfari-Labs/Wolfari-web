import { useEffect, useState } from 'react';
import { useRuntimeServices } from '../../app/gateway-context';
import type { MapCenter } from './GeoapifyMap';
import type { PlaceRoute, RouteMode } from './places';

/** Requests only ordered stops and the transport mode, never marker selection. */
export function usePlaceRoute(stops: readonly MapCenter[], mode: RouteMode) {
  const service = useRuntimeServices()?.places;
  const key = JSON.stringify({ stops, mode });
  const routable = !!service && stops.length >= 2 && stops.length <= 25;
  const [result, setResult] = useState<{ key: string; data: PlaceRoute | null } | null>(null);
  useEffect(() => {
    if (!routable || !service) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const input = JSON.parse(key) as { stops: MapCenter[]; mode: RouteMode };
      service
        .route(input.stops, controller.signal, input.mode)
        .then((data) => {
          if (!controller.signal.aborted) setResult({ key, data });
        })
        .catch(() => {
          if (!controller.signal.aborted) setResult({ key, data: null });
        });
    }, 400);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [key, routable, service]);
  return {
    data: routable && result?.key === key ? result.data : null,
    loading: routable && result?.key !== key,
  };
}
