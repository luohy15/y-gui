import { Hono } from 'hono';
import { Env } from '../worker-configuration';
import { handleShareRequest } from './share';

const router = new Hono<{ 
  Bindings: Env;
  Variables: {
    userPrefix: string;
  }
}>();

// Forward all requests to the existing handler
router.all('*', async (c) => {
  // Convert Hono request to web standard Request
  const request = new Request(c.req.url, {
    method: c.req.method,
    headers: c.req.raw.headers,
    body: c.req.raw.body
  });
  
  // For GET requests (public shares), don't pass userPrefix
  if (c.req.method === 'GET') {
    return handleShareRequest(request, c.env);
  }
  
  // For other methods, pass userPrefix for authenticated requests
  return handleShareRequest(request, c.env, c.get('userPrefix'));
});

export default router;
