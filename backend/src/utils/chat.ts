/**
 * Utility functions for chat-related operations
 */

/**
 * Generates a unique chat ID that doesn't conflict with existing IDs
 * @param existsCheck A function that checks if an ID already exists
 * @returns A unique ID
 */
export async function generateUniqueId(
  existsCheck: (id: string) => Promise<boolean>
): Promise<string> {
  let newId = '';
  let exists = true;

  while (exists) {
    // Generate a new 6-character hex ID
    newId = Array.from(crypto.getRandomValues(new Uint8Array(3)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .substring(0, 6);

    // Check if this ID already exists
    exists = await existsCheck(newId);
  }

  return newId;
}
