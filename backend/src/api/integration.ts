import { Hono } from 'hono';
import { IntegrationConfig } from '../../../shared/types';
import { IntegrationR2Repository } from '../repository/integration-r2-repository';
import { Env } from '../worker-configuration';

// Create a typed Hono app
export const integrationRouter = new Hono<{
  Bindings: Env;
}>();

// Function to get userPrefix from the context
async function getUserPrefix(c: any): Promise<string> {
  // Get userPrefix from the context variable set in index.ts
  return c.get('userPrefix') || '';
}

// Get all integrations - route handler for both /api/integration and /api/integrations
integrationRouter.get('/', async (c) => {
  try {
    const { CHAT_R2 } = c.env;
    const userPrefix = await getUserPrefix(c);
    
    const integrationRepository = new IntegrationR2Repository(CHAT_R2, userPrefix);
    const integrations = await integrationRepository.getIntegrations();
    
    return c.json(integrations);
  } catch (error) {
    console.error('Error fetching integrations:', error);
    return c.json({ error: 'Failed to fetch integrations' }, 500);
  }
});

// Create a new integration
integrationRouter.post('/', async (c) => {
  try {
    const { CHAT_R2 } = c.env;
    const userPrefix = await getUserPrefix(c);
    
    const integration = await c.req.json() as IntegrationConfig;
    
    if (!integration.name || !integration.type) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    const integrationRepository = new IntegrationR2Repository(CHAT_R2, userPrefix);
    await integrationRepository.addIntegration(integration);
    
    return c.json(integration, 201);
  } catch (error) {
    console.error('Error creating integration:', error);
    return c.json({ error: 'Failed to create integration' }, 500);
  }
});

// Update an existing integration
integrationRouter.put('/:name', async (c) => {
  try {
    const { CHAT_R2 } = c.env;
    const userPrefix = await getUserPrefix(c);
    const name = c.req.param('name');
    
    const updatedIntegration = await c.req.json() as IntegrationConfig;
    
    if (!updatedIntegration.name || !updatedIntegration.type) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    const integrationRepository = new IntegrationR2Repository(CHAT_R2, userPrefix);
    await integrationRepository.updateIntegration(name, updatedIntegration);
    
    return c.json(updatedIntegration);
  } catch (error) {
    console.error('Error updating integration:', error);
    return c.json({ error: 'Failed to update integration' }, 500);
  }
});

// Delete an integration
integrationRouter.delete('/:name', async (c) => {
  try {
    const { CHAT_R2 } = c.env;
    const userPrefix = await getUserPrefix(c);
    const name = c.req.param('name');
    
    const integrationRepository = new IntegrationR2Repository(CHAT_R2, userPrefix);
    await integrationRepository.deleteIntegration(name);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting integration:', error);
    return c.json({ error: 'Failed to delete integration' }, 500);
  }
});

// Initiate OAuth flow for Google Calendar
integrationRouter.get('/google-calendar/auth', async (c) => {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLENDAR_REDIRECT_URI } = c.env;
  const REDIRECT_URI = GOOGLE_CLENDAR_REDIRECT_URI ? GOOGLE_CLENDAR_REDIRECT_URI : `${new URL(c.req.url).origin}/callback/google-calendar`;
  
  // Create Google OAuth URL
  const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar');
  const responseType = 'code';
  const accessType = 'offline';
  const prompt = 'consent'; // Always ask for consent to get refresh token
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=${responseType}&scope=${scope}&access_type=${accessType}&prompt=${prompt}`;
  console.log('Google Calendar auth URL:', authUrl);
  
  return c.json({ authUrl });
});

// Initiate OAuth flow for Gmail
integrationRouter.get('/gmail/auth', async (c) => {
  const { GOOGLE_CLIENT_ID, GOOGLE_GMAIL_REDIRECT_URI } = c.env;
  const REDIRECT_URI = GOOGLE_GMAIL_REDIRECT_URI ? GOOGLE_GMAIL_REDIRECT_URI : `${new URL(c.req.url).origin}/callback/gmail`;
  
  // Create Google OAuth URL for Gmail
  const scope = encodeURIComponent('https://mail.google.com/');
  const responseType = 'code';
  const accessType = 'offline';
  const prompt = 'consent'; // Always ask for consent to get refresh token
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=${responseType}&scope=${scope}&access_type=${accessType}&prompt=${prompt}`;
  console.log('Gmail auth URL:', authUrl);
  
  return c.json({ authUrl });
});

