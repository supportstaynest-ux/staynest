const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', error => console.error(`[Browser Error] ${error.message}`));
  
  console.log('Navigating to http://localhost:5173/#/auth...');
  await page.goto('http://localhost:5173/#/auth', { waitUntil: 'networkidle' });
  
  await new Promise(r => setTimeout(r, 3000)); // Wait a few more seconds
  
  console.log('Done capturing logs.');
  await browser.close();
})();
