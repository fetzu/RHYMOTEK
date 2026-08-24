# RHYMOTEK

RHYMOTEK takes a rap verse, lets you click on a word, and then draws all over it: hand-drawn highlights, arrows running between the words that rhyme, and little analysis bubbles hanging off the ones that earned an explanation. Readers get a static page that stays quiet until they poke it; authors get a WYSIWYG/visual editor instead of a JSON file to hand-edit (the JSON underneath is perfectly hand-editable, it is just not something anyone wants to do twice).

The site is Astro 7 with Preact islands for the parts that need to react to a click, Tailwind 4 for styling, and Cloudflare Workers for hosting. Search is Pagefind, run over the built output rather than a service. The annotations themselves are three libraries each doing one job: rough-notation draws the highlights, leader-line-new draws the arrows, and d3-force works out where the analysis nodes should sit so they stop landing on top of each other. Verses live as JSON under `src/content/verses/` and are edited through TinaCMS, which is Git-backed (a save is a commit, not a database write).

## Install

Node 22.12.0 or newer, plus pnpm (the version in `packageManager` is the authoritative one, `corepack enable` will match it).

```sh
pnpm install
```

This is a pnpm project and not an npm one: there is no `package-lock.json`, so `npm install` will cheerfully resolve a different tree than the committed `pnpm-lock.yaml` and hand you a build that works on your machine and dies in CI (and the failure never lands anywhere near the package you changed).

## Usage

```sh
pnpm run dev
```

That runs TinaCMS and Astro together: the site on `http://localhost:4321`, the admin on `http://localhost:4321/admin`. If you only care about the public side, `pnpm run dev:astro` skips the CMS and starts a good deal faster (the admin bundle is the slow half, by some margin).

```sh
pnpm run build
```

Three steps in a trench coat: `tinacms build` compiles the admin bundle, `astro build` writes the site into `dist/`, and `pagefind --site dist/client` indexes what was just built. Going straight to `astro build` leaves you with a stale admin and no search index at all (easy to forget, and the symptom is a site that looks fine until you open the admin or the search page).

Tests are Playwright, against the built site:

```sh
pnpm exec playwright install --with-deps chromium
pnpm exec playwright test
```

## Deployment

Cloudflare Workers, configured in `wrangler.jsonc` (there is no `wrangler.toml`, and that is deliberate, see below):

```sh
pnpm exec wrangler deploy
```

The build leaves client assets in `dist/client/` and the SSR entry next to them. Static pages are pre-rendered at build time, the rest is served by the worker.

Two things are worth knowing before touching that config. `nodejs_compat` has to stay in `compatibility_flags`, because SSR pulls in Node built-ins and the build cannot resolve them otherwise. And Wrangler ignores `wrangler.toml` completely whenever a `wrangler.jsonc` exists, so the flag belongs in the `.jsonc` (this is exactly as fun to debug as it sounds).

TinaCMS runs in local mode by default and reads/writes the JSON files on disk. Editing content in production means configuring TinaCMS Cloud with a `clientId` and `token` in `tina/config.ts` (nothing in this repo configures it, so that path is on you).

## CI

GitHub Actions on push and PR to `main`: `pnpm install --frozen-lockfile` (which fails outright if `pnpm-lock.yaml` has drifted from `package.json`), then `astro check`, then the full production build, then Playwright against the result.

## Things that will bite you

Dependency settings live in `pnpm-workspace.yaml`, not `package.json`. pnpm does not read npm's top-level `overrides` field at all, so a security pin put there is not "applied", it is silently ignored (no warning, no error, it simply does nothing).

TinaCMS pins a good number of its own dependencies, and the interesting failures are the ones CI cannot see: `tinacms build` and `astro check` both exit 0 while emitting an admin bundle that renders a blank page. Do not merge a dependency PR that brings one of these back:

| Package | Constraint | What breaks |
|---|---|---|
| `react-router` / `react-router-dom` | tinacms needs `^6.30.3` | v7+ makes the admin router match no routes, so `/admin` renders blank |
| `react-final-form` | tinacms pins `final-form` to exactly `4.20.10` | v7 wants `final-form ^5`, two copies end up coexisting, and `useFormState()` in the annotation editor stops seeing TinaCMS's form |
| `esbuild` | `@tinacms/cli` 2.6+ bundles with Vite 6, whose default `build.target` still includes `safari14` | esbuild 0.27.7+ knows Safari 14.0 has a destructuring bug, tries to lower every `const [a, b] = ...` in the bundle, cannot, and gives up. Vite 6 asks for `^0.25.0` and resolves that fine on its own: do NOT add an override pushing it onto the 0.28 line |

Each of those sits in the `ignore` block of `.github/dependabot.yml` with the reasoning written next to it. That file also groups the packages whose versions are chained together (`wrangler` with `@astrojs/cloudflare`, `tinacms` with `@tinacms/*`), because merging half of a peer-linked pair leaves the tree unsatisfiable, which has already broken `main` twice.

One more trap deserves its own paragraph, and it is documented at length in `CLAUDE.md`: `jsxImportSource` in the root `tsconfig.json` must stay `"react"`. Setting it to `"preact"` compiles TinaCMS's own sources with the wrong JSX runtime and blanks `/admin` in dev and in production, while the build and the type check both still exit 0 (the only way to catch this one is to open the page and look at it).

## Security alerts

Dependabot alerts and security updates are both enabled, and the Security tab is meant to sit at zero open alerts. That is a rule rather than tidiness: an open alert on a dependency listed under `ignore` makes the security-update job fail with `all_versions_ignored`, so an advisory that genuinely cannot be fixed (or, more honestly, cannot be fixed without breaking the admin) gets dismissed with a written reason instead of being left to rot.

Two react-router advisories are dismissed as tolerable risk rather than fixed, because their only fix is v7 and v7 blanks the admin router. They are development scope and do not reach the public site: `src/` never imports tinacms, and a verse page loads exactly two JavaScript files (Astro's client runtime and the annotation island), so everything TinaCMS drags in stays behind `/admin`. Reopen them the day TinaCMS supports react-router 7.

A warning if you go digging through TinaCMS's own versions: its package manifests do not contain any. The monorepo uses pnpm's catalog protocol, so a manifest reads `"graphiql": "catalog:"` while the real pin sits in the catalog block of TinaCMS's root `pnpm-workspace.yaml`. Reading the manifest on GitHub will understate how pinned things are every single time (the version string you are grepping for is simply not in that file). Read the catalog, or ask npm:

```sh
npm view @tinacms/app@latest dependencies --json
```

## Project structure

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

The Preact/React split is not an accident: everything under `src/` is Preact, everything under `tina/` is React, because TinaCMS insists on it (mixing the two is the `jsxImportSource` trap above).

## Commits

[Conventional Commits](https://www.conventionalcommits.org/), enforced by commitlint through a Husky hook.
