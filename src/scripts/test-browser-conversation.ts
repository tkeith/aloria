import { startChromiumBrowser } from "@/lib/browser";
import { BrowserAction, getNextAction } from "@/lib/get-browser-action";
import { defineTool, runAgenticConversation } from "@/lib/llm-utils/anthropic";
import { runBrowserTask } from "@/lib/run-browser-task";
import { HistoricalAction, takeBrowserAction } from "@/lib/take-browser-action";
import assert from "assert";
import fs from "fs";

async function main() {
  const task =
    "find the cheapest one-way flight from boston to tokyo on 12/1/2024 on booking.com";

  const { history, result } = await runBrowserTask({ task });
  console.log(result);

  // const { browser, page } = await startChromiumBrowser();

  // const history: HistoricalAction[] = [];

  // while (true) {
  //   let currentPage: null | { url: string; screenshot: Buffer } = null;

  //   const url = page.url();

  //   if (url !== "about:blank") {
  //     const screenshot = await page.screenshot({ fullPage: false });
  //     currentPage = { url, screenshot };
  //   }
  //   const gotScreenshotAt = new Date();

  //   const { action, browserActionDescription } = await getNextAction({
  //     task,
  //     history,
  //     currentPage,
  //   });

  //   if (action.type === "task_complete") {
  //     break;
  //   }

  //   assert(action.type === "browser_action");
  //   assert(browserActionDescription !== null);
  //   const historicalAction = await takeBrowserAction({
  //     action: action.browser_action,
  //     actionDescription: browserActionDescription,
  //     browser,
  //     page,
  //     screenshot: currentPage?.screenshot ?? null,
  //     gotScreenshotAt,
  //   });

  //   history.push(historicalAction);

  //   if (historicalAction.screenshotWithBoundingBox !== null) {
  //     const outputPath = `/tmp/screenshot-${Date.now()}.png`;
  //     await fs.promises.writeFile(
  //       outputPath,
  // //       historicalAction.screenshotWithBoundingBox,
  //     );
  //     console.log(`DEBUG: SAVED IMAGE TO ${outputPath}`);
  //   }

  //   await new Promise((resolve) => setTimeout(resolve, 1500));
  // }
}

void main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
