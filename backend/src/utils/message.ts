import { Message, ContentBlock } from '../../../shared/types';

/**
 * Extract text content from a message
 * 
 * @param content - Message content (string or ContentBlock array)
 * @returns Extracted text content as string
 */
export function extractContentText(content: string | ContentBlock[]): string {
  if (typeof content === 'string') {
    return content;
  }
  
  return content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n');
}

/**
 * Get current ISO8601 timestamp
 * @returns ISO8601 formatted timestamp string
 */
export function getIso8601Timestamp(): string {
  return new Date().toISOString();
}

/**
 * Get current Unix timestamp in milliseconds
 * @returns Unix timestamp in milliseconds
 */
export function getUnixTimestamp(): number {
  return Date.now();
}

/**
 * Create a Message object with optional fields
 *
 * @param role - Message role (user/assistant)
 * @param content - Message content (string or ContentBlock array)
 * @param options - Optional parameters
 * @returns Message object
 */
export function createMessage(
  role: 'user' | 'assistant',
  content: string | ContentBlock[],
  options?: {
    reasoningContent?: string;
    provider?: string;
    model?: string;
    id?: string;
    parent_id?: string;
    reasoningEffort?: string;
    tool?: string;
    server?: string;
    arguments?: any;
    links?: string[];
  }
): Message {
  const messageData: Message = {
    role,
    content,
    timestamp: getIso8601Timestamp(),
    unix_timestamp: getUnixTimestamp()
  };

  if (options) {
    if (options.reasoningContent !== undefined) {
      messageData.reasoning_content = options.reasoningContent;
    }

    if (options.provider !== undefined) {
      messageData.provider = options.provider;
    }

    if (options.model !== undefined) {
      messageData.model = options.model;
    }

    if (options.id !== undefined) {
      messageData.id = options.id;
    }

    if (options.parent_id !== undefined) {
      messageData.parent_id = options.parent_id;
    }

    if (options.reasoningEffort !== undefined) {
      messageData.reasoning_effort = options.reasoningEffort;
    }

    if (options.tool !== undefined) {
      messageData.tool = options.tool;
    }

    if (options.server !== undefined) {
      messageData.server = options.server;
    }

    if (options.arguments !== undefined) {
      messageData.arguments = options.arguments;
    }

    if (options.links !== undefined) {
      messageData.links = options.links;
    }
  }

  return messageData;
}