// Handle OAuth callback from Google
integrationRouter.post('/google-calendar/callback', async (c) => {
  try {
    const { CHAT_R2, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CLENDAR_REDIRECT_URI } = c.env;
    const REDIRECT_URI = GOOGLE_CLENDAR_REDIRECT_URI ? GOOGLE_CLENDAR_REDIRECT_URI : `${new URL(c.req.url).origin}/callback/google-calendar`;
    const userPrefix = await getUserPrefix(c);
    
    const { code } = await c.req.json();
    
    if (!code) {
      return c.json({ error: 'Missing authorization code' }, 400);
    }
    
    // Exchange the code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Error exchanging code for tokens:', errorData);
      return c.json({ error: 'Failed to obtain access token' }, 500);
    }
    
    // Define the expected token response structure
    interface TokenResponse {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    }
    
    const tokenData = await tokenResponse.json() as TokenResponse;
    
    // Create or update the Google Calendar integration
    const integrationRepository = new IntegrationR2Repository(CHAT_R2, userPrefix);
    
    // Check if integration already exists
    const integrations = await integrationRepository.getIntegrations();
    const existingIntegration = integrations.find(i => i.type === 'google-calendar');
    
    const expiryDate = Date.now() + (tokenData.expires_in * 1000);
    const expiryTimeStr = new Date(expiryDate).toLocaleString();

    const integration: IntegrationConfig = {
      name: 'Google Calendar',
      type: 'google-calendar',
      connected: true,
      credentials: {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expiry_date: expiryDate,
        expiry_time_str: expiryTimeStr,
      },
    };
    
    if (existingIntegration) {
      await integrationRepository.updateIntegration(existingIntegration.name, integration);
    } else {
      await integrationRepository.addIntegration(integration);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    return c.json({ error: 'Failed to process authentication' }, 500);
  }
});

// Handle OAuth callback from Gmail
integrationRouter.post('/gmail/callback', async (c) => {
  try {
    const { CHAT_R2, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_GMAIL_REDIRECT_URI } = c.env;
    const REDIRECT_URI = GOOGLE_GMAIL_REDIRECT_URI ? GOOGLE_GMAIL_REDIRECT_URI : `${new URL(c.req.url).origin}/callback/gmail`;
    const userPrefix = await getUserPrefix(c);
    
    const { code } = await c.req.json();
    
    if (!code) {
      return c.json({ error: 'Missing authorization code' }, 400);
    }
    
    // Exchange the code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Error exchanging code for tokens:', errorData);
      return c.json({ error: 'Failed to obtain access token' }, 500);
    }
    
    // Define the expected token response structure
    interface TokenResponse {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    }
    
    const tokenData = await tokenResponse.json() as TokenResponse;
    
    // Create or update the Gmail integration
    const integrationRepository = new IntegrationR2Repository(CHAT_R2, userPrefix);
    
    // Check if integration already exists
    const integrations = await integrationRepository.getIntegrations();
    const existingIntegration = integrations.find(i => i.type === 'google-gmail');
    
    const expiryDate = Date.now() + (tokenData.expires_in * 1000);
    const expiryTimeStr = new Date(expiryDate).toLocaleString();

    const integration: IntegrationConfig = {
      name: 'Gmail',
      type: 'google-gmail',
      connected: true,
      credentials: {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expiry_date: expiryDate,
        expiry_time_str: expiryTimeStr,
      },
    };
    
    if (existingIntegration) {
      await integrationRepository.updateIntegration(existingIntegration.name, integration);
    } else {
      await integrationRepository.addIntegration(integration);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    return c.json({ error: 'Failed to process authentication' }, 500);
  }
});

// Disconnect Google Calendar
integrationRouter.post('/google-calendar/disconnect', async (c) => {
  try {
    const { CHAT_R2 } = c.env;
    const userPrefix = await getUserPrefix(c);
    
    const integrationRepository = new IntegrationR2Repository(CHAT_R2, userPrefix);
    const integrations = await integrationRepository.getIntegrations();
    
    const googleCalendarIntegration = integrations.find(i => i.type === 'google-calendar');
    
    if (googleCalendarIntegration) {
      // Update to mark as disconnected and remove credentials
      const updatedIntegration: IntegrationConfig = {
        ...googleCalendarIntegration,
        connected: false,
        credentials: undefined,
      };
      
      await integrationRepository.updateIntegration(googleCalendarIntegration.name, updatedIntegration);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Google Calendar:', error);
    return c.json({ error: 'Failed to disconnect integration' }, 500);
  }
});

// Disconnect Gmail
integrationRouter.post('/gmail/disconnect', async (c) => {
  try {
    const { CHAT_R2 } = c.env;
    const userPrefix = await getUserPrefix(c);
    
    const integrationRepository = new IntegrationR2Repository(CHAT_R2, userPrefix);
    const integrations = await integrationRepository.getIntegrations();
    
    const gmailIntegration = integrations.find(i => i.type === 'google-gmail');
    
    if (gmailIntegration) {
      // Update to mark as disconnected and remove credentials
      const updatedIntegration: IntegrationConfig = {
        ...gmailIntegration,
        connected: false,
        credentials: undefined,
      };
      
      await integrationRepository.updateIntegration(gmailIntegration.name, updatedIntegration);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Gmail:', error);
    return c.json({ error: 'Failed to disconnect integration' }, 500);
  }
});
