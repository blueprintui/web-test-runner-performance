import { playwrightLauncher } from '@web/test-runner-playwright';
import { esbuildPlugin } from '@web/dev-server-esbuild';
import { defaultReporter } from '@web/test-runner';
import { bundlePerformancePlugin, renderPerformancePlugin, performanceReporter } from './dist/lib/index.js';

export default /** @type {import("@web/test-runner").TestRunnerConfig} */ ({
  concurrency: 1,
  concurrentBrowsers: 1,
  nodeResolve: true,
  testsFinishTimeout: 20000,
  files: ['./src/*.performance.ts'],
  browsers: [playwrightLauncher({ product: 'chromium', launchOptions: { headless: false } })],
  plugins: [
    esbuildPlugin({ ts: true, json: true, target: 'auto', sourceMap: true }),
    renderPerformancePlugin(),
    bundlePerformancePlugin({
      // writePath: `./dist/performance`,
      aliases:  [{ find: /^test-module$/, replacement: `./test-module` }]
    }),
  ],
  reporters: [
    defaultReporter({ reportTestResults: true, reportTestProgress: true }),
    performanceReporter({ writePath: `./dist/performance` })
  ]
});
