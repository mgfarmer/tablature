# Tablature

Intelligent tab manager for Chromium browsers built with Manifest V3.

## What it does right now

- Tracks "attention time" using tab activation, window focus, idle state, and automatic persistence so only meaningful time-on-tab is counted.
- Scores every open tab with a weighted heuristic (active seconds, visit count, and recency decay) and exposes the ranked list to the popup.
- Groups high-priority tabs into a red "🔥 Priority" Chrome Tab Group (via the command palette or popup button) so you can yank focus back in one click.
- Shows a live popup with gradients + favicons, optional domain aggregation, and a "Previous Sessions" rail that remembers recently important tabs even after they close.
- Ships an options page where you can tune the idle threshold, max ranked tabs, historical depth, domain grouping toggle, and (future) visual cue support.

## Project layout

```
├── src/                  # TypeScript sources bundled via esbuild
│   ├── background/       # Telemetry + prioritization service worker
│   ├── popup/            # Live popup UI + preview shims
│   ├── options/          # Settings form wired to chrome.storage.sync
│   └── shared/           # Types, constants, and utility helpers
├── static/               # Manifest + static HTML/CSS copied during builds
├── scripts/build.mjs     # esbuild + chokidar build pipeline
├── dist/                 # Output (git-ignored)
└── .vscode/              # Tasks + launch config wired for debugging
```

## Prerequisites

- Node.js 20+
- Chromium-based browser (Chrome 121+, Edge, Arc, etc.)
- VS Code 1.109+ so you can use the new [Integrated Browser preview](https://code.visualstudio.com/updates/v1_109#_integrated-browser-preview) that keeps debugging inside the editor.

## Install & build

```bash
npm install             # first-time dependency install
npm run build           # one-off production build to dist/
npm run dev             # watch mode with esbuild + chokidar
```

## Loading the extension in a browser

1. Run `npm run build` (or keep `npm run dev` running in another terminal).
2. Visit `chrome://extensions` (or `edge://extensions`) and enable Developer Mode.
3. Use **Load unpacked** and select the `dist/` folder.
4. Pin the action if you want quick access to the popup dashboard.

## Debugging with VS Code

The workspace ships with:

- `.vscode/settings.json` enabling VS Code's **Integrated Browser** so you can open `dist/popup.html` right inside the editor with full DevTools, taking advantage of the latest 1.109 release.
- `.vscode/launch.json` configuration named **“Tablature: Launch Edge with Extension”** that runs Microsoft Edge with `--load-extension` pointed at `dist/` and opens `chrome://extensions` so you can inspect background logs and popup scripts using js-debug.
- `.vscode/tasks.json` tasks for `npm: build` (one-shot) and `npm: dev` (background watch).

Suggested workflow:

1. Run the **npm: dev** task (or `npm run dev`) to keep `dist/` updated.
2. Use the VS Code command palette → **Browser: Open Integrated Browser** to preview UI-only changes (the popup switches to preview mode automatically when `chrome` APIs are unavailable).
3. Start the **Tablature: Launch Edge with Extension** debug configuration to step through the service worker, popup, and content scripts with the new integrated DevTools flow.

## Chrome API & Manifest status

- Manifest V3 with an ES module service worker (`background.js`).
- Permissions: `tabs`, `tabGroups`, `storage`, `idle`, and `alarms` so we can listen to activation/focus, pause when idle, and flush data frequently.
- Minimum Chromium version set to 121 to stay aligned with the latest MV3 requirements.

## Next up

- Ship the optional visual-cue content script that badges the top-ranked tabs.
- Harden persistence + reset flows (e.g., pruning stale telemetry, exporting/importing attention history).
- Add lightweight analytics/telemetry visualization inside the popup (sparklines, streak counters, etc.).
