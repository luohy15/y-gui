# Backend Scripts

This directory contains utility scripts for the y-gui backend.

## Upload Sample Configurations

The `upload-sample-configs.js` script uploads sample bot and MCP server configurations to Cloudflare R2. This is useful for initializing the application with default configurations.

### Usage

To run the script:

```bash
cd /path/to/y-gui
wrangler dev backend/scripts/upload-sample-configs.js
```

This will:
1. Upload sample bot configurations to R2 as `bot_config.jsonl`
2. Upload sample MCP server configurations to R2 as `mcp_config.jsonl`

### Configuration Files

The script uploads the following configuration files in JSONL format (each line is a valid JSON object):

#### bot_config.jsonl

Contains bot configurations with the following structure:

```
{"name":"default","base_url":"https://example.com/api","api_key":"your-api-key","model":"model-name","print_speed":100,"openrouter_config":{"provider":{"sort":"throughput"}}}
{"name":"web_search","base_url":"https://example.com/api","api_key":"your-api-key","model":"model-name","print_speed":100,"mcp_servers":["server1","server2"]}
```

#### mcp_config.jsonl

Contains MCP server configurations with the following structure:

```
{"name":"server-name","command":"command-to-run","args":["arg1","arg2"],"env":{"ENV_VAR1":"value1","ENV_VAR2":"value2"}}
{"name":"another-server","command":"another-command","args":[],"env":{}}
```

## Customizing Configurations

To customize the configurations, edit the `sampleBots` and `sampleMcpServers` arrays in the `upload-sample-configs.js` file before running the script.
