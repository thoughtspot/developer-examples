/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_THOUGHTSPOT_HOST: string
  readonly VITE_THOUGHTSPOT_USERNAME: string
  readonly VITE_THOUGHTSPOT_PASSWORD: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 