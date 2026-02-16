import { playwrightLauncher } from '@web/test-runner-playwright';
import { esbuildPlugin } from '@web/dev-server-esbuild';
import { defaultReporter } from '@web/test-runner';
import { jasmineTestRunnerConfig } from 'web-test-runner-jasmine';
import { bundlePerformancePlugin, renderPerformancePlugin, performanceReporter } from './dist/index.js';

export default /** @type {import("@web/test-runner").TestRunnerConfig} */ ({
  ...jasmineTestRunnerConfig(),
  concurrency: 1,
  concurrentBrowsers: 1,
  nodeResolve: true,
  testsFinishTimeout: 60000,
  testFramework: {
    config: {
      defaultTimeoutInterval: 60000,
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
  ],
  reporters: [
    defaultReporter({ reportTestResults: true, reportTestProgress: true }),
    performanceReporter({ writePath: `./dist/performance` })
  ]
});
