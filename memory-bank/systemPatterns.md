# System Patterns: y-gui

## Architecture Overview

### Core Components
```mermaid
flowchart TD
    Client[React Client] --> Worker[Cloudflare Worker]
    Worker --> R2[Cloudflare R2]
    Worker --> AI[AI Providers]

    subgraph "Frontend"
        Client --> Components[React Components]
        Components --> State[SWR State]
        State --> API[API Layer]
    end

    subgraph "Backend"
        Worker --> Auth[Auth Middleware]
        Worker --> Storage[Storage Layer]
        Worker --> Provider[Provider Layer]
    end
```

## Design Patterns

### Repository Pattern
- Implemented in ChatRepository
- Handles data operations with Cloudflare R2
- Provides consistent interface for data access
- Manages chat data persistence and retrieval

### Component Pattern
- React functional components with hooks
- Modular UI structure
- Reusable component library
- Clear component hierarchy

### State Management
- SWR for data fetching and caching
- React hooks for local state
- Optimistic updates for better UX
- Consistent state synchronization

### Authentication Pattern
- Auth0 integration for secure authentication
- Google social login support
- Token-based session management
- Secure middleware implementation
- Auth0 hooks for authentication state

## Component Relationships

### Frontend Architecture
```mermaid
flowchart LR
    App[App.tsx] --> Home[Home.tsx]
    App --> ChatView[ChatView.tsx]
    App --> Settings[Settings.tsx]
    Chat --> MessageDisplay[Message Display]
    Chat --> InputArea[InputArea]
    Settings --> BotConfig[Bot Configuration]
    Settings --> McpConfig[MCP Server Configuration]
    Settings --> ThemeToggle[Theme Toggle]

    subgraph "State Management"
        SWR[SWR Cache] --> API[API Client]
        LocalState[React State] --> UI[UI Components]
        ThemeContext[Theme Context] --> UI
    end
```

### Backend Architecture
```mermaid
flowchart LR
    Worker[Worker] --> Auth[Auth Middleware]
    Auth --> Router[API Router]
    Router --> Storage[Storage Layer]
    Router --> Provider[Provider Layer]
    Router --> Config[Configuration Layer]

    subgraph "Storage"
        Storage --> R2[R2 Operations]
    end

    subgraph "Configuration"
        Config --> BotConfig[Bot Configurations]
        Config --> McpConfig[MCP Server Configurations]
    end
```

## Key Technical Decisions

### Frontend Structure
- React with TypeScript
- Tailwind CSS for styling
- SWR for data management
- Component-based architecture
- Context API for theme management
- Configuration-driven bot and MCP server management

### Backend Structure
- Cloudflare Workers
- R2 for storage
- Middleware pattern for auth
- RESTful API design

### Data Flow
- Unidirectional data flow
- Optimistic updates
- Real-time synchronization
- Error boundary handling

### Authentication Flow
- Auth0 Universal Login
- Google social login option
- Auth0 token generation and management
- Secure API requests with Auth0 tokens
- Auth0 hooks for authentication state

## Error Handling
- Global error boundaries
- API error handling
- Loading states
- User feedback
- Retry mechanisms

## Extension Points
- Additional UI components
- New API endpoints
- Enhanced authentication
- Storage optimizations
- Provider integrations

## Testing Strategy
- Component unit tests
- Integration tests
- API endpoint tests
- Authentication testing
- Storage layer tests

## Performance Patterns
- SWR caching
- Optimistic updates
- Lazy loading
- Asset optimization
- Edge deployment

## Security Patterns
- Authentication middleware
- Secure token handling
- API request validation
- Data sanitization
- Error message security
