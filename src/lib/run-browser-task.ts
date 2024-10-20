import { startChromiumBrowser } from "@/lib/browser";
import { getNextAction } from "@/lib/get-browser-action";
import { HistoricalAction, takeBrowserAction } from "@/lib/take-browser-action";
import { ParsedJson } from "@/lib/utils";
import assert from "assert";
import * as fs from "fs";

export async function runBrowserTask({
  task,
  userContext,
  onStepStarted,
  onStepUpdated,
}: {
  task: string;
  userContext?: string;
  onStepStarted?: () => Promise<void>;
  onStepUpdated?: (opts: {
    actionJson?: ParsedJson;
    actionDescription?: string;
    startingScreenshot?: Buffer;
    annotatedScreenshot?: Buffer;
    endingScreenshot?: Buffer;
  }) => Promise<void>;
}): Promise<{
  history: HistoricalAction[];
  result: string;
}> {
  const { browser, page } = await startChromiumBrowser();
  const history: HistoricalAction[] = [];

  const number_of_actions = 50;
  while (true) {
    if (history.length >= number_of_actions) {
      throw new Error("Number of actions exceeded.");
    }

    let currentPage: null | { url: string; screenshot: Buffer } = null;
    const url = page.url();

    if (url !== "about:blank") {
      const screenshot = await page.screenshot({ fullPage: false });
      currentPage = { url, screenshot };
    }
    const gotScreenshotAt = new Date();

    if (onStepStarted) {
      await onStepStarted();
    }
    if (onStepUpdated) {
      await onStepUpdated({
        startingScreenshot: await page.screenshot({ fullPage: false }),
      });
    }

    const { action, browserActionDescription } = await getNextAction({
      task,
      history,
      currentPage,
      userContext,
    });

    if (action.type === "task_complete") {
      if (onStepUpdated) {
        await onStepUpdated({
          actionJson: {
            type: "task_complete",
            result: action.result,
          },
          actionDescription: "Task completed",
        });
      }
      return { history, result: action.result };
    }

    if (onStepUpdated) {
      await onStepUpdated({
        actionJson: action.browser_action,
        actionDescription: browserActionDescription ?? "no description",
      });
    }

    assert(action.type === "browser_action");
    assert(browserActionDescription !== null);
    const historicalAction = await takeBrowserAction({
      action: action.browser_action,
      actionDescription: browserActionDescription,
      browser,
      page,
      screenshot: currentPage?.screenshot ?? null,
      gotScreenshotAt,
      onStepUpdated,
    });

    history.push(historicalAction);
    if (onStepUpdated) {
      await onStepUpdated({
        endingScreenshot: await page.screenshot({ fullPage: false }),
      });
    }

    // if (historicalAction.screenshotWithBoundingBox !== null) {
    //   const outputPath = `/tmp/screenshot-${Date.now()}.png`;
    //   await fs.promises.writeFile(
    //     outputPath,
    //     historicalAction.screenshotWithBoundingBox,
    //   );
    //   console.log(`DEBUG: SAVED IMAGE TO ${outputPath}`);
    // }
  }
}
