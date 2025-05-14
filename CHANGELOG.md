# Changelog

All notable changes to this project will be documented in this file.

## [05140058]

### Added
- Added D1 database support for data storage
- Added migration endpoint `/api/chat/migrate-to-d1` to transfer chats from R2 to D1
- Added database repositories for bots, chats, integrations, and MCP servers
- Added batch processing for chat migration with error handling
- Added D1 database configuration in wrangler.toml

### Changed
- Migrated all repositories from R2 storage to D1 database
- Refactored repository code structure with separate r2/ and d1/ directories
- Updated all API handlers to use D1 repositories
- Modified token refresh utility to work with D1 repositories
- Enhanced error handling and type safety in repository implementations

## [04250821]

### Added
- Added automatic token refresh functionality for Google integrations
- Added scheduled task handler in Cloudflare Worker to run every 30 minutes
- Added token refresh utility functions with error handling
- Added storage utility to list all user prefixes from R2 storage
- Added human-readable expiry time display for integration tokens
- Added expiry threshold configuration (default: refresh tokens expiring within 5 hours)

### Changed
- Modified integration handlers to store both numeric and human-readable expiry times
- Updated worker exports to include both fetch and scheduled handlers
- Enhanced error handling for token refresh operations

## [04240058]

### Added
- Added Hono framework for backend routing and middleware
- Added integration system with OAuth support for Google Calendar and Gmail
- Added integration repository with R2 storage for managing third-party service connections
- Added OAuth callback components and routes for handling authentication flows
- Added integration settings section in the frontend UI
- Added token integration with MCP servers for authorized API access
- Added environment variables for Google OAuth configuration

### Changed
- Refactored entire backend API structure to use Hono routers
- Restructured index.ts to use modular Hono routing approach
- Updated MCP Manager to support integration access tokens
- Enhanced authentication middleware with better context handling
- Improved error handling and response formatting
- Reorganized API handlers into dedicated router files

### Fixed
- Fixed CORS headers application for preflight requests
- Fixed authorization flow for public share endpoints

## [04210935]

### Added
- Added support for StreamableHTTPClientTransport from MCP SDK v1.10.1
- Added reconnection options for MCP server connections with configurable retry parameters

### Changed
- Changed MCP server configuration to require URL-based connections only (removed support for local command+args)
- Updated MCP SDK from v1.6.1 to v1.10.1
- Replaced SSEClientTransport with StreamableHTTPClientTransport for better connection handling
- Changed unix_timestamp to use milliseconds instead of seconds
- Modified MCP server form to support URL-only configuration
- Improved API error handling and validation for MCP server configurations
- Updated bot configuration to clear optional fields when toggles are unchecked
- Set default showMcpLogs to false for cleaner UI

### Removed
- Removed default "amap" MCP server from server repository
- Removed AMAP_URL from worker configuration
- Removed MCP servers from default bot configurations
- Removed command+args support from MCP server configurations
- Removed print_speed from bot configuration
- Removed shared mode header from chat view
- Removed MCP server status display from header center section

## [03280036]

### Added
- Added new ToolStyles.css for consistent styling of tool sections
- Added tool result display directly within tool information sections
- Added visual indicators including server/tool badges and status indicators
- Added toolResults prop to MessageItem component for tracking results

### Changed
- Changed default state of thinking blocks from expanded to collapsed
- Improved UI for tool information with clearer visual hierarchy
- Enhanced tool execution display with server and tool badges
- Refactored how tool results are associated with assistant messages
- Modified message filtering to hide server/tool messages in chat view
- Replaced separate ToolResult component with integrated display in ToolInformation

### Removed
- Removed ToolResult.tsx component in favor of consolidated approach

## [03270735]

### Added
- Added automatic disconnection of MCP servers after use in Cloudflare Workers environment
- Added on-demand/just-in-time connection strategy for MCP servers
- Added showMcpLogs setting with localStorage persistence
- Added UI toggle for showing/hiding MCP logs in Settings
- Added auto-scrolling to MCP logs display when near bottom

### Changed
- Refactored MCP Manager to optimize for stateless Cloudflare Workers environment
- Replaced persistent connections with on-demand connection strategy
- Increased MCP logs display size for better visibility
- Improved MCP logs display behavior with clear rounds of operations
- Modified getSystemPrompt to accept specific mcp_servers parameter
- Improved assistant message handling with default text for empty messages
- Enhanced Header component to better display MCP server status
- Improved error handling and resource cleanup in executeTool method

### Fixed
- Fixed potential resource leaks by ensuring MCP connections are closed after use
- Fixed UI inconsistencies in the Header's MCP server status display

## [03270536]

### Added
- Added MCP logging and status display in the header
- Added new BotContext and McpContext providers for global state management
- Added McpServerStatus component to display active MCP servers in the header
- Added custom hook useMcpStatus for managing MCP status logs
- Added error handling for empty responses from providers

### Changed
- Major refactoring of ChatView component into smaller, more maintainable components
- Moved ChatView UI elements into separate components
- Improved tool execution flow with better error handling
- Updated bot configurations with new names and models
- Simplified tool confirmation handling by removing chatId parameter
- Restructured folder organization for Header and ChatView components

### Fixed
- Fixed inconsistent bot repository usage in tool confirmation API

## [03270159]

### Added
- Added default MCP server (amap) integration
- Added MCP server support for bots (gemini-0324-flash and deepseek-0324)
- Added MCP server information display in chat UI
- Added environment configuration for AMAP_URL

### Changed
- Refactored environment configuration into worker-configuration.d.ts
- Updated McpServerConfig type to make most fields optional
- Improved McpServerR2Repository to include default servers
- Enhanced Home component to display associated MCP servers for selected bot

### Fixed
- Fixed type definitions for environment variables

## [03270105]

### Added
- Added stop generation functionality with UI button to cancel ongoing requests
- Added animation utilities and loading animation indicators
- Added automatic tool execution for non-confirmation-required tools
- Added proper error handling and display for API errors
- Added timeout handling for API requests (10 second timeout)

### Changed
- Changed field name from `tool` to `server` in chat completions API
- Renamed `contentHash` to `content_hash` and `shareId` to `share_id` for consistency
- Updated model lineup in bot repository (removed gemini-0205 and deepseek-r1)
- Updated deepseek-chat-v3-0324 to use paid version
- Improved error handling and display in chat UI
- Modified SWR configuration to disable revalidation on focus
- Improved tool handling with confirmation based on server configuration

### Fixed
- Fixed error handling in OpenAI format provider with detailed error types
- Fixed avatar display when model information is missing
- Fixed UI issue in AssistantAvatar when icon slug is undefined
- Fixed empty code block rendering in Markdown component
- Fixed thinking block display in Markdown component

### Security
- Improved error handling to prevent sensitive information leakage
