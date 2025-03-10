/**
 * Utility functions for parsing tool use in AI responses
 */

/**
 * Extract MCP tool use details from content
 * @param content The content to parse for tool use XML
 * @returns Tuple of [server_name, tool_name, arguments] or null if not found
 */
export function extractMcpToolUse(content: string): [string, string, any] | null {
  // Parse XML to extract server name, tool name, and arguments
  const mcpToolMatch = content.match(/<use_mcp_tool>(.*?)<\/use_mcp_tool>/s);
  if (!mcpToolMatch) return null;
  
  const toolContent = mcpToolMatch[1];
  
  const serverMatch = toolContent.match(/<server_name>(.*?)<\/server_name>/);
  if (!serverMatch) return null;
  const serverName = serverMatch[1].trim();
  
  const toolMatch = toolContent.match(/<tool_name>(.*?)<\/tool_name>/);
  if (!toolMatch) return null;
  const toolName = toolMatch[1].trim();
  
  const argsMatch = toolContent.match(/<arguments>\s*(\{.*?\})\s*<\/arguments>/s);
  if (!argsMatch) return null;
  
  try {
    const args = JSON.parse(argsMatch[1]);
    return [serverName, toolName, args];
  } catch (e) {
    console.error('Error parsing tool arguments:', e);
    return null;
  }
}

/**
 * Check if content contains tool use XML tags
 * @param content The content to check
 * @returns True if the content contains tool use tags
 */
export function containsToolUse(content: string): boolean {
  const toolTags = [
    "use_mcp_tool",
    "access_mcp_resource"
  ];

  for (const tag of toolTags) {
    if (content.includes(`<${tag}>`) && content.includes(`</${tag}>`)) {
      return true;
    }
  }
  return false;
}

/**
 * Split content into plain text and tool parts
 * @param content The content to split
 * @returns Tuple of [plain content, tool content]
 */
export function splitContent(content: string): [string, string | null] {
  const toolTags = [
    "use_mcp_tool",
    "access_mcp_resource"
  ];

  // Find the first tool tag
  let firstTagIndex = Infinity;
  let firstTag = null;
  
  for (const tag of toolTags) {
    const tagStart = content.indexOf(`<${tag}>`);
    if (tagStart !== -1 && tagStart < firstTagIndex) {
      firstTagIndex = tagStart;
      firstTag = tag;
    }
  }

  if (firstTagIndex < Infinity && firstTag) {
    // Find the end of the tool block
    const endTag = `</${firstTag}>`;
    const endIndex = content.indexOf(endTag, firstTagIndex);
    
    if (endIndex !== -1) {
      const endPosition = endIndex + endTag.length;
      
      // Extract tool content
      const toolContent = content.substring(firstTagIndex, endPosition).trim();
      
      // Combine content before and after tool block
      const plainContent = (content.substring(0, firstTagIndex) + content.substring(endPosition)).trim();
      
      return [plainContent, toolContent];
    }
  }

  return [content.trim(), null];
}
