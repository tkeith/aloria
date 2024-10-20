import { defineTool, runAgenticConversation } from "@/lib/llm-utils/anthropic";
import assert from "assert";
import { z } from "zod";

export async function generateRequestName({ task }: { task: string }) {
  let name = null as string | null;

  await runAgenticConversation({
    messages: [
      {
        role: "user",
        content:
          "Generate a name (around 5 words) for a request with the following task:\n\n" +
          task,
      },
    ],
    tools: [
      defineTool({
        name: "submit_name",
        description: "Submit a name for a request",
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
