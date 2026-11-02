// Environment configuration for map and data mode switching.
// VITE_MAP_MODE=demo  → Mock Bhopal SVG map (for SIH/demo)
// VITE_MAP_MODE=production → Real Mapbox map
// VITE_DATA_MODE=demo → Simulated complaint dataset
// VITE_DATA_MODE=production → Live Supabase data

export type MapMode = 'demo' | 'production';
export type DataMode = 'demo' | 'production';

export const MAP_MODE: MapMode =
  (import.meta.env.VITE_MAP_MODE as MapMode) || 'demo';

export const DATA_MODE: DataMode =
  (import.meta.env.VITE_DATA_MODE as DataMode) || 'demo';

export const IS_DEMO_MAP = MAP_MODE === 'demo';
export const IS_DEMO_DATA = DATA_MODE === 'demo';
