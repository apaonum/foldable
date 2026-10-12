import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  css: ['@foldablejs/core/primitives.css', '~/assets/example.css'],
  devtools: { enabled: false },
  telemetry: false,
  // Keep :dir() in primitives.css: older CSS targets rewrite it into :lang() lists, which ignore dir="rtl".
  vite: { build: { cssTarget: ['safari17', 'ios17'] } },
});
