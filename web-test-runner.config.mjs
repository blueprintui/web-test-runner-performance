import { playwrightLauncher } from '@web/test-runner-playwright';
import { esbuildPlugin } from '@web/dev-server-esbuild';
import { defaultReporter } from '@web/test-runner';
import { bundlePerformancePlugin, renderPerformancePlugin, performanceReporter, filesizePerformancePlugin } from './dist/lib/index.js';

export default /** @type {import("@web/test-runner").TestRunnerConfig} */ ({
  concurrency: 1,
  concurrentBrowsers: 1,
  nodeResolve: true,
  testsFinishTimeout: 60000,
  testFramework: {
    config: {
      ui: 'bdd',
      timeout: '60000',
    },
  },
  files: ['./src/*.performance.ts'],
  browsers: [playwrightLauncher({ product: 'chromium', launchOptions: { headless: !!process.env.GITHUB_ACTION } })],
  plugins: [
    esbuildPlugin({ ts: true, json: true, target: 'auto', sourceMap: true }),
    renderPerformancePlugin(),
    bundlePerformancePlugin({
      // optimize: false,
      // writePath: `./dist/performance`,
      aliases:  [{ find: /^demo-module$/, replacement: `./demo-module` }]
    }),
    filesizePerformancePlugin(),
  ],
  reporters: [
    defaultReporter({ reportTestResults: true, reportTestProgress: true }),
    performanceReporter({ writePath: `./dist/performance` })
  ]
});
