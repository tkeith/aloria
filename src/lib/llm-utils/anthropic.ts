import { Anthropic } from "@anthropic-ai/sdk";
import {
  Message,
  MessageParam,
  ToolResultBlockParam,
  ToolUseBlock,
} from "@anthropic-ai/sdk/resources/messages";
import { z, ZodError } from "zod";
import assert from "assert";
import { zodToJsonSchema } from "zod-to-json-schema";
import { env } from "@/env.js";

export type ModelOpts = {
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

export type ConversationOpts = {
  modelOpts?: ModelOpts;
  system?: string;
  messages: Array<MessageParam>;
  tools?: Array<ToolDefinition<unknown>>;
  onNoToolUse?: () => Promise<OnNoToolUseAction>;
};

export type ConversationAction =
  | {
      type: "end_conversation";
    }
  | {
      type: "new_agentic_conversation";
      conversationOpts: ConversationOpts;
    };

export type ToolAction =
  | {
      type: "tool_result";
      content: string;
      is_error?: boolean;
    }
  | ConversationAction;

export type OnNoToolUseAction =
  | {
      type: "text_response";
      content: string;
    }
  | ConversationAction;

// the `execute` attribute of a tool, which is the javascript function itself
export type ToolFunction<Input> = (opts: {
  input: Input;
  conversation: ConversationOpts;
}) => Promise<ToolAction> | ToolAction;

// the definition of a tool that can be called by the LLM
export type ToolDefinition<Input> = {
  name: string;
  description: string;
  inputSchema: z.ZodType<Input>;
  func: ToolFunction<Input>;
};

// a request by the LLM to call a tool with specific arguments
export type ToolCall<Input> = {
  function: ToolDefinition<Input>;
  arguments: Input;
};

export function defineTool<Input>(tool: ToolDefinition<Input>) {
  return tool as ToolDefinition<unknown>;
}

export const toolUseBlockSchema = z.object({
  id: z.string(),
  name: z.string(),
  input: z.unknown(),
  type: z.literal("tool_use"),
});

export function zodErrorToHumanReadableString(e: ZodError) {
  return e.errors
    .map((err) => `${err.path.join(".")}: ${err.message}`)
    .join("\n");
}

/**
 * make sure that the messages array is valid as per Anthropic rules
 * (starting & ending with user message, alternating between user and assistant)
 */
export function checkInputMessages(messages: Array<MessageParam>) {
  assert(messages.length >= 1, "Messages array must have at least one message");
  assert(
    messages.length % 2 === 1,
    "Messages array must have an odd number of messages",
  );

  for (const [i, message] of messages.entries()) {
    if (i < messages.length - 1) {
      if (i % 2 === 0) {
        assert(
          message.role === "user",
          "Messages must alternate between user and assistant",
        );
      } else {
        assert(
          message.role === "assistant",
          "Messages must alternate between user and assistant",
        );
      }
    }
  }
}

export function getAnthropicToolDefinitions(
  tools: Array<ToolDefinition<unknown>>,
) {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: getAnthropicInputJsonSchema(tool.inputSchema),
  }));
}

export const anthropicInputJsonSchemaZodSchema = z.object({
  type: z.literal("object"),
  properties: z.record(
    z.string(),
    z.unknown(), // to include everything else, like "enum"
  ),
  required: z.array(z.string()).optional(),
});

export function getAnthropicInputJsonSchema(inputSchema: z.ZodSchema) {
  const result = zodToJsonSchema(inputSchema);
  try {
    return anthropicInputJsonSchemaZodSchema.parse(result);
  } catch (e) {
    console.error(
      `Invalid anthropic tool input json schema:\n${JSON.stringify(result, null, 2)}`,
    );
    throw e;
  }
}

