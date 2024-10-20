import { trpcGetUserId } from "@/lib/dynamic-server-side";
import { ParsedJson } from "@/lib/utils";
import { procedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { z } from "zod";

export const getPrompts = procedure.input(z.object({})).query(async () => {
  const prompts = await db.prompt.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    prompts: prompts.map((prompt) => ({
      name: prompt.name,
      content: prompt.content,
      createdByAddress: prompt.createdByAddress,
    })),
  };
});
