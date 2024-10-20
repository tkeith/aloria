import { trpcGetUserId } from "@/lib/dynamic-server-side";
import { ParsedJson } from "@/lib/utils";
import { procedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { z } from "zod";

export const getRequest = procedure
  .input(
    z.object({
      authToken: z.string(),
      extid: z.string(),
    }),
  )
  .query(async ({ input: { authToken, extid } }) => {
    const userId = await trpcGetUserId({ authToken });

    const request = await db.request.findUnique({
      where: {
        extid: extid,
        userId: userId,
      },
      include: {
        steps: {
          orderBy: {
            id: "asc",
          },
        },
      },
    });

    if (!request) {
      throw new Error("Request not found");
    }

    return {
      request: {
        extid: request.extid,
        task: request.task,
        status: request.status,
        result: request.result,
        steps: request.steps.map((step) => ({
          extid: step.extid,
          actionDescription: step.actionDescription,
          actionJson:
            step.actionJson === null
              ? null
              : (JSON.parse(step.actionJson) as ParsedJson),
          startingScreenshot: step.startingScreenshot,
          annotatedScreenshot: step.annotatedScreenshot,
          endingScreenshot: step.endingScreenshot,
        })),
      },
    };
  });
