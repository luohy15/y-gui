import { Env } from 'worker-configuration';
const AUTH0_DOMAIN = 'mcp.jp.auth0.com';

// Interface for user information extracted from tokens
export interface UserInfo {
  sub: string;
  email?: string;
  picture?: string;
  name?: string;
  [key: string]: any;
}

// Interface for cached user information
interface CachedUserInfo extends UserInfo {
  token: string;  // Store the token that was used to fetch this info
  timestamp: number;  // Store when this was cached
}

/**
 * Extract the 'sub' claim from a JWT token
 */
function extractSubFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub;
  } catch (error) {
    console.error('Error extracting sub from token:', error);
    return null;
  }
}

/**
 * Validates the Auth0 token from the request's Authorization header
 * and retrieves user information, with KV caching to reduce Auth0 API calls
 */
export async function getUserInfo(request: Request, env?: Env): Promise<UserInfo | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  const sub = extractSubFromToken(token);
  
  // Try to get user info from KV cache first if env is provided and sub was extracted
  if (env?.USER_KV && sub) {
    try {
      const cachedData = await env.USER_KV.get(`user:${sub}`);
      if (cachedData) {
        const cachedInfo: CachedUserInfo = JSON.parse(cachedData);
        // Only use cache if the tokens match
        if (cachedInfo.token === token) {
          return {
            sub: cachedInfo.sub,
            email: cachedInfo.email,
            picture: cachedInfo.picture,
            name: cachedInfo.name
          };
        }
      }
    } catch (error) {
      console.error('Error reading from KV cache:', error);
      // Continue to fetch from Auth0 if cache read fails
    }
  }

  // If not in cache or no env provided, fetch from Auth0
  try {
    console.log('Fetching user info from Auth0');
    const response = await fetch(`https://${AUTH0_DOMAIN}/userinfo`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      console.error('Failed to fetch user info:', response.status);
      return null;
    }
    
    const userInfo: UserInfo = await response.json();
    if (!userInfo) {
      console.error('No user info found in response');
      return null;
    }
    
    const userInfoToCache = {
      sub: userInfo.sub,
      email: userInfo.email,
      picture: userInfo.picture,
      name: userInfo.name
    };
    
    // Store in KV cache with TTL if env is provided and sub was extracted
    if (env?.USER_KV && sub) {
      try {
        // Cache for 1 hour (3600 seconds)
        const cacheData: CachedUserInfo = {
          ...userInfoToCache,
          token,
          timestamp: Date.now()
        };
        
        await env.USER_KV.put(
          `user:${sub}`,
          JSON.stringify(cacheData),
          {expirationTtl: 3600}
        );
      } catch (error) {
        console.error('Error writing to KV cache:', error);
        // Continue even if cache write fails
      }
    }
    
    return userInfoToCache;
  } catch (error) {
    console.error('Error fetching user info from Auth0:', error);
    return null;
  }
}
