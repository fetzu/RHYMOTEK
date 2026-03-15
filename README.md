# RHYMOTEK

RHYMOTEK is an interactive rap lyrics analysis platform. It presents verses with word-level annotations -- hand-drawn highlights, connection arrows, and mind-map-style analysis nodes -- that readers activate by clicking trigger words. Authors manage content through a visual WYSIWYG editor built into the TinaCMS admin interface.

## Tech Stack

- **Astro 6** -- static site generator with hybrid rendering
- **Preact** -- lightweight UI components for interactive annotations
- **TinaCMS** -- Git-backed headless CMS with custom field components
- **Tailwind CSS 4** -- utility-first styling with typography plugin
- **Cloudflare Workers** -- edge deployment via `@astrojs/cloudflare`
- **Pagefind** -- static search indexing
- **rough-notation** -- animated SVG annotation effects (circles, underlines, boxes)
- **leader-line-new** -- SVG connector arrows between words
- **d3-force** -- physics-based layout for analysis node positioning

## Prerequisites

- Node.js >= 22.12.0
- npm

## Development

Install dependencies:

```sh
npm install
```

Start the development server with TinaCMS:

```sh
npm run dev
```

This runs TinaCMS and Astro together. The site is available at `http://localhost:4321` and the admin interface at `http://localhost:4321/admin`.

To run only the Astro dev server (without TinaCMS):

```sh
npm run dev:astro
```

## Building for Production

```sh
npm run build
```

This runs three steps in sequence:
1. `tinacms build` -- compiles the CMS admin interface
2. `astro build` -- builds the static site to `dist/`
3. `pagefind --site dist/client` -- indexes the built pages for search

## Deployment

The project is configured for Cloudflare Workers deployment. The `wrangler.jsonc` file defines the worker configuration.

Deploy using Wrangler:

```sh
npx wrangler deploy
```

The production build outputs to `dist/` with client assets in `dist/client/` and server-side code for the Cloudflare Workers runtime.

### Environment Notes

- TinaCMS runs in **local mode** by default (reads/writes JSON files on disk). For production CMS access, configure TinaCMS Cloud with `clientId` and `token` in `tina/config.ts`.
- The Cloudflare Workers adapter handles server-side rendering for dynamic routes. Static pages are pre-rendered at build time.

## Testing

The project uses Playwright for end-to-end tests:

```sh
npx playwright install --with-deps chromium
npx playwright test
```

## CI

GitHub Actions runs on push/PR to `main`:
1. Type checking (`astro check`)
2. Full production build (TinaCMS + Astro + Pagefind)
3. Playwright E2E tests against the built site

## Project Structure

```
src/
  pages/              Route pages (Astro)
  components/         Preact + Astro components
  layouts/            Page layout templates
  lib/                Shared utilities and type definitions
  content/verses/     Verse JSON files (managed by TinaCMS)
  styles/             Global CSS and Tailwind config
tina/
  config.ts           TinaCMS schema and collection definitions
  fields/             Custom TinaCMS field components
    editor/           Visual annotation editor (React)
public/               Static assets (images, icons)
tests/                Playwright E2E tests
```

## Commits

This project uses [Conventional Commits](https://www.conventionalcommits.org/) enforced by commitlint and Husky pre-commit hooks.
