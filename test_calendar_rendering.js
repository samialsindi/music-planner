const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Navigate to localhost 3001
  await page.goto('http://localhost:3001');

  // Wait for the calendar to load
  await page.waitForSelector('.rbc-calendar');

  // Take a screenshot of the calendar
  await page.screenshot({ path: '/home/jules/verification/calendar_arrows.png' });

  // Emulate mobile
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: '/home/jules/verification/calendar_arrows_mobile.png' });

  console.log('Screenshots saved to /home/jules/verification/');
  await browser.close();
})();
