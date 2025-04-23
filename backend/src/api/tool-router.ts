import { Hono } from 'hono';
import { Env } from '../worker-configuration';
import { handleToolConfirmation } from './tool';

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
  
  return handleToolConfirmation(request, c.env, c.get('userPrefix'));
});

export default router;
