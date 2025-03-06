export async function generateToken(secretKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(secretKey + Date.now());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function validateAuth(request: Request, secretKey: string): Promise<boolean> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.slice(7);
  // In a real application, you would validate the token more securely
  // For now, we'll just check if it's a valid SHA-256 hash
  return /^[a-f0-9]{64}$/.test(token);
}

export interface AuthResponse {
  token: string;
}
