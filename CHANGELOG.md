# Changelog

All notable changes to this project will be documented in this file.

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
