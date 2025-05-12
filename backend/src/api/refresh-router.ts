import { Hono } from 'hono';
import { Env } from '../worker-configuration';
import { handleRefresh } from './refresh';

const router = new Hono<{ 
  Bindings: Env;
  Variables: {
    userPrefix: string;
  }
}>();

router.all('*', async (c) => {
  const request = new Request(c.req.url, {
    method: c.req.method,
    headers: c.req.raw.headers,
    body: c.req.raw.body
  });
  
  return handleRefresh(request, c.env, c.get('userPrefix'));
});

export default router;
