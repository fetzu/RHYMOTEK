// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://rhymotek.com',
  integrations: [preact(), sitemap()],
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
    runtime: {
      bindings: {},
      multiBindingCache: true,
      compatibility_flags: ['nodejs_compat'],
    },
  }),
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      external: ['path', 'fs', 'os', 'crypto', 'stream', 'util', 'events', 'assert'],
      noExternal: [],
    },
    optimizeDeps: {
      exclude: ['path', 'fs', 'os', 'crypto', 'stream', 'util'],
    },
  },
});