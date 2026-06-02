/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base do backend CardioIA (ver .env.example). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
