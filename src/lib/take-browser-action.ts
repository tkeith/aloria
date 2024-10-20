import { BrowserAction } from "@/lib/get-browser-action";
import { twoPassGetElementBoundingBox } from "@/lib/screenshot-bounding-box";
import { ParsedJson } from "@/lib/utils";
import assert from "assert";
import { Browser, Page } from "playwright";

export type HistoricalAction = {
  startingScreenshot: Buffer;
  action: BrowserAction;
  actionDescription: string;
  screenshotWithBoundingBox: Buffer | null;
  screenshotAfterAction: Buffer;
};

export async function takeBrowserAction(opts: {
  action: BrowserAction;
  actionDescription: string;
  browser: Browser;
  page: Page;
  screenshot: Buffer | null;
  gotScreenshotAt: Date;
  onStepUpdated?: (opts: {
    actionJson?: ParsedJson;
    actionDescription?: string;
    startingScreenshot?: Buffer;
    annotatedScreenshot?: Buffer;
  }) => Promise<void>;
}): Promise<HistoricalAction> {
  let screenshotWithBoundingBox: Buffer | null = null;

  const { action, browser, page } = opts;

  if (action.type === "goto_url") {
    await page.goto(action.url);
  } else if (action.type === "click") {
    assert(opts.screenshot !== null);

    console.log(
      `Figuring out where to click for element: ${action.element_description}`,
    );

    const {
      boundingBox,
      screenshotWithBoundingBox: screenshotWithBoundingBox_,
      // } = await getElementBoundingBox({
    } = await twoPassGetElementBoundingBox({
      image: opts.screenshot,
      elementDescription: action.element_description,
    });

    screenshotWithBoundingBox = screenshotWithBoundingBox_;

    if (opts.onStepUpdated) {
      await opts.onStepUpdated({
        annotatedScreenshot: screenshotWithBoundingBox,
      });
    }

    const { xmin, ymin, xmax, ymax } = boundingBox; // fractions

    // calculate the center of the bounding box
    const centerX = (xmin + xmax) / 2; // this is still a fraction
    const centerY = (ymin + ymax) / 2; // this is still a fraction

    // get the bottom right x/y (the maximum possible coordinates to click)
    const viewportSize = page.viewportSize();
    assert(viewportSize !== null);
    const clickX = viewportSize.width * centerX;
    const clickY = viewportSize.height * centerY;

    // click there
    await page.mouse.click(clickX, clickY);
  } else if (action.type === "type_characters") {
    await page.keyboard.type(action.characters, { delay: 100 });
  } else if (action.type === "scroll") {
    await page.mouse.wheel(0, (action.direction === "up" ? -1 : 1) * 400);
  } else if (action.type === "press_special_key") {
    await page.keyboard.press(action.key);
  } else if (action.type === "wait_seconds") {
    const timeToWait =
      action.seconds - (Date.now() - opts.gotScreenshotAt.getTime()) / 1000;
    await new Promise((resolve) => setTimeout(resolve, timeToWait * 1000));
  } else {
    action satisfies never;
    throw new Error("Unknown action type");
  }

  await new Promise((resolve) => setTimeout(resolve, 1500));

  return {
    startingScreenshot: opts.screenshot!,
    action: opts.action,
    actionDescription: opts.actionDescription,
    screenshotWithBoundingBox,
    screenshotAfterAction: await page.screenshot({ fullPage: false }),
  };
}
