import { trpcGetUserId } from "@/lib/dynamic-server-side";
import { procedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { z } from "zod";

export const getUserContext = procedure
  .input(z.object({ authToken: z.string() }))
  .query(async ({ input: { authToken } }) => {
    const userId = await trpcGetUserId({ authToken });

    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });

    return {
      userContext: user.context,
    };
  });
