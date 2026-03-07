const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Navigate to localhost 3001
  await page.goto('http://localhost:3001');

  // Wait for the gantt chart to load
  await page.waitForSelector('.gantt');

  // Take a screenshot of the gantt chart
  await page.screenshot({ path: '/home/jules/verification/gantt_yearly.png' });

  console.log('Screenshot saved to /home/jules/verification/');
  await browser.close();
})();
