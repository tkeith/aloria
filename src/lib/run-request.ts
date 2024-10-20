import { generateRequestName } from "@/lib/generate-request-name";
import { runBrowserTask } from "@/lib/run-browser-task";
import { HistoricalAction } from "@/lib/take-browser-action";
import { ParsedJson } from "@/lib/utils";
import { db } from "@/server/db";

export async function runRequest({ requestId }: { requestId: number }) {
  const request = await db.request.findUniqueOrThrow({
    where: { id: requestId },
    include: { user: true },
  });

  let currentStepId = null as number | null;

  async function setLatestStepToCompleted() {
    if (currentStepId === null) {
      return;
    }
    await db.step.update({
      where: { id: currentStepId },
      data: { status: "Completed" },
    });
  }

  await db.request.update({
    where: { id: requestId },
    data: { name: await generateRequestName({ task: request.task }) },
  });

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
    if (opts.startingScreenshot) {
      await db.step.update({
        where: { id: currentStepId },
        data: { startingScreenshot: opts.startingScreenshot },
      });
    }
    if (opts.annotatedScreenshot) {
      await db.step.update({
        where: { id: currentStepId },
        data: { annotatedScreenshot: opts.annotatedScreenshot },
      });
    }
    if (opts.endingScreenshot) {
      await db.step.update({
        where: { id: currentStepId },
        data: { endingScreenshot: opts.endingScreenshot },
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
}
