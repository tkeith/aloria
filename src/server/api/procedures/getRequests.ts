import { trpcGetUserId } from "@/lib/dynamic-server-side";
import { ParsedJson } from "@/lib/utils";
import { procedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { z } from "zod";

export const getRequests = procedure
  .input(
    z.object({
      authToken: z.string(),
    }),
  )
  .query(async ({ input: { authToken } }) => {
    const userId = await trpcGetUserId({ authToken });

    const requests = await db.request.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      requests: requests.map((request) => ({
        extid: request.extid,
        task: request.task,
        status: request.status,
        result: request.result,
      })),
    };
  });