export async function runAgenticConversation({
  modelOpts,
  system,
  messages,
  tools,
  onNoToolUse,
}: ConversationOpts) {
  // make sure that the messages array is valid as per Anthropic rules
  checkInputMessages(messages);

  let ongoingMessages: Array<MessageParam> = [...messages];
  let assistantMessageCount = 0;

  const realTools: Array<ToolDefinition<unknown>> | undefined =
    tools === undefined || tools.length === 0 ? undefined : tools;

  while (true) {
    if (assistantMessageCount >= 15) {
      throw new Error("Conversation not ended after 15 assistant messages");
    }

    const generatedMessage = await generateAssistantMessage({
      modelOpts,
      system,
      messages: ongoingMessages,
      tools: realTools,
      onNoToolUse,
    });

    const llmResponse = await handleLLMResponse(
      {
        modelOpts,
        system,
        messages: ongoingMessages,
        tools: realTools,
        onNoToolUse,
      },
      generatedMessage,
    );

    const newAssistantMessage: MessageParam = {
      role: "assistant",
      content: generatedMessage.content,
    };

    ongoingMessages.push(newAssistantMessage);
    assistantMessageCount++;

    if (llmResponse.type === "end_conversation") {
      return;
    } else if (llmResponse.type === "new_agentic_conversation") {
      // TODO: fix vscode type error (vscode bug?)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return await runAgenticConversation(llmResponse.conversationOpts);
    } else if (llmResponse.type === "add_text_message") {
      ongoingMessages.push({
        role: "user",
        content: llmResponse.textResponse,
      });
    } else {
      assert(
        llmResponse.toolResultContentBlocks.length > 0,
        `BUG: toolResultContentBlocks.length is 0`,
      );
      const toolResponseMessage: MessageParam = {
        role: "user",
        content: llmResponse.toolResultContentBlocks,
      };
      ongoingMessages.push(toolResponseMessage);
    }
  }
}

async function generateAssistantMessage(
  conversation: ConversationOpts,
): Promise<Message> {
  const { modelOpts, system, messages, tools, onNoToolUse } = conversation;

  assert(tools === undefined || tools.length > 0, "BUG: tools.length is 0");

  // make sure that the messages array is valid as per Anthropic rules
  try {
    checkInputMessages(messages);
  } catch (e) {
    console.log(`messages:\n${JSON.stringify(messages, null, 2)}`);
    throw new Error(`BUG: ongoingMessages not valid for Anthropic`);
  }

  const anthropic = new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
  });

  const realModelName = modelOpts?.model ?? "claude-3-5-sonnet-20240620";
  const realTemperature = modelOpts?.temperature ?? 0;
  const realMaxTokens = modelOpts?.maxTokens ?? 8192;

  const anthropicToolDefinitions =
    tools === undefined ? undefined : getAnthropicToolDefinitions(tools);

  const completion = anthropic.messages.stream({
    model: realModelName,
    temperature: realTemperature,
    max_tokens: realMaxTokens,
    system: system,
    messages: messages,
    tools: anthropicToolDefinitions,
  });

  console.log(`*** BEGIN: ${realModelName} ***`);

  let lineBuffer = "";
  for await (const event of completion) {
    const text =
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta" &&
      event.delta.text;
    if (text !== false) {
      for (const char of text) {
        lineBuffer += char;
        if (char === "\n") {
          console.log(lineBuffer);
          lineBuffer = "";
        }
      }
    }
  }
  console.log(lineBuffer);

  console.log(`\n*** END: ${realModelName} ***`);

  const assistantMessage = await completion.finalMessage();

  // log tool usage
  const toolUsageLines: Array<string> = [];

  for (const contentBlock of assistantMessage.content) {
    if (contentBlock.type === "tool_use") {
      toolUsageLines.push(
        `${contentBlock.name}: ${JSON.stringify(contentBlock.input)}`,
      );
    }
  }

  if (toolUsageLines.length > 0) {
    console.log(
      `Tool usage:\n${toolUsageLines.map((line) => `- ${line}`).join("\n")}`,
    );
  }

  return assistantMessage;
}

