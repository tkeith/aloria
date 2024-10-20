import { trpcGetUserId } from "@/lib/dynamic-server-side";
import { runRequest } from "@/lib/run-request";
import { procedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { z } from "zod";

export const createRequest = procedure
  .input(
    z.object({
      authToken: z.string(),
      taskDescription: z.string(),
    }),
  )
  .mutation(async ({ input: { authToken, taskDescription } }) => {
    const userId = await trpcGetUserId({ authToken });

    const newRequest = await db.request.create({
      data: {
        task: taskDescription,
        userId: userId,
        extid: crypto.randomUUID(),
      },
    });

    runRequest({
      requestId: newRequest.id,
    }).catch((e) => {
      console.error(e);
    });

    return { extid: newRequest.extid };
  });
