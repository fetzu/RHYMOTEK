# CLAUDE.md

## Project Overview

RHYMOTEK is an interactive rap lyrics analysis website. Verses are stored as JSON with word-level annotation data. The public site renders these annotations using rough-notation (highlights), leader-line-new (arrows), and d3-force (node positioning). Authors create and edit annotations through a visual WYSIWYG editor in the TinaCMS admin panel.

## Commands

This project uses **pnpm**. There is no `package-lock.json` -- running `npm install` resolves a different tree than the committed `pnpm-lock.yaml` and will break the build. Use `pnpm exec`, not `npx`.

- `pnpm run dev` -- start TinaCMS + Astro dev server (port 4321, CMS admin at /admin)
- `pnpm run dev:astro` -- start Astro only (no CMS)
- `pnpm run build` -- full production build: `tinacms build && astro build && pnpm exec pagefind --site dist/client`
- `pnpm exec playwright test` -- run E2E tests (requires `pnpm exec playwright install --with-deps chromium` first)
- `pnpm exec astro check` -- TypeScript type checking

CI runs `pnpm install --frozen-lockfile`, so `package.json` and `pnpm-lock.yaml` must stay in sync. After changing dependencies, run `pnpm install` and commit the updated lockfile.

## Architecture

### Rendering Split: Astro (SSG) + Preact (Islands)

Pages are Astro components rendered at build time. Interactive parts use Preact islands hydrated on the client. The key boundary:

- `src/pages/verse/[slug].astro` -- server-rendered page, passes verse data as props
- `src/components/VerseInteractive.tsx` -- Preact island (`client:load`), handles click interactions, annotation lifecycle
- `src/components/AnalysisNode.tsx` -- Preact component for analysis bubble rendering

### Content Model

Verses live in `src/content/verses/*.json`, managed by TinaCMS. Each verse contains:

- Metadata: slug, title, artist, album, year, tags
- Styling: backgroundColor, textColor, accentColor (hex colors)
- Text: `lines[]` array of `{ lineIndex, words: [{ wordId, text }] }`
- Annotations: `analysisGroups[]` array (see below)

**Word IDs** follow the pattern `w-{lineIndex}-{wordIndex}` (e.g., `w-0-5` is line 0, word 5).

**Analysis Groups** are the core data model:
```
{
  id, label,
  triggerWordIds[]     -- clicking these activates the group
  highlightWordIds[]   -- these get annotated (circled/underlined/etc)
  highlightType        -- "circle" | "underline" | "box" | "highlight"
  connections[]        -- { from: wordId, to: wordId, label? }
  nodes[]              -- { id, type, content, anchorWordId, position: { angle, distance } }
}
```

Node positions use **polar coordinates** (angle in degrees, distance in pixels) relative to their anchor word.

### Annotation Libraries (Public Site)

- `src/lib/annotations.ts` -- wraps rough-notation: creates annotation groups, applies highlight types, handles show/hide lifecycle
- `src/lib/arrows.ts` -- wraps leader-line-new: draws SVG arrows between word elements, manages cleanup
- `src/lib/mindmap.ts` -- wraps d3-force: positions analysis nodes using physics simulation, converts polar to cartesian

### TinaCMS Custom Field (Admin)

The `analysisGroups` field uses a custom React component instead of TinaCMS's default list UI:

- `tina/fields/AnnotationEditor.tsx` -- entry point, registered via `ui: { component }` in tina/config.ts
- `tina/fields/editor/EditorModal.tsx` -- full-screen modal (React portal), injects CSS at runtime
- `tina/fields/editor/VerseCanvas.tsx` -- renders verse as clickable word spans
- `tina/fields/editor/GroupPanel.tsx` -- left sidebar, group list management
- `tina/fields/editor/GroupDetail.tsx` -- right panel, selected group editor
- `tina/fields/editor/PreviewMode.tsx` -- live preview using actual annotation libs
- `tina/fields/editor/useEditorState.ts` -- useReducer with undo/redo history
- `tina/fields/editor/types.ts` -- editor-specific TypeScript types

**Important**: TinaCMS editor components must use **React** (not Preact). React is now the JSX default project-wide (see JSX runtime below), so these files do not strictly need the `/** @jsxImportSource react */` pragma any more -- they still carry it, which is harmless and explicit. TinaCMS's Vite prebuild compiles them into `tina/__generated__/config.prebuild.jsx`.

**CSS caveat**: TinaCMS generates `tina/__generated__/config.prebuild.css` from CSS modules but does NOT inject it into the admin page. The editor injects its own CSS via a `<style>` tag at runtime (see `EDITOR_CSS` in EditorModal.tsx).

### Routing

