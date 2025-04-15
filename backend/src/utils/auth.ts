interface JwksResponse {
  keys: {
    kid: string;
    kty: string;
    use: string;
    n: string;
    e: string;
    [key: string]: any;
  }[];
}

interface DecodedToken {
  header: {
    alg: string;
    typ: string;
    kid: string;
    [key: string]: any;
  };
  payload: {
    iss: string;
    sub: string;
    aud: string | string[];
    iat: number;
    exp: number;
    azp?: string;
    scope?: string;
    email?: string;
    picture?: string;
    [key: string]: any;
  };
}

const AUTH0_DOMAIN = 'mcp.jp.auth0.com';

// Interface for user information extracted from tokens
export interface UserInfo {
  sub: string;
  email?: string;
  picture?: string;
  name?: string;
  [key: string]: any;
}

/**
 * Fetches the JSON Web Key Set (JWKS) from Auth0
 */
export async function fetchJwks(): Promise<JwksResponse> {
  // Fetch fresh JWKS
  const response = await fetch(`https://${AUTH0_DOMAIN}/.well-known/jwks.json`);

  if (!response.ok) {
    throw new Error(`Failed to fetch JWKS: ${response.status}`);
  }

  return await response.json() as JwksResponse;
}

/**
 * Decodes a JWT token without verification
 * Splits the token and decodes the header and payload
 */
export function decodeToken(token: string): DecodedToken {
  try {
    const [headerB64, payloadB64] = token.split('.');

    // Base64 URL decode and parse JSON
    const decodeBase64 = (str: string): any => {
      const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
      const jsonStr = atob(base64);
      return JSON.parse(jsonStr);
    };

    return {
      header: decodeBase64(headerB64),
      payload: decodeBase64(payloadB64)
    };
  } catch (error) {
    throw new Error('Invalid token format');
  }
}

/**
 * Verifies an Auth0 JWT token
 * Checks signature, expiration, issuer, and audience
 */
export async function verifyToken(token: string): Promise<boolean> {
  try {
    // Decode token to get header (including kid)
    const decoded = decodeToken(token);

    // Verify token is not expired
    const now = Math.floor(Date.now() / 1000);
    if (decoded.payload.exp <= now) {
      console.error('Token expired');
      return false;
    }

    // Verify issuer
    if (decoded.payload.iss !== `https://${AUTH0_DOMAIN}/`) {
      console.error('Invalid issuer');
      return false;
    }

    // Get JWKS and find the key matching the kid in the token header
    const jwks = await fetchJwks();
    const key = jwks.keys.find(k => k.kid === decoded.header.kid);

    if (!key) {
      console.error('No matching key found in JWKS');
      return false;
    }

    // Verify the token signature using Web Crypto API
    try {
      // Split the token into parts
      const [headerB64, payloadB64, signatureB64] = token.split('.');

      // Base64Url decode the signature
      const signatureBase64 = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
      const signaturePadding = '='.repeat((4 - signatureBase64.length % 4) % 4);
      const signatureBytes = new Uint8Array(
        [...atob(signatureBase64 + signaturePadding)].map(c => c.charCodeAt(0))
      );

      // Create the signing input (header + "." + payload)
      const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

      // Import the JWK to a CryptoKey
      const algorithm = decoded.header.alg === 'RS256' ?
        { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } } :
        { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-384' } }; // Default to SHA-256, support SHA-384

      // Convert JWK to CryptoKey
      const publicKey = await crypto.subtle.importKey(
        'jwk',
        {
          kty: key.kty,
          n: key.n,
          e: key.e,
          alg: decoded.header.alg,
          use: key.use,
          // kid is not included as it's not part of the standard JsonWebKey type
        },
        algorithm,
        false, // extractable
        ['verify'] // key usage
      );

      // Verify the signature
      const isValid = await crypto.subtle.verify(
        algorithm,
        publicKey,
        signatureBytes,
        signingInput
      );

      if (!isValid) {
        console.error('Invalid token signature');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error verifying token signature:', error);
      return false;
    }
  } catch (error) {
    console.error('Token verification error:', error);
    return false;
  }
}

/**
 * Validates the Auth0 token from the request's Authorization header
 */
export async function validateAuth(request: Request): Promise<boolean> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.slice(7);
  return await verifyToken(token);
}

/**
 * Extracts user information directly from an ID token
 * No need to call Auth0's userinfo endpoint since ID tokens already contain user info
 */
export function extractUserInfo(token: string): UserInfo {
  try {
    // Decode the ID token to get user info
    const decoded = decodeToken(token);

    // Extract user info directly from the token payload
    return {
      sub: decoded.payload.sub,
      email: decoded.payload.email,
      picture: decoded.payload.picture,
      name: decoded.payload.name
    };
  } catch (error) {
    console.error('Error extracting user info from ID token:', error);
    throw new Error('Failed to extract user info from token');
  }
}
