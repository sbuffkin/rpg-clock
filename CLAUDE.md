# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Watch mode — bundles to main.js with inline sourcemaps
npm run build        # Type-check then bundle for production (no sourcemaps)
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
- `src/main.ts` — `RpgClock` plugin class; registers the `clock` markdown code block processor and the "Insert Clock" editor command
- `src/clock.ts` — `Clock extends MarkdownRenderChild`; parses input, generates clock HTML using CSS custom properties (`--n`, `--i`, `--clock-color`); slices and bars are separate DOM elements controlled by CSS
- `src/settings.ts` — `RpgClockSettings` (clockSize, clockColor); `SettingsTab` calls `palette.refresh()` on all active clocks when settings are saved
- `src/commandInput.ts` — Modal for the "Insert Clock" command; prompts for a name and inserts a `clock` code block at cursor

**Build output:** esbuild bundles `src/main.ts` → `main.js` (CJS, ES2018 target). Obsidian and CodeMirror packages are marked external. `main.js` is what Obsidian loads directly from the plugin folder.

**Deployment:** The plugin folder itself (`rpg-clock/`) must be placed inside an Obsidian vault at `.obsidian/plugins/rpg-clocks/`. The built `main.js`, `manifest.json`, and `styles.css` are the runtime files Obsidian needs.
