import { IntegrationConfig } from '../../../shared/types';
import { IntegrationD1Repository } from '../repository/d1/integration-d1-repository';
import { Env } from '../worker-configuration';

/**
 * Refreshes the access token for a given integration using its refresh token
 * 
 * @param integration The integration configuration with refresh token
 * @param clientId The OAuth client ID
 * @param clientSecret The OAuth client secret
 * @param r2Bucket The R2 bucket for storage
 * @param userPrefix The user prefix for storage
 * @returns The updated integration or null if refresh fails
 */
export async function refreshIntegrationToken(
  integration: IntegrationConfig,
  clientId: string,
  clientSecret: string,
  db: D1Database,
  userPrefix: string
): Promise<IntegrationConfig | null> {
  if (!integration.credentials?.refresh_token) {
    console.error(`No refresh token available for ${integration.name}`);
    return null;
  }

  try {
    // Exchange refresh token for new access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: integration.credentials.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error(`Error refreshing token for ${integration.name}:`, errorData);
      return null;
    }

    // Define the expected token response structure
    interface TokenResponse {
      access_token: string;
      expires_in: number;
    }
    
    const tokenData = await tokenResponse.json() as TokenResponse;
    const expiryDate = Date.now() + (tokenData.expires_in * 1000);
    const expiryTimeStr = new Date(expiryDate).toLocaleString();
    
    // Update the integration with new token info
    const updatedIntegration: IntegrationConfig = {
      ...integration,
      credentials: {
        ...integration.credentials,
        access_token: tokenData.access_token,
        expiry_date: expiryDate,
        expiry_time_str: expiryTimeStr,
      },
    };

    // Save the updated integration
    const repo = new IntegrationD1Repository(db, userPrefix);
    await repo.updateIntegration(integration.name, updatedIntegration);
    
    console.log(`Successfully refreshed token for ${integration.name}`);
    return updatedIntegration;
  } catch (error) {
    console.error(`Error refreshing token for ${integration.name}:`, error);
    return null;
  }
}

/**
 * Checks all integrations for tokens about to expire and refreshes them
 * 
 * @param env The environment bindings containing R2 bucket and OAuth credentials
 * @param userPrefix The user prefix for storage
 * @param expiryThresholdMs Time in milliseconds before expiry to trigger refresh (default: 30 minutes)
 */
export async function checkAndRefreshTokens(
  env: {
    CHAT_DB: D1Database;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
  },
  userPrefix: string,
  expiryThresholdMs: number = 300 * 60 * 1000 // Default: refresh if expiring in 300 minutes
) {
  try {
    const repo = new IntegrationD1Repository(env.CHAT_DB, userPrefix);
    const integrations = await repo.getIntegrations();
    
    const now = Date.now();
    
    for (const integration of integrations) {
      if (
        integration.connected &&
        integration.credentials?.access_token &&
        integration.credentials?.refresh_token &&
        integration.credentials?.expiry_date
      ) {
        // Check if token is expiring soon
        const timeUntilExpiry = integration.credentials.expiry_date - now;
        
        if (timeUntilExpiry < expiryThresholdMs) {
          console.log(`Token for ${integration.name} expires in ${timeUntilExpiry/1000} seconds, refreshing...`);
          
          // Process one integration at a time
          await refreshIntegrationToken(
            integration,
            env.GOOGLE_CLIENT_ID,
            env.GOOGLE_CLIENT_SECRET,
            env.CHAT_DB,
            userPrefix
          );
        }
      }
    }
  } catch (error) {
    console.error('Error checking and refreshing tokens:', error);
  }
}
