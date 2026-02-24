import assert from 'node:assert';
import { describe, it, beforeEach } from 'node:test';
import fs from 'fs-extra';
import path from 'node:path';
import { bundlePerformancePlugin, renderPerformancePlugin, performanceReporter } from './index.ts';

const defaultAliases = [{ find: /^demo-module$/, replacement: './demo-module' }];

function createSession(id: string) {
  return {
    id,
    testFile: '/src/test.performance.ts',
    browser: { config: { rootDir: '' } }
  };
}

describe('bundlePerformancePlugin', () => {
  it('should return a plugin with the correct name', () => {
    const plugin = bundlePerformancePlugin({});
    assert.strictEqual(plugin.name, 'bundle-performance-plugin');
  });

  it('should have an executeCommand method', () => {
    const plugin = bundlePerformancePlugin({});
    assert.strictEqual(typeof plugin.executeCommand, 'function');
  });

  it('should return null for non-matching commands', async () => {
    const plugin = bundlePerformancePlugin({});
    const result = await plugin.executeCommand({ command: 'other:command', payload: {}, session: {} });
    assert.strictEqual(result, null);
  });

  it('should measure JS bundle size for a demo module', async () => {
    const plugin = bundlePerformancePlugin({ aliases: defaultAliases });
    const result = await plugin.executeCommand({
      command: 'performance:bundle',
      payload: { bundle: 'demo-module/index.js', config: {} },
      session: createSession('test-js')
    });

    assert.ok(result, 'should return a result');
    assert.ok(typeof result.kb === 'number', 'should return kb as a number');
    assert.ok(result.kb > 0, 'bundle size should be greater than 0');
    assert.ok(result.kb < 5, 'bundle size should be reasonable (< 5kb)');
  });

  it('should measure CSS bundle size for a demo module', async () => {
    const plugin = bundlePerformancePlugin({ aliases: defaultAliases });
    const result = await plugin.executeCommand({
      command: 'performance:bundle',
      payload: { bundle: 'demo-module/index.css', config: {} },
      session: createSession('test-css')
    });

    assert.ok(result, 'should return a result');
    assert.ok(typeof result.kb === 'number', 'should return kb as a number');
    assert.ok(result.kb > 0, 'CSS bundle size should be greater than 0');
    assert.ok(result.kb < 1, 'CSS bundle size should be small');
  });

  it('should produce smaller output with optimize: true than optimize: false', async () => {
    const optimizedPlugin = bundlePerformancePlugin({ optimize: true, aliases: defaultAliases });
    const unoptimizedPlugin = bundlePerformancePlugin({ optimize: false, aliases: defaultAliases });

    const optimizedResult = await optimizedPlugin.executeCommand({
      command: 'performance:bundle',
      payload: { bundle: 'demo-module/index.js', config: {} },
      session: createSession('test-opt')
    });

    const unoptimizedResult = await unoptimizedPlugin.executeCommand({
      command: 'performance:bundle',
      payload: { bundle: 'demo-module/index.js', config: {} },
      session: createSession('test-no-opt')
    });

    assert.ok(optimizedResult.kb > 0, 'optimized size should be > 0');
    assert.ok(unoptimizedResult.kb > 0, 'unoptimized size should be > 0');
    assert.ok(optimizedResult.kb < unoptimizedResult.kb, 'optimized bundle should be smaller than unoptimized');
  });

  it('should support string aliases', async () => {
    const plugin = bundlePerformancePlugin({
      aliases: [{ find: 'demo-module', replacement: './demo-module' }]
    });

    const result = await plugin.executeCommand({
      command: 'performance:bundle',
      payload: { bundle: 'demo-module/index.js', config: {} },
      session: createSession('test-string-alias')
    });

    assert.ok(result, 'should return a result');
    assert.ok(result.kb > 0, 'bundle size should be greater than 0');
  });

  it('should allow per-test config overrides via payload', async () => {
    const plugin = bundlePerformancePlugin({
      optimize: true,
      aliases: defaultAliases
    });

    const result = await plugin.executeCommand({
      command: 'performance:bundle',
      payload: { bundle: 'demo-module/index.js', config: { optimize: false } },
      session: createSession('test-override')
    });

    assert.ok(result, 'should return a result');
    assert.ok(result.kb > 0, 'bundle size should be greater than 0');
  });

  it('should handle custom import statements in bundle path', async () => {
    const plugin = bundlePerformancePlugin({ aliases: defaultAliases });
    const result = await plugin.executeCommand({
      command: 'performance:bundle',
      payload: { bundle: "import 'demo-module/index.js'", config: {} },
      session: createSession('test-import-stmt')
    });

    assert.ok(result, 'should return a result');
    assert.ok(result.kb > 0, 'bundle size should be greater than 0');
  });

  it('should handle RegExp aliases without anchors', async () => {
    const plugin = bundlePerformancePlugin({
      aliases: [{ find: /demo-module/, replacement: './demo-module' }]
    });

    const result = await plugin.executeCommand({
      command: 'performance:bundle',
      payload: { bundle: 'demo-module/index.js', config: {} },
      session: createSession('test-regex-no-anchors')
    });

    assert.ok(result, 'should return a result');
    assert.ok(result.kb > 0, 'should handle regex without anchors');
  });

  it('should handle RegExp aliases with only start anchor', async () => {
    const plugin = bundlePerformancePlugin({
      aliases: [{ find: /^demo-module/, replacement: './demo-module' }]
    });

    const result = await plugin.executeCommand({
      command: 'performance:bundle',
      payload: { bundle: 'demo-module/index.js', config: {} },
      session: createSession('test-regex-start-anchor')
    });

    assert.ok(result, 'should return a result');
    assert.ok(result.kb > 0, 'should handle regex with start anchor only');
  });

  it('should write output files when writePath is provided', async () => {
    const writePath = './dist/test-output';

    const plugin = bundlePerformancePlugin({
      writePath,
      aliases: defaultAliases
    });

    const result = await plugin.executeCommand({
      command: 'performance:bundle',
      payload: { bundle: 'demo-module/index.js', config: {} },
      session: createSession('test-write')
    });

    assert.ok(result, 'should return a result');
    assert.ok(typeof result.kb === 'number', 'should return kb as a number');
    assert.ok(fs.existsSync(writePath), 'write path directory should exist');

    // Clean up
    fs.removeSync(writePath);
  });
});

