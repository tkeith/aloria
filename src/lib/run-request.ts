import { generateName } from "@/lib/generate-name";
import { runBrowserTask } from "@/lib/run-browser-task";
import { HistoricalAction } from "@/lib/take-browser-action";
import { ParsedJson } from "@/lib/utils";
import { walrusUploadWithRetry } from "@/lib/walrus-upload";
import { xmtpSendMessage } from "@/lib/xtmp-send-message";
import { db } from "@/server/db";

export async function runRequest({ requestId }: { requestId: number }) {
  const request = await db.request.findUniqueOrThrow({
    where: { id: requestId },
    include: { user: true },
  });

  try {
    let currentStepId = null as number | null;

    async function setLatestStepToCompleted() {
      if (currentStepId === null) {
        return;
      }
      const updatedStep = await db.step.update({
        where: { id: currentStepId },
        data: { status: "Completed" },
      });
      if (updatedStep.actionDescription && request.user.address) {
        await xmtpSendMessage(
          request.user.address,
          "Completed step: " + updatedStep.actionDescription,
        );
      }
    }

    const newRequest = await db.request.update({
      where: { id: requestId },
      data: {
        name: await generateName({
          userMessage:
            "Generate a name (around 5 words) for a request with the following task:\n\n" +
            request.task,
        }),
      },
    });

    if (request.user.address) {
      await xmtpSendMessage(
        request.user.address,
        "Request started: " + newRequest.name,
      );
    }

    async function onStepStarted() {
      await setLatestStepToCompleted();
      const step = await db.step.create({
        data: { requestId, extid: crypto.randomUUID() },
      });
      currentStepId = step.id;
    }

    async function onStepUpdated(opts: {
      actionJson?: ParsedJson;
      actionDescription?: string;
      startingScreenshot?: Buffer;
      annotatedScreenshot?: Buffer;
      endingScreenshot?: Buffer;
    }) {
      if (!currentStepId) {
        throw new Error("No current step");
      }

      const oldStep = await db.step.findUniqueOrThrow({
        where: { id: currentStepId },
      });

      if (opts.actionJson) {
        await db.step.update({
          where: { id: currentStepId },
          data: { actionJson: JSON.stringify(opts.actionJson, null, 2) },
        });
      }
      if (opts.actionDescription) {
        await db.step.update({
          where: { id: currentStepId },
          data: { actionDescription: opts.actionDescription },
        });
      }
      if (opts.startingScreenshot && oldStep.startingScreenshot === null) {
        await db.step.update({
          where: { id: currentStepId },
          data: { startingScreenshot: opts.startingScreenshot },
        });

        (async function () {
          await db.step.update({
            where: { id: currentStepId },
            data: {
              startingScreenshotWalrusBlob: await walrusUploadWithRetry(
                opts.startingScreenshot!,
              ),
            },
          });
        })().catch((e) => {
          console.error("Error uploading starting screenshot to Walrus", e);
        });
      }
      if (opts.annotatedScreenshot && oldStep.annotatedScreenshot === null) {
        await db.step.update({
          where: { id: currentStepId },
          data: { annotatedScreenshot: opts.annotatedScreenshot },
        });

        (async function () {
          await db.step.update({
            where: { id: currentStepId },
            data: {
              annotatedScreenshotWalrusBlob: await walrusUploadWithRetry(
                opts.annotatedScreenshot!,
              ),
            },
          });
        })().catch((e) => {
          console.error("Error uploading annotated screenshot to Walrus", e);
        });
      }
      if (opts.endingScreenshot && oldStep.endingScreenshot === null) {
        await db.step.update({
          where: { id: currentStepId },
          data: { endingScreenshot: opts.endingScreenshot },
        });

        (async function () {
          await db.step.update({
            where: { id: currentStepId },
            data: {
              endingScreenshotWalrusBlob: await walrusUploadWithRetry(
                opts.endingScreenshot!,
              ),
            },
          });
        })().catch((e) => {
          console.error("Error uploading ending screenshot to Walrus", e);
        });
      }
    }

    const { result } = await runBrowserTask({
      task: request.task,
      userContext: request.user.context,
      onStepStarted,
      onStepUpdated,
    });

    await setLatestStepToCompleted();

    await db.request.update({
      where: { id: requestId },
      data: { status: "Completed", result },
    });

    if (request.user.address) {
      await xmtpSendMessage(
        request.user.address,
        "Request completed: " + newRequest.name + "\n\n" + result,
      );
    }
  } catch (e) {
    console.error(e);
    await db.request.update({
      where: { id: requestId },
      data: { status: "Canceled" },
    });

    // update associated steps to canceled (if pending)
    await db.step.updateMany({
      where: { requestId, status: "Pending" },
      data: { status: "Canceled" },
    });
  }
}
