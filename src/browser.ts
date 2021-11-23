import { executeServerCommand } from '@web/test-runner-commands';
import { TemplateResult, render, html } from 'lit';

export { html } from 'lit';

export async function testBundleSize(bundle: string, config: { optimize?: boolean, external?: (string | RegExp)[] } = { }) {
  return await executeServerCommand<any, any>('performance:bundle', { bundle, config });
}

export async function testFileSize(filepath) {
  return await executeServerCommand<any, any>('performance:filesize', { filepath } )
}

export async function testRenderTime(template: TemplateResult<1>, config: { iterations?: number, average?: number } = { }) {
  const conf = { iterations: 1, average: 3, ...config };
  let averages = [];

  for await (let result of averageRender(template, conf)) {
    averages.push(result);
  }

  const duration = averages.reduce((p, n) => p + n.entry.duration, 0) / conf.average;
  const result = { duration, iterations: config.iterations, average: config.average };
  await executeServerCommand<any, any>('performance:render', result);
  return result;
}

async function* averageRender(template: TemplateResult<1>, config: { iterations: number, average: number }) {
  let i = 0;
  while (i < config.average) {
    const element = document.createElement('div');
    element.setAttribute('performance', '');
    document.body.appendChild(element);
    render(html`${Array.from(Array(config.iterations).keys()).map(() => template)}`, element);
    const detail: any = await measureElementRender(element);
    element.remove();
    i++;
    yield detail;
  }
}

export function measureElementRender(element: HTMLElement, markId = `_${Math.random().toString(36).substr(2, 9)}`) {
  return new Promise(resolve => {
    performance.mark(`${markId}-start`);

    const observer = new ResizeObserver(async (mutation) => {
      const { width, height } = mutation[0].contentRect;
      if (width > 0 && height > 0) {
        observer.disconnect();
        await new Promise(r => setTimeout(() => r('')));
        performance.mark(`${markId}-end`);
        performance.measure(markId, `${markId}-start`, `${markId}-end`);
  
        const entry = performance.getEntriesByName(markId).pop();
        const duration = Number.parseFloat(entry.duration.toPrecision(5));
        const detail = { entry: { ...entry, duration } };
  
        performance.clearMarks(`${markId}-start`);
        performance.clearMarks(`${markId}-end`);
        performance.clearMeasures(markId);
        resolve(detail);
      }
    });

    observer.observe(element);
  });
}
