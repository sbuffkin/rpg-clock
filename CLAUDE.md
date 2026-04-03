# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Watch mode — bundles to main.js with inline sourcemaps
npm run build        # Type-check then bundle for production (no sourcemaps)
npm run lint         # ESLint across .js and .ts files
npm run version      # Bump version in manifest.json and versions.json
```

There are no tests.

## Architecture

This is an Obsidian plugin (TypeScript, bundled with esbuild into `main.js`). Entry point is `src/main.ts`.

**Clock syntax** parsed from markdown code blocks tagged `` ```clock ``:
```
ClockName:filled/total[:color]
```
Multiple lines in one block create multiple clocks. Color is optional (overrides the global setting).

**Key files:**
- `src/main.ts` — `RpgClock` plugin class; registers the `clock` markdown code block processor and the "Insert Clock" editor command; holds `pendingFocusLast` flag used to focus the name input after a new clock is added
- `src/clock.ts` — `Clock extends MarkdownRenderChild`; parses input, renders clock HTML using CSS custom properties (`--n`, `--i`, `--clock-color`, `--clock-size`); handles drag-to-reorder, delete, add, and color palette toggle
- `src/settings.ts` — `RpgClockSettings` (clockSize, clockColor, paletteColors); `SettingsTab` renders a clock-size slider, a default color picker, and a draggable/editable color palette editor
- `src/parse.ts` — `parseClocks` / `serializeClock`; pure functions with no Obsidian dependencies
- `src/commandInput.ts` — Modal for the "Insert Clock" command; prompts for a name and inserts a `clock` code block at cursor

**Settings shape:**
```ts
interface RpgClockSettings {
  clockSize: number;       // px, 60–300
  clockColor: Color;       // default color for new clocks
  paletteColors: Color[];  // ordered list of quick-select palette colors
}
```

**Clock grid layout:** `auto-fill` with `minmax(size+40px, 1fr)` — fills container width and reflows on resize, no manual column calculation.

**Section line thickness** scales with segment count via CSS: `--clock-border-thickness: clamp(1.5px, calc(24px / var(--n)), 4px)` on `.clock`.

**Add clock flow:** clicking an add-option button pushes a new `ClockDef` onto `this.clockDefs`, sets `plugin.pendingFocusLast = true`, then calls `writeAllClocks()`. The file write triggers Obsidian to re-render the block; `onload()` checks the flag and focuses the last name input via `setTimeout(0)`.

**Color palette:** each clock shows a hidden swatch row (`.clock-palette--hidden`) toggled by the color dot button. Picking a swatch applies the color, updates the source file, and hides the row again. Per-clock custom color pickers are intentionally removed — palette only.

**Build output:** esbuild bundles `src/main.ts` → `main.js` (CJS, ES2018 target). Obsidian and CodeMirror packages are marked external. `main.js` is what Obsidian loads directly from the plugin folder.

**Deployment:** The plugin folder itself (`rpg-clock/`) must be placed inside an Obsidian vault at `.obsidian/plugins/rpg-clock/`. The built `main.js`, `manifest.json`, and `styles.css` are the runtime files Obsidian needs.

**TypeScript config notes:**
- `moduleResolution: "bundler"` (not the deprecated `node`/`node10`)
- No `baseUrl` — use relative imports (`./clock`, `./settings`) throughout `src/`
