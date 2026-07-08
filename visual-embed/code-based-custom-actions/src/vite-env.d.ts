/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TS_HOST: string;
  readonly VITE_TS_USERNAME: string;
  readonly VITE_TS_PASSWORD: string;
  readonly VITE_LIVEBOARD_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
