# CLAUDE.md

## Project Overview

RHYMOTEK is an interactive rap lyrics analysis website. Verses are stored as JSON with word-level annotation data. The public site renders these annotations using rough-notation (highlights), leader-line-new (arrows), and d3-force (node positioning). Authors create and edit annotations through a visual WYSIWYG editor in the TinaCMS admin panel.

## Commands

- `npm run dev` -- start TinaCMS + Astro dev server (port 4321, CMS admin at /admin)
- `npm run dev:astro` -- start Astro only (no CMS)
- `npm run build` -- full production build: `tinacms build && astro build && npx pagefind --site dist/client`
- `npx playwright test` -- run E2E tests (requires `npx playwright install --with-deps chromium` first)
- `npx astro check` -- TypeScript type checking

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

**Important**: TinaCMS editor components must use **React** (not Preact). Files require the `/** @jsxImportSource react */` pragma because Astro's default JSX transform targets Preact. TinaCMS's Vite prebuild compiles these into `tina/__generated__/config.prebuild.jsx`.

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

## Conventions

- Commits follow Conventional Commits (enforced by commitlint + Husky)
- TypeScript throughout; shared types in `src/lib/types.ts`, editor types in `tina/fields/editor/types.ts`
- Preact for public site components, React for TinaCMS admin components
- Node.js >= 22.12.0 required
