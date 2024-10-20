import { defineTool, runAgenticConversation } from "@/lib/llm-utils/anthropic";
import { resizeAndCompressImage } from "@/lib/screenshot-bounding-box";
import { HistoricalAction } from "@/lib/take-browser-action";
import { ImageBlockParam } from "@anthropic-ai/sdk/resources/messages.mjs";
import assert from "assert";
import { z } from "zod";
import fs from "fs";

const browserActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("click"),
    element_description: z
      .string()
      .describe(
        `A detailed description of where to click, such as "the red right-arrow below the word 'Hello' in the navbar". Make sure to make it very specific.`,
      ),
  }),
  z.object({
    type: z.literal("goto_url"),
    url: z.string().url(),
  }),
  z.object({
    type: z.literal("scroll"),
    direction: z.enum(["up", "down"]),
  }),
  z.object({
    type: z.literal("type_characters"),
    characters: z.string(),
  }),
  z.object({
    type: z.literal("press_special_key"),
    key: z.enum(["enter", "escape", "tab"]),
  }),
  z.object({
    type: z.literal("wait_seconds"),
    seconds: z.number().positive(),
  }),
]);

export type BrowserAction = z.infer<typeof browserActionSchema>;

export type Action =
  | {
      type: "browser_action";
      browser_action: BrowserAction;
    }
  | {
      type: "task_complete";
    };

export async function getNextAction(opts: {
  task: string; // what the user is trying to do
  history: HistoricalAction[]; // what we have done so far
  currentPage: null | {
    url: string;
    screenshot: Buffer;
  };
}): Promise<{
  action: Action;
  browserActionDescription: string | null;
}> {
  let action = null as Action | null;

  const userMessage = `\
We are helping a disabled user accomplish a task on the web. We need to give their automated browser control assistant very specific instructions for each step.

<task>
${opts.task}
</task>

Here are the instructions that have already been executed:
${opts.history.length === 0 ? "(none yet)" : opts.history.map((h) => `- ${h.actionDescription}`).join("\n")}

${
  opts.currentPage === null
    ? "(no page loaded yet)"
    : `
Current page screenshot attached.

First, describe what you see in the screenshot, including interactive components and whether they seem to be clickable and/or disabled. Based on this, think about whether the last step worked or not. If the last step didn't work, consider trying other options rather than trying the same thing again. Finally, describe what to do next, and execute it with the "take_browser_action" tool.
`.trim()
}
`.trim();

  console.log(`*** User message:\n${userMessage.trim()}\n**************\n`);

  const imageForLlm =
    opts.currentPage === null
      ? null
      : await resizeAndCompressImage(opts.currentPage.screenshot);

  if (imageForLlm !== null) {
    // save the image for debugging
    const outputPath = `/tmp/screenshot-${Date.now()}.jpeg`;
    await fs.promises.writeFile(outputPath, imageForLlm);
    console.log(`*** user message image ***\n${outputPath}\n**************\n`);
  }

  await runAgenticConversation({
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: userMessage,
          },
          ...(opts.currentPage === null
            ? []
            : [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/jpeg",
                    data: imageForLlm!.toString("base64"),
                  },
                } satisfies ImageBlockParam,
              ]),
        ],
      },
    ],
    tools: [
      defineTool({
        name: "take_browser_action",
        description: "Take a browser action",
        inputSchema: z.object({
          browser_action: browserActionSchema.describe(
            "The action to take with the browser on the current page",
          ),
        }),
        func: async ({ input, conversation }) => {
          action = {
            type: "browser_action",
            browser_action: input.browser_action,
          };
          return {
            type: "end_conversation",
          };
        },
      }),
      defineTool({
        name: "confirm_task_complete",
        description:
          "Confirm that the task is complete and we have no further steps to take",
        inputSchema: z.object({
          result: z.string().describe("The result of the task"),
        }),
        func: async ({ input, conversation }) => {
          action = { type: "task_complete" };
          return {
            type: "end_conversation",
          };
        },
      }),
    ],
  });

  assert(action !== null);
  return {
    action,
    browserActionDescription:
      action.type === "browser_action"
        ? getActionDescription(action.browser_action)
        : null,
  };
}

function getActionDescription(action: BrowserAction): string {
  if (action.type === "click") {
    return `Clicked on element: ${action.element_description}`;
  } else if (action.type === "goto_url") {
    return `Navigated to URL: ${action.url}`;
  } else if (action.type === "scroll") {
    return `Scrolled ${action.direction} by half a page`;
  } else if (action.type === "type_characters") {
    return `Typed characters: ${action.characters}`;
  } else if (action.type === "press_special_key") {
    return `Pressed key: ${action.key}`;
  } else if (action.type === "wait_seconds") {
    return `Waited for ${action.seconds} seconds`;
  }
  throw new Error("Unknown action type");
}
