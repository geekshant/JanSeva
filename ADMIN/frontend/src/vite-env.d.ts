/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_MAPBOX_ACCESS_TOKEN: string;
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
  readonly VITE_MAP_MODE?: 'demo' | 'production';
  readonly VITE_DATA_MODE?: 'demo' | 'production';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
