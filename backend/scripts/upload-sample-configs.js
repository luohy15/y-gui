// This script uploads sample bot and MCP server configurations to R2
// Run with: wrangler dev backend/scripts/upload-sample-configs.js

/**
 * Sample bot configurations
 */
const sampleBots = [
  {
    name: "default",
    base_url: "url",
    api_key: "key",
    model: "anthropic/claude-3.7-sonnet:beta",
    print_speed: 100,
    openrouter_config: { provider: { sort: "throughput" } }
  },
  {
    name: "web_search",
    base_url: "url",
    api_key: "key",
    model: "anthropic/claude-3.7-sonnet:beta",
    print_speed: 100,
    openrouter_config: { provider: { sort: "throughput" } },
    mcp_servers: ["tavily"]
  },
  {
    name: "cli",
    base_url: "url",
    api_key: "key",
    model: "anthropic/claude-3.7-sonnet:beta",
    print_speed: 100,
    openrouter_config: { provider: { sort: "throughput" } },
    mcp_servers: ["execute_command"]
  }
];

/**
 * Sample MCP server configurations
 */
const sampleMcpServers = [
  {
    name: "todo",
    command: "uvx",
    args: ["mcp-todo"],
    env: {}
  },
  {
    name: "fetch",
    command: "uvx",
    args: ["mcp-server-fetch"],
    env: {}
  },
  {
    name: "tavily",
    command: "npx",
    args: ["-y", "tavily-mcp"],
    env: { "TAVILY_API_KEY": "tvly-xxx" }
  }
];

/**
 * Main function to upload configurations to R2
 */
export default {
  async fetch(request, env, ctx) {
    try {
      // Convert bot configurations to JSONL format (each line is a JSON object)
      const botsJsonl = sampleBots.map(bot => JSON.stringify(bot)).join('\n');
      
      // Upload bot configurations
      await env.CHAT_R2.put('bot_config.jsonl', botsJsonl, {
        contentType: 'application/jsonl',
      });
      console.log('Uploaded bot configurations to R2');

      // Convert MCP server configurations to JSONL format
      const mcpServersJsonl = sampleMcpServers.map(server => JSON.stringify(server)).join('\n');
      
      // Upload MCP server configurations
      await env.CHAT_R2.put('mcp_config.jsonl', mcpServersJsonl, {
        contentType: 'application/jsonl',
      });
      console.log('Uploaded MCP server configurations to R2');

      return new Response('Configurations uploaded successfully', { status: 200 });
    } catch (error) {
      console.error('Error uploading configurations:', error);
      return new Response(`Error uploading configurations: ${error.message}`, { status: 500 });
    }
  }
};
