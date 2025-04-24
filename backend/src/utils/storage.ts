/**
 * Storage utility functions
 */

/**
 * Lists all user prefixes from R2 storage
 * This is useful for operations that need to be performed across all users,
 * such as token refresh for all user integrations
 * 
 * @param r2Bucket The R2 bucket to list from
 * @returns Array of user prefixes
 */
export async function listUserPrefixes(r2Bucket: R2Bucket): Promise<string[]> {
  try {
    const prefixes = new Set<string>();
    
    // List all objects in the bucket
    const objects = await r2Bucket.list();
    
    // Extract unique user prefixes
    for (const object of objects.objects) {
      const key = object.key;
      
      // Check if the key follows the user prefix pattern
      // Format is typically {user_prefix}/integration_config.jsonl
      const parts = key.split('/');
      
      if (parts.length > 1) {
        // The user prefix is everything before the last '/'
        const prefix = parts.slice(0, -1).join('/');
        if (prefix) {
          prefixes.add(prefix);
        }
      }
    }
    
    return Array.from(prefixes);
  } catch (error) {
    console.error('Error listing user prefixes:', error);
    return [];
  }
}
