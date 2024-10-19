import { getElementBoundingBox } from '@/lib/screenshot-bounding-box';
import path from 'path';
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import fs from 'fs';

interface ChromiumOptions {
  userAgent?: string;
  width?: number;
  height?: number;
}

const iPhoneUserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1';

async function startChromiumBrowser(options: ChromiumOptions = {}): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
  const browser = await chromium.launch({ headless: false });

  const contextOptions = {
    viewport: {
      width: options.width || 500,  // Default width set to 500
      height: options.height || 844  // Default height set to 844
    },
    userAgent: options.userAgent || iPhoneUserAgent,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  };

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  return { browser, context, page };
}

async function takeScreenshotAndGetBoundingBox(
  page: Page,
  elementDescription: string
): Promise<{ boundingBox: { ymin: number; xmin: number; ymax: number; xmax: number }; screenshot: Buffer; screenshotWithBoundingBox: Buffer }> {
  const screenshot = await page.screenshot({ fullPage: false });
  const { boundingBox, screenshotWithBoundingBox } = await getElementBoundingBox({ image: screenshot, elementDescription });
  return { boundingBox, screenshot, screenshotWithBoundingBox };
}

async function main() {
  const { browser, context, page } = await startChromiumBrowser();

  try {
    await page.goto('https://www.expedia.com');
    console.log('Browser is open with iPhone user agent.');

    // Example usage of the new function
    const elementDescription = `the word "Flights" located in the top menu bar, second from the left, between "Stays" and "Cars"`;
    const { boundingBox, screenshot, screenshotWithBoundingBox } = await takeScreenshotAndGetBoundingBox(page, elementDescription);
    console.log('Bounding box for', elementDescription, ':', boundingBox);

    // save screenshotWithBoundingBox to img-history/bounding-box-{time}.png
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(process.cwd(), 'img-history', `bounding-box-${timestamp}.png`);
    await fs.promises.writeFile(outputPath, screenshotWithBoundingBox);
    console.log(`Image with bounding box saved to: ${outputPath}`);

    // Keep the script running
    await new Promise(() => {});
  } finally {
    await browser.close();
  }
}

main().catch(console.error);

export type { ChromiumOptions };
export { startChromiumBrowser, takeScreenshotAndGetBoundingBox };
