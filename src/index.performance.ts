import { testBundleSize, testRenderTime, html } from '../dist/browser.js';

describe('performance', () => {
  it('should meet maximum css bundle size limits (0.08kb brotli)', async () => {
    expect((await testBundleSize('demo-module/index.css')).kb).toBeLessThan(0.08);
  });

  it('should meet maximum js bundle size limits (0.8kb brotli)', async () => {
    expect((await testBundleSize('demo-module/index.js')).kb).toBeLessThan(0.8);
  });

  it('should meet maximum render time 1000 <p> below 50ms', async () => {
    const result = await testRenderTime(html`<p>hello world</p>`, { iterations: 1000, average: 10 });
    expect(result.duration).toBeLessThan(50);
  });
});
