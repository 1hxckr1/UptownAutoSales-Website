/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_FENDER_API_URL: string
  readonly VITE_FENDER_API_KEY: string
  readonly VITE_ANALYTICS_ENDPOINT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
