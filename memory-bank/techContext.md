# Technical Context: y-gui

## Technology Stack

### Frontend Technologies
- React 18
- TypeScript
- Tailwind CSS
- SWR for data fetching
- React Router for navigation
- React Context API for theme management
- Web APIs (localStorage, Fetch)

### Backend Technologies
- Cloudflare Workers
- Cloudflare KV
- Cloudflare R2
- Web Crypto API

### Development Tools
- Vite for building
- Wrangler for Cloudflare deployment
- Vitest for testing
- PostCSS for CSS processing
- TypeScript compiler

### Key Dependencies
Based on package.json:
- react: ^18.2.0
- react-dom: ^18.2.0
- swr: ^2.2.5
- @cloudflare/workers-types: ^4.20240208.0
- tailwindcss: ^3.4.1
- typescript: ^5.3.3
- vite: ^5.4.14
- wrangler: ^3.30.1

## Development Setup

### Environment Requirements
- Node.js
- npm/yarn
- Cloudflare account
- Wrangler CLI
- Git
- HTTP Proxy (127.0.0.1:7890 for development)

### Project Structure
```
y-gui/
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── App.tsx
│   │   │   ├── Home.tsx
│   │   │   ├── ChatView.tsx
│   │   │   ├── Settings.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Logo.tsx
│   │   │   └── AssistantAvatar.tsx
│   │   ├── contexts/      # React contexts
│   │   │   └── ThemeContext.tsx
│   │   ├── utils/         # Utility functions
│   │   ├── index.html     # Entry HTML
│   │   ├── index.tsx      # React entry
│   │   ├── styles.css     # Global styles
│   │   └── types.ts       # TypeScript types
│   ├── package.json       # Frontend dependencies
│   ├── tsconfig.json      # TypeScript config
│   ├── vite.config.ts     # Vite config
│   └── tailwind.config.js # Tailwind config
├── backend/
│   ├── src/
│   │   ├── api/           # API endpoints
│   │   ├── middleware/    # Middleware
│   │   ├── repository/    # Data access
│   │   ├── utils/         # Utilities
│   │   └── index.ts       # Worker entry
│   ├── package.json       # Backend dependencies
│   └── tsconfig.json      # TypeScript config
├── shared/
│   └── types/             # Shared type definitions
├── test/                  # Test files
├── wrangler.toml          # Cloudflare config
└── package.json           # Root dependencies
```

## Technical Constraints

### Performance
- Edge computing limitations
- KV/R2 access patterns
- Network latency handling
- Bundle size optimization
- Client-side caching

### Security
- Secret key management
- Token validation
- API security
- Data encryption
- CORS policies

### Compatibility
- Modern browser support
- Mobile responsiveness
- Network conditions
- API versioning
- Storage limits

## Dependencies

### Direct Dependencies
- React ecosystem
- Cloudflare tools
- Build tools
- Testing framework

### External Services
- Cloudflare Workers
- Cloudflare KV
- Cloudflare R2
- AI providers

## Configuration Management

### Cloudflare Configuration
- Worker settings
- KV namespace bindings
- R2 bucket bindings
- Environment variables
- Deployment settings

### Build Configuration
- Vite settings
- TypeScript config
- PostCSS/Tailwind
- Test setup
- Development proxy
- HTTP proxy configuration (127.0.0.1:7890)

### Development Scripts
- `npm run dev`: Standard development server
- `npm run dev:proxy`: Development server with HTTP proxy enabled (127.0.0.1:7890)
- `npm run build`: Build the project
- `npm run deploy`: Deploy to Cloudflare Workers
- `npm run test`: Run tests

### HTTP Proxy Configuration
- Implemented in `utils/proxy.ts`
- Uses a custom fetch wrapper to route external requests through the proxy
- Configured to use 127.0.0.1:7890 as the proxy server
- Only proxies external requests (not localhost or 127.0.0.1)
- Adds appropriate headers for proxy forwarding

## Development Practices

### Code Style
- TypeScript strict mode
- React best practices
- Functional components
- Custom hooks
- Error boundaries

### Testing
- Component testing
- Worker testing
- Integration testing
- E2E testing
- Performance testing

### Documentation
- Code documentation
- API documentation
- Component documentation
- Setup guides
- Deployment guides

### Version Control
- Git workflow
- Branch management
- Version tagging
- Change tracking

## Deployment

### Build Process
- TypeScript compilation
- Asset optimization
- Bundle generation
- CSS processing
- Source maps

### Worker Deployment
- Wrangler configuration
- Environment setup
- KV/R2 bindings
- Route configuration
- Error handling

## Monitoring & Debugging

### Logging
- Worker logs
- Client-side errors
- Performance metrics
- API monitoring
- Storage operations

### Debugging
- Development tools
- Error tracking
- Performance profiling
- Network analysis
- Storage debugging

## Future Considerations

### Scalability
- Worker performance
- Storage optimization
- Caching strategies
- Bundle optimization
- API efficiency

### Maintenance
- Dependency updates
- Security patches
- Performance tuning
- Bug fixes
- Feature additions
