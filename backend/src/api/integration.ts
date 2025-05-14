import { Hono } from 'hono';
import { IntegrationConfig } from '../../../shared/types';
import { IntegrationD1Repository } from '../repository/d1/integration-d1-repository';
import { Env } from '../worker-configuration';

// OAuth service configuration type
interface OAuthServiceConfig {
  displayName: string;  // Human-readable name (e.g., "Google Calendar")
  serviceType: string;  // Type identifier (e.g., "google-calendar")
  scope: string;        // OAuth scope
  redirectUriEnvVar: string; // Environment variable name for redirect URI
  defaultRedirectUriPath: string; // Default path for the callback
}

// OAuth token response interface
interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

// Service configurations
const GOOGLE_CALENDAR_CONFIG: OAuthServiceConfig = {
  displayName: 'Google Calendar',
  serviceType: 'google-calendar',
  scope: 'https://www.googleapis.com/auth/calendar',
  redirectUriEnvVar: 'GOOGLE_CLENDAR_REDIRECT_URI',
  defaultRedirectUriPath: '/callback/google-calendar'
};

const GMAIL_CONFIG: OAuthServiceConfig = {
  displayName: 'Gmail',
  serviceType: 'google-gmail',
  scope: 'https://mail.google.com/',
  redirectUriEnvVar: 'GOOGLE_GMAIL_REDIRECT_URI',
  defaultRedirectUriPath: '/callback/gmail'
};

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
    const { CHAT_DB } = c.env;
    const userPrefix = await getUserPrefix(c);
    
    const integrationRepository = new IntegrationD1Repository(CHAT_DB, userPrefix);
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
    const { CHAT_DB } = c.env;
    const userPrefix = await getUserPrefix(c);
    
    const integration = await c.req.json() as IntegrationConfig;
    
    if (!integration.name) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    const integrationRepository = new IntegrationD1Repository(CHAT_DB, userPrefix);
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
    const { CHAT_DB } = c.env;
    const userPrefix = await getUserPrefix(c);
    const name = c.req.param('name');
    
    const updatedIntegration = await c.req.json() as IntegrationConfig;
    
    if (!updatedIntegration.name) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    const integrationRepository = new IntegrationD1Repository(CHAT_DB, userPrefix);
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
    const { CHAT_DB } = c.env;
    const userPrefix = await getUserPrefix(c);
    const name = c.req.param('name');
    
    const integrationRepository = new IntegrationD1Repository(CHAT_DB, userPrefix);
    await integrationRepository.deleteIntegration(name);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting integration:', error);
    return c.json({ error: 'Failed to delete integration' }, 500);
  }
});

/**
 * Creates an OAuth authorization URL for the specified service
 */
async function createOAuthUrl(c: any, config: OAuthServiceConfig): Promise<string> {
  const { GOOGLE_CLIENT_ID } = c.env;
  const redirectUriEnvValue = c.env[config.redirectUriEnvVar];
  const REDIRECT_URI = redirectUriEnvValue || `${new URL(c.req.url).origin}${config.defaultRedirectUriPath}`;
  
  // Create Google OAuth URL
  const scope = encodeURIComponent(config.scope);
  const responseType = 'code';
  const accessType = 'offline';
  const prompt = 'consent'; // Always ask for consent to get refresh token
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=${responseType}&scope=${scope}&access_type=${accessType}&prompt=${prompt}`;
  console.log(`${config.displayName} auth URL:`, authUrl);
  
  return authUrl;
}

// Generic endpoint to initiate OAuth flow for any supported integration type
integrationRouter.get('/auth/:type', async (c) => {
  const integrationType = c.req.param('type');
  
  // Find the appropriate configuration for this integration type
  let config: OAuthServiceConfig | null = null;
  if (integrationType === GOOGLE_CALENDAR_CONFIG.serviceType) {
    config = GOOGLE_CALENDAR_CONFIG;
  } else if (integrationType === GMAIL_CONFIG.serviceType) {
    config = GMAIL_CONFIG;
  }
  
  if (!config) {
    return c.json({ error: `OAuth not supported for integration type: ${integrationType}` }, 400);
  }
  
  const authUrl = await createOAuthUrl(c, config);
  return c.json({ authUrl });
});

/**
 * Handles the OAuth callback, exchanges code for tokens, and stores the integration
 */
async function handleOAuthCallback(c: any, code: string, config: OAuthServiceConfig): Promise<IntegrationConfig> {
  const { CHAT_DB, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = c.env;
  const redirectUriEnvValue = c.env[config.redirectUriEnvVar];
  const REDIRECT_URI = redirectUriEnvValue || `${new URL(c.req.url).origin}${config.defaultRedirectUriPath}`;
  const userPrefix = await getUserPrefix(c);
  
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
    throw new Error('Failed to obtain access token');
  }
  
  const tokenData = await tokenResponse.json() as TokenResponse;
  
  // Create or update the integration
  const integrationRepository = new IntegrationD1Repository(CHAT_DB, userPrefix);
  
  // Check if integration already exists
  const integrations = await integrationRepository.getIntegrations();
  const existingIntegration = integrations.find(i => i.name === config.serviceType);
  
  const expiryDate = Date.now() + (tokenData.expires_in * 1000);
  const expiryTimeStr = new Date(expiryDate).toLocaleString();

  const integration: IntegrationConfig = {
    name: config.serviceType,
    auth_type: 'oauth',
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
  
  return integration;
}

// Generic endpoint to handle OAuth callback for any supported integration type
integrationRouter.post('/callback/:type', async (c) => {
  try {
    const integrationType = c.req.param('type');
    const { code } = await c.req.json();
    
    if (!code) {
      return c.json({ error: 'Missing authorization code' }, 400);
    }
    
    // Find the appropriate configuration for this integration type
    let config: OAuthServiceConfig | null = null;
    if (integrationType === GOOGLE_CALENDAR_CONFIG.serviceType) {
      config = GOOGLE_CALENDAR_CONFIG;
    } else if (integrationType === GMAIL_CONFIG.serviceType) {
      config = GMAIL_CONFIG;
    }
    
    if (!config) {
      return c.json({ error: `OAuth not supported for integration type: ${integrationType}` }, 400);
    }
    
    await handleOAuthCallback(c, code, config);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    return c.json({ error: 'Failed to process authentication' }, 500);
  }
});

/**
 * Disconnects an integration by removing its credentials or removing the entire integration for API key based integrations
 */
async function disconnectIntegration(c: any, integrationName: string): Promise<void> {
  const { CHAT_DB } = c.env;
  const userPrefix = await getUserPrefix(c);
  
  const integrationRepository = new IntegrationD1Repository(CHAT_DB, userPrefix);
  const integrations = await integrationRepository.getIntegrations();
  
  const integration = integrations.find(i => i.name === integrationName);
  
  if (!integration) {
    throw new Error(`Integration with name ${integrationName} not found`);
  }

  // delete the entire integration
  await integrationRepository.deleteIntegration(integration.name);
}

// Generic disconnect endpoint for any integration name
integrationRouter.post('/disconnect/:name', async (c) => {
  try {
    const integrationName = c.req.param('name');
    await disconnectIntegration(c, integrationName);
    return c.json({ success: true });
  } catch (error) {
    console.error(`Error disconnecting integration:`, error);
    return c.json({ error: 'Failed to disconnect integration' }, 500);
  }
});
