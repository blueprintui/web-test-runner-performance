import virtual from '@rollup/plugin-virtual';
import styles from 'rollup-plugin-styles';
import { rolldown } from 'rolldown';
import * as brotliSize from 'brotli-size';
import fs from 'fs-extra';
import path from 'node:path';

const { ensureFileSync } = fs;

const store = {
  renderTimes: [],
  bundleSizes: []
}

export interface BundleConfig {
  writePath?: string;
  external?: (string | RegExp)[];
  aliases?: { find: string | RegExp; replacement: string; }[],
  optimize?: boolean
}

export function bundlePerformancePlugin(config: BundleConfig) {
  return {
    name: 'bundle-performance-plugin',
    async executeCommand({ command, payload, session }) {
      return command === 'performance:bundle' ? await measureBundleSize(session, payload.bundle, { ...config, ...payload.config }) : null;
    }
  }
}

export function renderPerformancePlugin() {
  return {
    name: 'render-performance-plugin',
    async executeCommand({ command, payload, session }) {
      return command === 'performance:render' ? await measureRenderTime(session, payload) : null;
    }
  }
}

export function performanceReporter(config: { writePath: string }) {
  return {
    stop() {
      const reportPath = path.join(config.writePath, 'report.json');
      ensureFileSync(reportPath);
      fs.writeJsonSync(reportPath, store, { spaces: 2 });
      store.renderTimes = [];
      store.bundleSizes = [];
    }
  };
}

async function measureBundleSize(session: any, entrypoint: string, bundleConfig: BundleConfig = { }) {
  const config: BundleConfig = { writePath: null, optimize: true, external: [], aliases: [], ...bundleConfig };

  function aliasPlugin(aliases: BundleConfig['aliases']) {
    return {
      name: 'performance-alias',
      resolveId(source: string) {
        for (const entry of aliases) {
          const pattern = typeof entry.find === 'string' ? entry.find : entry.find.source.replace(/^\^/, '').replace(/\$$/, '');
          if (source === pattern || source.startsWith(pattern + '/')) {
            const resolved = source.replace(pattern, entry.replacement);
            return path.resolve(resolved);
          }
        }
        return null;
      }
    };
  }

  const rolldownConfig = {
    inputOptions: {
      input: 'entry',
      external: config.external,
      plugins: [
        virtual({ entry: `${entrypoint.includes('import') ? entrypoint : `import '${entrypoint}';`};console.log('entrypoint')` }),
        styles({ minimize: config.optimize, mode: 'extract' }),
        aliasPlugin(config.aliases),
      ],
    },
    outputOptions: {
      dir: `${config.writePath}/${session.id}.${Math.random().toString(36).substr(2, 9)}`,
      sourcemap: !!config.writePath,
      minify: config.optimize,
    },
  };

  const bundle = await rolldown(rolldownConfig.inputOptions);
  let kb: number;

  try {
    const { output } = await bundle.generate(rolldownConfig.outputOptions);
    const code = output[0].code; // js
    const cssAsset = output[1] && 'source' in output[1] ? output[1] : undefined; // css extraction if available
    const content = cssAsset ? String(cssAsset.source) : code;
    kb = brotliSize.sync(content) / 1000;

    if (config.writePath) {
      await bundle.write(rolldownConfig.outputOptions);
    }
  } finally {
    await bundle.close();
  }

  store.bundleSizes.push({
    kb,
    testFile: session.testFile.replace(session.browser.config.rootDir, ''),
    compression: 'brotli',
    entrypoint
  });

  return { kb };
}

function measureRenderTime(session: { testFile: string; browser: { config: { rootDir: string } } }, payload: { duration: number; average: number; iterations: number }) {
  const testFile = session.testFile.replace(session.browser.config.rootDir, '')
  store.renderTimes.push({
    testFile,
    duration: payload.duration,
    average: payload.average,
    iterations: payload.iterations,
  });
  return Promise.resolve('reported');
}
