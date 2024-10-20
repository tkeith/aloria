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
      address: z.string().optional(),
    }),
  )
  .mutation(async ({ input: { authToken, taskDescription, address } }) => {
    const userId = await trpcGetUserId({ authToken });

    const newRequest = await db.request.create({
      data: {
        task: taskDescription,
        userId: userId,
        extid: crypto.randomUUID(),
      },
    });

    // update user address if it's set
    if (address) {
      await db.user.update({
        where: { id: userId },
        data: { address },
      });
    }

    runRequest({
      requestId: newRequest.id,
    }).catch((e) => {
      console.error(e);
    });

    return { extid: newRequest.extid };
  });
