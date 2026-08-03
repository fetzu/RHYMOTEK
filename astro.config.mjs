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
  // @astrojs/cloudflare >=13.6 delegates local bindings/runtime setup to
  // @cloudflare/vite-plugin, so the old `platformProxy` and `runtime` options
  // no longer exist. Compatibility flags now live in wrangler.jsonc.
  adapter: cloudflare(),
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