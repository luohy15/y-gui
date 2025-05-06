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
    // Clean the JSON string by properly handling control characters
    const argsStr = argsMatch[1]
      // First, log the raw string for debugging
      .replace(/[\x00-\x1F\x7F-\x9F]/g, (match) => {
        const code = match.charCodeAt(0);
        return code === 10 ? ' ' : ''; // Replace newlines with spaces, remove other control chars
      });
    
    const args = JSON.parse(argsStr);
    return [serverName, toolName, args];
  } catch (e) {
    console.error('Error parsing tool arguments:', e);
    console.error('Original content:');
    console.error(argsMatch[1]);
    
    // Print more context about the position where the error occurred
    if (e instanceof SyntaxError && e.message.includes('position')) {
      const position = parseInt(e.message.match(/position (\d+)/)?.[1] || '0');
      const contextStart = Math.max(0, position - 20);
      const contextEnd = Math.min(argsMatch[1].length, position + 20);
      
      console.error('Content around error position:');
      console.error(argsMatch[1].substring(contextStart, position) + '👉' + argsMatch[1].charAt(position) + '👈' + argsMatch[1].substring(position + 1, contextEnd));
      
      // Show character code for debugging control characters
      const charCode = argsMatch[1].charCodeAt(position);
      console.error(`Character at position ${position}: code ${charCode} (${JSON.stringify(argsMatch[1].charAt(position))})`);
      
      // List all control characters in the string for more comprehensive debugging
      const controlChars = [];
      for (let i = 0; i < argsMatch[1].length; i++) {
        const code = argsMatch[1].charCodeAt(i);
        if (code < 32 || (code >= 127 && code <= 159)) {
          controlChars.push(`Position ${i}: code ${code} (${JSON.stringify(argsMatch[1].charAt(i))})`);
        }
      }
      if (controlChars.length > 0) {
        console.error('All control characters found:');
        console.error(controlChars.join('\n'));
      }
      
      // Try a more aggressive approach: replace all control characters and try again
      try {
        const sanitizedJson = argsMatch[1].replace(/[\x00-\x1F\x7F-\x9F]/g, '');
        const args = JSON.parse(sanitizedJson);
        console.log('Successfully parsed JSON after removing all control characters');
        return [serverName, toolName, args];
      } catch (innerError) {
        console.error('Failed to parse even after removing control characters:', innerError);
      }
    }
    
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
    "use_mcp_tool"
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
    "use_mcp_tool"
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