- `/` -- home page, lists all verses
- `/verse/[slug]` -- verse detail page with interactive annotations
- `/artist/[artist]` -- verses filtered by artist
- `/tag/[tag]` -- verses filtered by tag
- `/search` -- Pagefind search UI
- `/random` -- redirects to a random verse
- `/feed.xml` -- RSS feed
- `/admin` -- TinaCMS admin interface (hash-routed SPA)

### Styling

- Tailwind CSS 4 via Vite plugin (not PostCSS)
- Typography plugin for prose styling
- Fonts: Space Grotesk (display), Inter (body) -- loaded from Google Fonts
- Each verse defines its own backgroundColor, textColor, accentColor
- TinaCMS editor uses CSS Modules (`styles.module.css`) compiled to `styles_` prefixed classes

## Dependencies

**pnpm settings live in `pnpm-workspace.yaml`, not `package.json`.** pnpm ignores npm's top-level `overrides` field entirely, so security pins placed there have no effect. `overrides` and `allowBuilds` both belong in `pnpm-workspace.yaml`.

**Anything `tina/fields/**` imports must be declared in `package.json`.** Those files import `react`, `react-dom` and `react-final-form` directly. npm's flat `node_modules` hoisted them; pnpm's strict layout does not, and `tinacms build` fails with "Could not resolve".

### Upgrades that break the CMS without failing CI

TinaCMS pins several of its own dependencies. Bumping past those pins breaks `/admin` at **runtime only** -- `tinacms build` and `astro check` still pass, so CI does not catch any of these. Do not apply them, even though they look routine:

| Package | Constraint | Failure |
|---|---|---|
| `react-router` / `react-router-dom` | tinacms needs `^6.30.3` | v7+ makes the admin router match no routes; `/admin` renders blank |
| `react-final-form` | tinacms pins `final-form` to exactly `4.20.10` | v7 needs `final-form ^5`, so two copies coexist and `useFormState()` in AnnotationEditor loses TinaCMS's form context |
| `esbuild` | TinaCMS bundles with Vite 4 | 0.28+ cannot transform its legacy browser target; the pin is scoped to `>=0.25` to leave TinaCMS's copies alone |

These are listed under `ignore` in `.github/dependabot.yml`. Dependabot alerts are on, but security *updates* are disabled -- every open advisory is transitive under TinaCMS with no resolvable fix, and none reach the public site.

## JSX Runtime (do not change without reading this)

**`jsxImportSource` in the root `tsconfig.json` must stay `"react"`.**

The TinaCMS CLI runs its own Vite from the project root and resolves JSX options from the root `tsconfig.json`, then applies them to TinaCMS's own sources under `node_modules`. `include`/`exclude` does **not** scope this -- adding `node_modules` to `exclude` changes nothing.

Setting it to `"preact"` compiles `@tinacms/app`'s `main.tsx` with Preact's jsx runtime while that file calls React's `createRoot`:

```js
import { jsxDEV } from ".../preact/jsx-runtime/..."   // Preact
root.render(jsxDEV(React.StrictMode, { children: jsxDEV(App, {}) }))  // -> React DOM
```

React throws `Objects are not valid as a React child (found: object with keys {type, props, key, ref, __k, __, __b, __e, __c, ...})` -- those underscore keys are Preact VNode internals -- unmounts the tree, and leaves `#root` empty. `/admin` renders blank in dev **and** in the production bundle.

That error only reaches `window.onerror` during React's commit phase, so the browser console looks clean and the page simply sits blank. `tinacms build` and `astro check` both still exit 0 while emitting a broken admin bundle, so CI does not catch it either.

Consequently the public site's Preact components opt in per file:

- `src/components/AnalysisNode.tsx` and `src/components/VerseInteractive.tsx` start with `/** @jsxImportSource preact */`
- **any new `.tsx` under `src/` that renders Preact JSX needs that pragma too**

To verify a change here, load `/admin` in a browser and confirm the Verses collection lists files -- a build that exits 0 proves nothing.

## Deployment Config

`nodejs_compat` must stay in `compatibility_flags` in `wrangler.jsonc` -- SSR imports Node built-ins and fails to resolve them otherwise. Wrangler ignores `wrangler.toml` completely whenever a `wrangler.jsonc` exists, so the flag belongs in the `.jsonc`.

## Conventions

- Commits follow Conventional Commits (enforced by commitlint + Husky)
- TypeScript throughout; shared types in `src/lib/types.ts`, editor types in `tina/fields/editor/types.ts`
- Preact for public site components, React for TinaCMS admin components
- Node.js >= 22.12.0 required; pnpm version is pinned via `packageManager` in `package.json`
