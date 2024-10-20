import { defineTool, runAgenticConversation } from "@/lib/llm-utils/anthropic";
import assert from "assert";
import { z } from "zod";

export async function generateName({ userMessage }: { userMessage: string }) {
  let name = null as string | null;

  await runAgenticConversation({
    messages: [
      {
        role: "user",
        content: userMessage,
      },
    ],
    tools: [
      defineTool({
        name: "submit_name",
        description: "Submit a name",
        inputSchema: z.object({
          name: z.string(),
        }),
        func: async ({ input }) => {
          name = input.name;
          return {
            type: "end_conversation",
          };
        },
      }),
    ],
  });

  assert(name !== null, "No name");
  return name;
}
