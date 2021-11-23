import { nodeResolve } from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import alias from '@rollup/plugin-alias';
import virtual from '@rollup/plugin-virtual';
import styles from 'rollup-plugin-styles';
import * as rollup from 'rollup';
import * as brotliSize from 'brotli-size';
import fs from 'fs-extra';

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

export function bundlePerformancePlugin(config) {
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

export function filesizePerformancePlugin() {
  return {
    name: 'filesize-performance-plugin',
    async executeCommand({ command, payload, session }) {
      return command === 'performance:filesize' ? await measureFileSize(session, payload.filepath) : null
    }
  }
}

export function performanceReporter(config: { writePath: string }) {
  return {
    stop() {
      const path = `${config.writePath}/report.json`;
      ensureFileSync(path);
      fs.writeJsonSync(path, store, { spaces: 2 });
    }
  };
}


/**
 * Measure the file size without any additional transformation suitable for testing already minified files
 * or compare them before any additional work is done on them.
 */
async function measureFileSize(session: any, filepath: string): Promise<{ kb: Number }>  {
  const { size } = fs.statSync(filepath)

  /**
   * Update report
   */
  store.bundleSizes.push({
    kb: size,
    testFile: session.testFile.replace(session.browser.config.rootDir, ''),
    compression: 'uncompressed',
    entrypoint: filepath
  });

  return { kb: size };
}

async function measureBundleSize(session: any, entrypoint: string, bundleConfig: BundleConfig = { }) {
  const config: BundleConfig = { writePath: null, optimize: false, external: [], aliases: [], ...bundleConfig };
  const rollupConfig = {
    inputOptions: {
      input: 'entry',
      external: config.external,
      plugins: [
        virtual({ entry: `${entrypoint.includes('import') ? entrypoint : `import '${entrypoint}';`};console.log('entrypoint')` }),
        styles({ minimize: config.optimize, mode: 'extract' }),
        nodeResolve(),
        alias({ entries: config.aliases }),
        config.optimize ? terser({ ecma: 2020, output: { comments: false }, compress: { unsafe: true, passes: 2 } }) : [],
      ],
    },
    outputOptions: {
      dir: `${config.writePath}/${session.id}.${Math.random().toString(36).substr(2, 9)}`,
      sourcemap: !!config.writePath
    },
  };

  const bundle = await rollup.rollup(rollupConfig.inputOptions);
  const { output } = await bundle.generate(rollupConfig.outputOptions);
  const code = output[0].code; // js
  const source = (output[1] as any)?.source; // css extraction if available
  const kb = brotliSize.sync(source ?? code) / 1000;

  if (!!config.writePath) {
    await bundle.write(rollupConfig.outputOptions);
  }

  await bundle.close();

  store.bundleSizes.push({
    kb,
    testFile: session.testFile.replace(session.browser.config.rootDir, ''),
    compression: 'brotli',
    entrypoint
  });

  return { kb };
}

function measureRenderTime(session, payload) {
  const testFile = session.testFile.replace(session.browser.config.rootDir, '')
  store.renderTimes.push({
    testFile,
    duration: payload.duration,
    average: payload.averages,
    iterations: payload.iterations,
  });
  return new Promise(r => r('reported'));
}
