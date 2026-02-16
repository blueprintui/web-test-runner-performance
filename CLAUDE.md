# CLAUDE.md - Project Memory

## Project Overview

**web-test-runner-performance** is a performance testing library for [Web Test Runner](https://modern-web.dev/docs/test-runner/overview/) that provides plugins to measure UI performance metrics.

### Core Exports

- **`bundlePerformancePlugin`** (`src/index.ts`): Server-side plugin that measures JS/CSS bundle sizes using rolldown with Brotli compression. Accepts config for `writePath`, `external`, `aliases`, and `optimize`.
- **`renderPerformancePlugin`** (`src/index.ts`): Server-side plugin that measures UI component render performance in milliseconds.
- **`performanceReporter`** (`src/index.ts`): Custom reporter that writes performance results (render times + bundle sizes) to a JSON file.
- **`testBundleSize`** (`src/browser.ts`): Browser-side API to trigger bundle size measurement from tests.
- **`testRenderTime`** (`src/browser.ts`): Browser-side API to measure rendering performance using lit templates and ResizeObserver/Performance API.
- **`html`** (`src/browser.ts`): Re-exported lit html template tag.

### Project Structure

```
src/
  index.ts              # Server-side plugins (bundlePerformancePlugin, renderPerformancePlugin, performanceReporter)
  browser.ts            # Browser-side test utilities (testBundleSize, testRenderTime)
  index.spec.ts         # Integration tests (18 tests, run with node:test + tsx)
  index.performance.ts  # Self-test performance suite (browser-based, uses Playwright)
  types.d.ts            # Module declarations
demo-module/            # Demo module used for bundle size testing
  index.js, module.js, index.css
```

### Build & Test

- **Build**: `npm run build` — TypeScript 6.0 beta compilation to `./dist/`
- **Integration tests**: `npm run test:integration` — 18 Node.js tests via `node --import tsx --test`
- **Performance tests**: `npm run test` — Web Test Runner with Playwright (Chromium)
- **CI**: `npm run ci` — clean → build → test:integration → test
- Tests import from `./dist/` so build must run before test.

### Key Architecture

- The performance tests (`*.performance.ts`) run in the browser via Web Test Runner
- Browser code communicates with server plugins via `@web/test-runner-commands` (`executeServerCommand`)
- Bundle measurement: creates a virtual entry → bundles with rolldown → measures brotli-compressed size
- Render measurement: renders lit templates → uses ResizeObserver for first paint detection → uses Performance API for timing
- Alias resolution uses a custom `resolveId`-based plugin that converts `{ find, replacement }[]` config to path.resolve()-based lookups, supporting both string and RegExp find patterns

### Dependencies

- **Bundler**: rolldown ^1.0.0-rc.4 (Rust-based Rollup-compatible bundler, replaces rollup)
- **Virtual modules**: @rollup/plugin-virtual (compatible with rolldown)
- **CSS extraction**: rollup-plugin-styles (compatible with rolldown)
- **TypeScript**: 6.0.0-beta (target: es2022, moduleResolution: bundler)
- **Browser testing**: @web/test-runner ^0.20.2 + @web/test-runner-playwright ^0.11.1
- **Template rendering**: lit ^3.3.2
- **Compression**: brotli-size ^4.0.0
- **Test runner (integration)**: tsx ^4.21.0 + node:test

### Migration Notes (rollup → rolldown)

- `rollup.rollup()` replaced with `rolldown()` from `'rolldown'`
- `@rollup/plugin-node-resolve` removed — rolldown has built-in node resolution
- `@rollup/plugin-terser` removed — rolldown uses `output.minify` option
- `@rollup/plugin-alias` removed — custom inline plugin using `resolveId` hook with `path.resolve()` for proper virtual module resolution
- `rollup-plugin-styles` and `@rollup/plugin-virtual` are rollup plugins that remain compatible with rolldown
- The `cssnano` override for `rollup-plugin-styles` is still needed (pinned to 6.1.2)

### Notes

- Performance tests run with concurrency=1 for accurate measurements
- The `optimize` flag controls rolldown's built-in minification and CSS minimization via rollup-plugin-styles
- Bundle sizes are reported in KB after Brotli compression
- TS 6.0 deprecated `baseUrl` — removed from tsconfig.json (paths work without it with moduleResolution: bundler)
