import { getElementBoundingBoxWithRetry } from "@/lib/screenshot-bounding-box";
import path from "path";
import { chromium, Browser, BrowserContext, Page } from "playwright";
import fs from "fs";

interface ChromiumOptions {
  userAgent?: string;
  width?: number;
  height?: number;
}

const iPhoneUserAgent =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1";

async function startChromiumBrowser(
  options: ChromiumOptions = {},
): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
  const browser = await chromium.launch({
    headless: process.env.IN_CODAPT_CONTAINER === "true",
  });

  const contextOptions = {
    viewport: {
      width: options.width || 500, // Default width set to 500
      height: options.height || 844, // Default height set to 844
    },
    userAgent: options.userAgent || iPhoneUserAgent,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  };

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  return { browser, context, page };
}

async function takeScreenshotAndGetBoundingBox(
  page: Page,
  elementDescription: string,
): Promise<{
  boundingBox: { ymin: number; xmin: number; ymax: number; xmax: number };
  screenshot: Buffer;
  screenshotWithBoundingBox: Buffer;
}> {
  const screenshot = await page.screenshot({ fullPage: false });
  const { boundingBox, screenshotWithBoundingBox } =
    await getElementBoundingBoxWithRetry({
      image: screenshot,
      elementDescription,
    });
  return { boundingBox, screenshot, screenshotWithBoundingBox };
}

export type { ChromiumOptions };
export { startChromiumBrowser, takeScreenshotAndGetBoundingBox };
