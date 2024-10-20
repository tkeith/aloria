import {
  startChromiumBrowser,
  takeScreenshotAndGetBoundingBox,
} from "@/lib/browser";
import path from "path";
import fs from "fs";

async function main() {
  const { browser, context, page } = await startChromiumBrowser();

  try {
    await page.goto("https://www.expedia.com");
    console.log("Browser is open with iPhone user agent.");

    // Example usage of the new function
    const elementDescription = `the word "Flights" located in the top menu bar, second from the left, between "Stays" and "Cars"`;
    const { boundingBox, screenshot, screenshotWithBoundingBox } =
      await takeScreenshotAndGetBoundingBox(page, elementDescription);
    console.log("Bounding box for", elementDescription, ":", boundingBox);

    // save screenshotWithBoundingBox to img-history/bounding-box-{time}.png
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputPath = path.join(
      process.cwd(),
      "img-history",
      `bounding-box-${timestamp}.png`,
    );
    await fs.promises.writeFile(outputPath, screenshotWithBoundingBox);
    console.log(`Image with bounding box saved to: ${outputPath}`);

    // Keep the script running
    await new Promise(() => {
      // nothing
    });
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
