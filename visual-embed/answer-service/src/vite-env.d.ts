/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_THOUGHTSPOT_HOST: string;
  readonly VITE_DATASOURCE_ID: string;
  readonly VITE_AUTH_TYPE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
