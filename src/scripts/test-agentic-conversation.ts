import { defineTool, runAgenticConversation } from "@/lib/llm-utils/anthropic";
import { z } from "zod";

async function main() {
  await runAgenticConversation({
    system:
      "You are a helpful assistant with access to a calculator. Use the calculator tool when needed to perform calculations.",
    messages: [
      {
        role: "user",
        content: "What is the result of (12 + 34) * 5678?",
      },
    ],
    tools: [
      defineTool({
        name: "calculator",
        description: "Perform mathematical calculations",
        inputSchema: z.object({
          operation: z
            .enum(["add", "subtract", "multiply", "divide"])
            .describe("The mathematical operation to perform"),
          a: z.number().describe("The first number"),
          b: z.number().describe("The second number"),
        }),
        func: async ({ input, conversation }) => {
          console.log(
            `Performing operation: ${input.operation} on ${input.a} and ${input.b}`,
          );
          let result: number;
          if (input.operation === "add") {
            result = input.a + input.b;
          } else if (input.operation === "subtract") {
            result = input.a - input.b;
          } else if (input.operation === "multiply") {
            result = input.a * input.b;
          } else if (input.operation === "divide") {
            result = input.a / input.b;
          } else {
            throw new Error("Invalid operation");
          }
          try {
            return {
              type: "tool_result",
              content: result.toString(),
            };
          } catch (error) {
            console.error(error);
            return {
              type: "tool_result",
              content: "Error: Invalid expression",
              is_error: true,
            };
          }
        },
      }),
      defineTool({
        name: "provide_answer",
        description: "Provide the final answer to the user",
        inputSchema: z.object({
          answer: z.number().describe("The final answer to the user"),
          formatted_answer: z
            .string()
            .describe("The final answer to the user, formatted as a string"),
        }),
        func: async ({ input, conversation }) => {
          console.log(`Providing answer: ${input.answer}`);
          return {
            type: "end_conversation",
          };
        },
      }),
    ],
  });
}

void main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
