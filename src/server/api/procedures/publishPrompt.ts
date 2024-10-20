import { trpcGetUserId } from "@/lib/dynamic-server-side";
import { generateName } from "@/lib/generate-name";
import { procedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { z } from "zod";

export const publishPrompt = procedure
  .input(
    z.object({
      authToken: z.string(),
      prompt: z.string(),
      createdByAddress: z.string(),
    }),
  )
  .mutation(async ({ input: { authToken, prompt, createdByAddress } }) => {
    const userId = await trpcGetUserId({ authToken });

    const updatedUser = await db.prompt.create({
      data: {
        name: await generateName({
          userMessage:
            "Generate a name (around 5 words) for a prompt with the following content:\n\n" +
            prompt,
        }),
        content: prompt,
        createdByUserId: userId,
        createdByAddress: createdByAddress,
      },
    });
  });