async function handleLLMResponse(
  conversation: ConversationOpts,
  assistantMessage: Message,
): Promise<
  | { type: "end_conversation" }
  | {
      type: "new_agentic_conversation";
      conversationOpts: ConversationOpts;
    }
  | {
      type: "add_tool_response_message";
      toolResultContentBlocks: Array<ToolResultBlockParam>;
    }
  | { type: "add_text_message"; textResponse: string }
> {
  const { modelOpts, system, messages, tools, onNoToolUse } = conversation;

  assert(tools === undefined || tools.length > 0, "BUG: tools.length is 0");

  let toolResultContentBlocks: Array<ToolResultBlockParam> = [];

  if (tools !== undefined) {
    for (const contentBlock of assistantMessage.content) {
      if (contentBlock.type === "tool_use") {
        const toolResult = await getToolResult(
          contentBlock,
          tools,
          conversation,
        );

        if (toolResult.type === "end_conversation") {
          return { type: "end_conversation" };
        } else if (toolResult.type === "new_agentic_conversation") {
          return {
            type: "new_agentic_conversation",
            conversationOpts: toolResult.conversationOpts,
          };
        } else if (toolResult.type === "tool_result") {
          console.log(
            `\n*** Providing tool result ***\n${JSON.stringify(toolResult, null, 2)}\n`,
          );

          toolResultContentBlocks.push({
            type: "tool_result",
            // TODO: figure out why this is a type error in vscode (vscode bug?)
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            tool_use_id: contentBlock.id,
            content: toolResult.content,
            is_error: toolResult.is_error === true ? true : undefined,
          });
        } else {
          throw new Error(
            `BUG: Unknown tool result type. toolResult: ${JSON.stringify(
              toolResult,
            )}`,
          );
        }
      }
    }
  }

  if (toolResultContentBlocks.length > 0) {
    return {
      type: "add_tool_response_message",
      toolResultContentBlocks: toolResultContentBlocks,
    };
  } else {
    if (onNoToolUse === undefined) {
      if (tools === undefined) {
        throw new Error("no onNoToolUse and no tools");
      }
      assert(tools.length > 0, "BUG: tools.length is 0");
      return {
        type: "add_text_message",
        textResponse: `Please use one of the following tools:\n${tools
          .map((t) => t.name)
          .join(", ")}`,
      };
    } else {
      const onNoToolUseAction = await onNoToolUse();
      if (onNoToolUseAction.type === "end_conversation") {
        return { type: "end_conversation" };
      } else if (onNoToolUseAction.type === "new_agentic_conversation") {
        return {
          type: "new_agentic_conversation",
          conversationOpts: onNoToolUseAction.conversationOpts,
        };
      } else if (onNoToolUseAction.type === "text_response") {
        return {
          type: "add_text_message",
          textResponse: onNoToolUseAction.content,
        };
      } else {
        throw new Error(
          `BUG: Unknown onNoToolUse action type. onNoToolUseAction: ${JSON.stringify(
            onNoToolUseAction,
          )}`,
        );
      }
    }
  }
}

async function getToolResult(
  contentBlock: ToolUseBlock,
  tools: Array<ToolDefinition<unknown>>,
  conversation: ConversationOpts,
): Promise<ToolAction> {
  const parsedToolUse = toolUseBlockSchema.parse(contentBlock);
  const toolDefinition = tools.find((t) => t.name === parsedToolUse.name);
  if (toolDefinition === undefined) {
    return {
      type: "tool_result",
      content: `No tool with name: ${parsedToolUse.name}`,
      is_error: true,
    };
  }

  let parsedInput;
  try {
    parsedInput = toolDefinition.inputSchema.parse(parsedToolUse.input);
  } catch (e) {
    if (e instanceof ZodError) {
      return {
        type: "tool_result",
        content: `Invalid input:\n${zodErrorToHumanReadableString(e)}`,
        is_error: true,
      };
    } else {
      throw e;
    }
  }

  const toolResult = await toolDefinition.func({
    input: parsedInput,
    conversation,
  });

  return toolResult;
}