describe('renderPerformancePlugin', () => {
  it('should return a plugin with the correct name', () => {
    const plugin = renderPerformancePlugin();
    assert.strictEqual(plugin.name, 'render-performance-plugin');
  });

  it('should have an executeCommand method', () => {
    const plugin = renderPerformancePlugin();
    assert.strictEqual(typeof plugin.executeCommand, 'function');
  });

  it('should return null for non-matching commands', async () => {
    const plugin = renderPerformancePlugin();
    const result = await plugin.executeCommand({ command: 'other:command', payload: {}, session: {} });
    assert.strictEqual(result, null);
  });

  it('should record render time data and return reported', async () => {
    const plugin = renderPerformancePlugin();
    const session = {
      testFile: '/src/test.performance.ts',
      browser: { config: { rootDir: '' } }
    };

    const result = await plugin.executeCommand({
      command: 'performance:render',
      payload: { duration: 25.5, average: 3, iterations: 1000 },
      session
    });

    assert.strictEqual(result, 'reported');
  });

  it('should strip rootDir from testFile path', async () => {
    const plugin = renderPerformancePlugin();
    const session = {
      testFile: '/home/user/project/src/test.performance.ts',
      browser: { config: { rootDir: '/home/user/project' } }
    };

    const result = await plugin.executeCommand({
      command: 'performance:render',
      payload: { duration: 10, average: 1, iterations: 500 },
      session
    });

    assert.strictEqual(result, 'reported');
  });
});

