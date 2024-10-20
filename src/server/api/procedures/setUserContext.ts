import { trpcGetUserId } from "@/lib/dynamic-server-side";
import { procedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { z } from "zod";

export const setUserContext = procedure
  .input(
    z.object({
      authToken: z.string(),
      userContext: z.string(),
    }),
  )
  .mutation(async ({ input: { authToken, userContext } }) => {
    const userId = await trpcGetUserId({ authToken });

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { context: userContext },
    });
  });
