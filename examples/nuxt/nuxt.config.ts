import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  css: ['@foldablejs/core/primitives.css', '~/assets/example.css'],
  devtools: { enabled: false },
  telemetry: false,
});
