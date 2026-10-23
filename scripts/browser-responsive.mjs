import fs from 'node:fs';
import { connectPage } from './cdp.mjs';

const origin = process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:5187';
const page = await connectPage();
const results = [];
try {
  await page.call('Page.navigate', { url: origin + '/welcome' });
  await page.waitFor("!!document.querySelector('#hero-q')");
  for (const route of ['/welcome', '/about', '/how-it-works', '/pricing', '/for-business', '/contact', '/help', '/developers/docs', '/signin', '/signup']) {
    await page.evaluate(`history.pushState({},'',${JSON.stringify(route)});dispatchEvent(new PopStateEvent('popstate'));`);
    await page.waitFor("!!document.querySelector('h1')");
    await new Promise(resolve => setTimeout(resolve, 400));
    const widths = route === '/welcome' ? [320, 360, 375, 390, 414, 768, 1024, 1440] : [320, 390, 768, 1440];
    for (const width of widths) {
      await page.call('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true });
      await new Promise(resolve => setTimeout(resolve, 100));
      const measurement = await page.evaluate(`({route:location.pathname,width:${width},viewport:innerWidth,content:document.documentElement.scrollWidth,client:document.documentElement.clientWidth})`);
      measurement.pass = measurement.content <= width + 1 && measurement.content <= measurement.client + 1;
      results.push(measurement);
      if (!measurement.pass) throw new Error('Horizontal overflow: ' + JSON.stringify(measurement));
      if (route === '/welcome' && width === 375) {
        const tabsFit = await page.evaluate("(()=>{const tabs=document.querySelector('[role=radiogroup]');return tabs.scrollWidth>tabs.clientWidth&&tabs.getBoundingClientRect().right<=innerWidth;})()");
        if (!tabsFit) throw new Error('Check-type scrolling escaped its card');
        await page.evaluate("document.querySelector('[aria-label=\"Open menu\"]').click()");
        await page.waitFor("!!document.querySelector('[role=dialog]')");
        const menuFits = await page.evaluate("(()=>{const r=document.querySelector('[role=dialog]').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1;})()");
        if (!menuFits) throw new Error('Mobile navigation does not fit');
        await page.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
        await page.waitFor("!document.querySelector('[role=dialog]')");
        fs.mkdirSync('.tmp/ui-responsive', { recursive: true });
        const shot = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        fs.writeFileSync('.tmp/ui-responsive/welcome-375.png', Buffer.from(shot.data, 'base64'));
      }
    }
  }
  console.log(JSON.stringify({ responsiveMeasurements: results.length, pass: true, mobileMenu: true, containedCheckTabs: true }));
} finally {
  fs.mkdirSync('.tmp/ui-responsive', { recursive: true });
  fs.writeFileSync('.tmp/ui-responsive/results.json', JSON.stringify(results, null, 2));
  await page.call('Page.close').catch(() => {});
  page.disconnect();
}
