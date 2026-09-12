import {
  getToolName,
  isDataUIPart,
  isFileUIPart,
  isReasoningUIPart,
  isTextUIPart,
  isToolUIPart,
  type SourceDocumentUIPart,
  type SourceUrlUIPart,
  type UIDataTypes,
  type UIMessage,
  type UIMessagePart,
  type UITools,
} from "ai";

/** A single part of an assistant/user message, in the shapes the SDK emits. */
export type ChatPart = UIMessagePart<UIDataTypes, UITools>;

export type ChatSourcePart = SourceUrlUIPart | SourceDocumentUIPart;

export function isSourcePart(part: ChatPart): part is ChatSourcePart {
  return part.type === "source-url" || part.type === "source-document";
}

/**
 * Text parts are the only ones that make a message "have something to show";
 * reasoning, step markers and unknown parts are scaffolding around it.
 */
export function messageHasContent(message: UIMessage): boolean {
  return message.parts.some((part) => {
    if (isTextUIPart(part)) return part.text.trim().length > 0;
    if (isReasoningUIPart(part) || part.type === "step-start") return false;
    return true;
  });
}

/** Stable React keys for parts (tool parts are keyed by their call id). */
export function partKey(part: ChatPart, index: number): string {
  if (isToolUIPart(part)) return `tool-${part.toolCallId}`;
  if (isDataUIPart(part) && part.id) return `${part.type}-${part.id}`;
  return `${part.type}-${index}`;
}

/** Flat text of a message — used for copy affordances and accessible names. */
export function messageText(message: UIMessage): string {
  return message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join("\n")
    .trim();
}

export {
  getToolName,
  isDataUIPart,
  isFileUIPart,
  isReasoningUIPart,
  isTextUIPart,
  isToolUIPart,
};
