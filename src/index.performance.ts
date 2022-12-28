import { expect } from '@esm-bundle/chai';
import { testBundleSize, testRenderTime, html } from '../dist/lib/browser.js';

describe('performance', () => {
  it('should meet maximum css bundle size limits (0.03kb brotli)', async () => {
    expect((await testBundleSize('demo-module/index.css')).kb).to.below(0.03);
  });

  it('should meet maximum js bundle size limits (0.8kb brotli)', async () => {
    expect((await testBundleSize('demo-module/index.js')).kb).to.below(0.8);
  });

  it('should meet maximum render time 1000 <p> below 50ms', async () => {
    const result = await testRenderTime(html`<p>hello world</p>`, { iterations: 1000, average: 10 });
    expect(result.duration).to.below(50);
  });
});
