import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env } from './worker-configuration';
import { getUserInfo } from './utils/auth';
import { calculateUserPrefix } from './utils/user';
import chatRouter from './api/chat-router';
import botRouter from './api/bot-router';
import shareRouter from './api/share-router';
import toolRouter from './api/tool-router';
import mcpServerRouter from './api/mcp-server-router';
import authRouter from './api/auth-router';
import refreshRouter from './api/refresh-router';
import { integrationRouter } from './api/integration';
import { handleApiDocs } from './openapi';

// Create the main Hono app with the Variables type
const app = new Hono<{ 
  Bindings: Env; 
  Variables: {
    userPrefix: string;
    userInfo: any;
  }
}>();

// Set CORS middleware
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  maxAge: 86400,
}));

// Public endpoints don't require authentication
app.get('/api/docs/*', (c) => {
  // Convert Hono request to standard Request for the existing handler
  const request = new Request(c.req.url, {
    method: c.req.method,
    headers: c.req.raw.headers,
    body: c.req.raw.body
  });
  return handleApiDocs(request);
});

// Auth middleware for all other API routes
app.use('/api/*', async (c, next) => {
  // Skip auth for already handled public endpoints
  if (c.req.path.startsWith('/api/docs') || 
     (c.req.path.startsWith('/api/share/') && c.req.method === 'GET')) {
    return next();
  }

  try {
    console.log('Handling authenticated request:', c.req.method, c.req.path);

    // Convert Hono request to standard Request for getUserInfo
    const request = new Request(c.req.url, {
      method: c.req.method,
      headers: c.req.raw.headers,
      body: c.req.raw.body
    });

    const userInfo = await getUserInfo(request, c.env);
    if (!userInfo) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userPrefix = await calculateUserPrefix(userInfo.email);

    // Store the userPrefix and userInfo in the context for routers
    c.set('userPrefix', userPrefix);
    c.set('userInfo', userInfo);

    await next();
  } catch (error) {
    console.error('Error in auth middleware:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// Mount authenticated API routers
app.route('/api/share', shareRouter);
app.route('/api/auth', authRouter);
app.route('/api/chats', chatRouter);
app.route('/api/chat', chatRouter);
app.route('/api/bots', botRouter);
app.route('/api/bot', botRouter);
app.route('/api/tool', toolRouter);
app.route('/api/refresh', refreshRouter);
app.route('/api/mcp-servers', mcpServerRouter);
app.route('/api/mcp-server', mcpServerRouter);
app.route('/api/integrations', integrationRouter);
app.route('/api/integration', integrationRouter);

// For non-API routes, serve static assets
app.all('*', async (c) => {
  // Convert Hono request to standard Request for ASSETS.fetch
  const request = new Request(c.req.url, {
    method: c.req.method,
    headers: c.req.raw.headers,
    body: c.req.raw.body
  });
  return c.env.ASSETS.fetch(request);
});

// Import the token refresh utility and storage utility
import { checkAndRefreshTokens } from './utils/token-refresh';
import { listUserPrefixes } from './utils/storage';

// Export both the fetch handler and scheduled handler
export default {
  // Fetch handler (HTTP requests)
  fetch: app.fetch,

  // Scheduled task handler for token refresh
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    console.log('Running scheduled token refresh task at:', new Date().toISOString());

    try {
      // First, check the default user space (no prefix)
      await checkAndRefreshTokens(env, '');

      // Then get all user prefixes from storage and refresh tokens for each user
      const userPrefixes = await listUserPrefixes(env.CHAT_R2);
      console.log(`Found ${userPrefixes.length} user prefixes to process`);

      // Process each user's integrations
      for (const userPrefix of userPrefixes) {
        console.log(`Processing integrations for user prefix: ${userPrefix}`);
        await checkAndRefreshTokens(env, userPrefix);
      }

      console.log('Token refresh task completed successfully');
    } catch (error) {
      console.error('Error in scheduled token refresh task:', error);
    }
  }
};
