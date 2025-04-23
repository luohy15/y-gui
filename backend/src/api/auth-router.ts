import { Hono } from 'hono';
import { Env } from '../worker-configuration';
import { corsHeaders } from '../middleware/cors';

const router = new Hono<{ 
  Bindings: Env;
  Variables: {
    userPrefix: string;
    userInfo: any;
  }
}>();

// User info endpoint
router.get('/userinfo', async (c) => {
  return c.json({
    ...c.get('userInfo'),
    userPrefix: c.get('userPrefix')
  });
});

export default router;
