/**
 * User utility functions
 */

/**
 * Calculates a unique prefix for a user based on their email
 * 1. Calculates MD5 hash of the email
 * 2. Replaces special characters in email (@ to _at_, . to _dot_)
 * 3. Returns in format: md5(email)_(replaced email)
 * 
 * @param email The user's email address
 * @returns A unique user prefix string
 */
export async function calculateUserPrefix(email?: string): Promise<string> {
  if (!email) {
    return '';
  }

  // Calculate MD5 hash of the email
  const md5Hash = await calculateMd5(email);
  
  // Replace special characters in the email
  const replacedEmail = email
    .replace(/@/g, '_at_')
    .replace(/\./g, '_dot_');
  
  // Return in format: md5(email)_(replaced email)
  return `${md5Hash}_${replacedEmail}`;
}

/**
 * Calculates the MD5 hash of a string using Web Crypto API
 * 
 * @param text The text to hash
 * @returns MD5 hash as a hex string
 */
async function calculateMd5(text: string): Promise<string> {
  // Convert string to ArrayBuffer
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  
  // Calculate hash using SubtleCrypto
  const hashBuffer = await crypto.subtle.digest('MD5', data);
  
  // Convert ArrayBuffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}