describe('store accumulation', () => {
  it('should accumulate bundle and render data in the report', () => {
    const writePath = './dist/test-accumulation';
    const reporter = performanceReporter({ writePath });
    reporter.stop();

    const reportPath = path.join(writePath, 'report.json');
    const report = fs.readJsonSync(reportPath);

    assert.ok(report.bundleSizes.length > 0, 'should have accumulated bundle sizes from prior tests');
    assert.ok(report.renderTimes.length > 0, 'should have accumulated render times from prior tests');

    for (const entry of report.bundleSizes) {
      assert.ok(typeof entry.kb === 'number', 'bundle entry should have kb as number');
      assert.ok(typeof entry.testFile === 'string', 'bundle entry should have testFile');
      assert.strictEqual(entry.compression, 'brotli', 'bundle entry should have brotli compression');
      assert.ok(typeof entry.entrypoint === 'string', 'bundle entry should have entrypoint');
    }

    for (const entry of report.renderTimes) {
      assert.ok(typeof entry.testFile === 'string', 'render entry should have testFile');
      assert.ok(typeof entry.duration === 'number', 'render entry should have duration');
      assert.ok(typeof entry.average === 'number', 'render entry should have average');
      assert.ok(typeof entry.iterations === 'number', 'render entry should have iterations');
    }

    fs.removeSync(writePath);
  });

  it('should reset the store after reporter.stop() is called', () => {
    const writePath = './dist/test-reset';
    const reporter = performanceReporter({ writePath });
    reporter.stop();

    const reportPath = path.join(writePath, 'report.json');
    const report = fs.readJsonSync(reportPath);

    assert.strictEqual(report.renderTimes.length, 0, 'store should be empty after prior stop() reset');
    assert.strictEqual(report.bundleSizes.length, 0, 'store should be empty after prior stop() reset');

    fs.removeSync(writePath);
  });
});

describe('performanceReporter', () => {
  const testWritePath = './dist/test-reporter';

  beforeEach(() => {
    if (fs.existsSync(testWritePath)) {
      fs.removeSync(testWritePath);
    }
  });

  it('should write a report JSON file on stop', () => {
    const reporter = performanceReporter({ writePath: testWritePath });
    reporter.stop();

    const reportPath = path.join(testWritePath, 'report.json');
    assert.ok(fs.existsSync(reportPath), 'report.json should exist');

    const report = fs.readJsonSync(reportPath);
    assert.ok(Array.isArray(report.renderTimes), 'should have renderTimes array');
    assert.ok(Array.isArray(report.bundleSizes), 'should have bundleSizes array');

    // Clean up
    fs.removeSync(testWritePath);
  });

  it('should create parent directories if they do not exist', () => {
    const deepPath = './dist/test-reporter/nested/deep';
    const reporter = performanceReporter({ writePath: deepPath });
    reporter.stop();

    const reportPath = path.join(deepPath, 'report.json');
    assert.ok(fs.existsSync(reportPath), 'report.json should exist in nested directory');

    const report = fs.readJsonSync(reportPath);
    assert.ok(report.renderTimes !== undefined, 'should have renderTimes');
    assert.ok(report.bundleSizes !== undefined, 'should have bundleSizes');

    // Clean up
    fs.removeSync('./dist/test-reporter');
  });

  it('should produce valid JSON with correct structure', () => {
    const reporter = performanceReporter({ writePath: testWritePath });
    reporter.stop();

    const reportPath = path.join(testWritePath, 'report.json');
    const raw = fs.readFileSync(reportPath, 'utf-8');

    // Should be valid JSON
    const report = JSON.parse(raw);
    assert.ok(report !== null && typeof report === 'object', 'should be a valid object');

    // Should be formatted with 2-space indentation
    assert.ok(raw.includes('  '), 'should have 2-space indentation');

    // Clean up
    fs.removeSync(testWritePath);
  });
});
