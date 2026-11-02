import { useQuery } from '@tanstack/react-query';
import {
  getMapComplaints,
  getUniqueWards,
  type MapQueryParams,
} from '@/services/map';
import type { MapBounds, MapFilters } from '@/types/map';
import { DEFAULT_MAP_FILTERS } from '@/types/map';

const mapKey = ['map'] as const;

/** Bhopal center — default map viewport. */
export const BHOPAL_CENTER = { lat: 23.2597, lng: 77.4126 };
export const BHOPAL_ZOOM = 12;

/** A large initial bounding box over Bhopal so the first load has data. */
export const DEFAULT_BOUNDS: MapBounds = {
  west: 77.30,
  south: 23.10,
  east: 77.55,
  north: 23.40,
};

export function useMapComplaints(
  bounds: MapBounds,
  filters: MapFilters,
  enabled = true,
) {
  const params: MapQueryParams = { bounds, filters, limit: 1000 };
  return useQuery({
    queryKey: [...mapKey, 'complaints', bounds, filters],
    queryFn: () => getMapComplaints(params),
    enabled,
    staleTime: 15_000,
  });
}

export function useUniqueWards() {
  return useQuery({
    queryKey: [...mapKey, 'wards'],
    queryFn: () => getUniqueWards(),
    staleTime: 60_000,
  });
}

export { DEFAULT_MAP_FILTERS };
