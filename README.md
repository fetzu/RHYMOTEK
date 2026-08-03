# RHYMOTEK

RHYMOTEK is an interactive rap lyrics analysis platform. It presents verses with word-level annotations -- hand-drawn highlights, connection arrows, and mind-map-style analysis nodes -- that readers activate by clicking trigger words. Authors manage content through a visual WYSIWYG editor built into the TinaCMS admin interface.

## Tech Stack

- **Astro 7** -- static site generator with hybrid rendering
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
- pnpm (the version in `packageManager` is authoritative; `corepack enable` will match it)

This project uses **pnpm**, not npm. There is no `package-lock.json`, so `npm install` will resolve a different tree than the committed `pnpm-lock.yaml` and can produce a build that works locally but fails in CI.

## Development

Install dependencies:

```sh
pnpm install
```

Start the development server with TinaCMS:

```sh
pnpm run dev
```

This runs TinaCMS and Astro together. The site is available at `http://localhost:4321` and the admin interface at `http://localhost:4321/admin`.

To run only the Astro dev server (without TinaCMS):

```sh
pnpm run dev:astro
```

## Building for Production

```sh
pnpm run build
```

This runs three steps in sequence:
1. `tinacms build` -- compiles the CMS admin interface
2. `astro build` -- builds the static site to `dist/`
3. `pagefind --site dist/client` -- indexes the built pages for search

## Deployment

The project is configured for Cloudflare Workers deployment. The `wrangler.jsonc` file defines the worker configuration.

Deploy using Wrangler:

```sh
pnpm exec wrangler deploy
```

The production build outputs to `dist/` with client assets in `dist/client/` and server-side code for the Cloudflare Workers runtime.

### Environment Notes

- TinaCMS runs in **local mode** by default (reads/writes JSON files on disk). For production CMS access, configure TinaCMS Cloud with `clientId` and `token` in `tina/config.ts`.
- The Cloudflare Workers adapter handles server-side rendering for dynamic routes. Static pages are pre-rendered at build time.
- `nodejs_compat` must stay in `compatibility_flags` in `wrangler.jsonc`. SSR pulls in Node built-ins, and the build fails to resolve them without it. Note that Wrangler ignores `wrangler.toml` entirely whenever a `wrangler.jsonc` is present, so the flag belongs in the `.jsonc`.

## Testing

The project uses Playwright for end-to-end tests:

```sh
pnpm exec playwright install --with-deps chromium
pnpm exec playwright test
```

## CI

GitHub Actions runs on push/PR to `main`:
1. `pnpm install --frozen-lockfile` -- fails if `pnpm-lock.yaml` is out of sync with `package.json`
2. Type checking (`astro check`)
3. Full production build (TinaCMS + Astro + Pagefind)
4. Playwright E2E tests against the built site

## Dependencies

Dependency settings live in **`pnpm-workspace.yaml`**, not `package.json`. pnpm does not read npm's top-level `overrides` field, so security pins placed there are silently ignored.

### Upgrades that look routine but break the CMS

TinaCMS pins several of its own dependencies, and bumping them past those pins breaks the admin at **runtime only** -- `tinacms build` and `astro check` both still pass, so CI does not catch any of these. Do not merge a dependency PR that reintroduces one:

| Package | Constraint | What breaks |
|---|---|---|
| `react-router` / `react-router-dom` | tinacms needs `^6.30.3` | v7+ makes the admin router match no routes; `/admin` renders blank |
| `react-final-form` | tinacms pins `final-form` to exactly `4.20.10` | v7 needs `final-form ^5`, so two copies coexist and `useFormState()` in the annotation editor loses TinaCMS's form context |
| `esbuild` | TinaCMS bundles with Vite 4 | 0.28+ cannot transform its legacy browser target; the pin is scoped to `>=0.25` to leave TinaCMS's copies alone |

These are listed under `ignore` in `.github/dependabot.yml` with the reasoning inline.

### Security alerts

Dependabot **alerts** are enabled; Dependabot **security updates** are disabled (`automated-security-fixes` API). Every open advisory is a transitive dependency of TinaCMS with no resolvable fix -- most conclusively, `@tinacms/graphql` calls js-yaml's `safeLoad`/`safeDump`, which v4 removed -- so each security-update job failed on every push. None of the affected packages reach the public site: `src/` never imports tinacms and none appear in the built client bundle. Re-enable once TinaCMS moves off `graphiql@3.0.0-alpha.1` and Vite 4:

```sh
gh api -X PUT repos/fetzu/RHYMOTEK/automated-security-fixes
```

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
