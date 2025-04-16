/**
 * Formats a date/time based on whether it's from today or not.
 * Returns time (HH:mm) for today's messages, or date (YYYY-MM-DD) for older messages.
 *
 * @param timestamp - Date string or unix timestamp (in seconds)
 * @returns Formatted date/time string
 */
export function formatDateTime(timestamp: string | number): string {
  const messageDate = new Date(timestamp);
  const today = new Date();

  // Check if message is from today
  const isSameDay =
    messageDate.getDate() === today.getDate() &&
    messageDate.getMonth() === today.getMonth() &&
    messageDate.getFullYear() === today.getFullYear();

  if (isSameDay) {
    // Same day, show HH:mm
    return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    // Different day, show yyyy-MM-DD
    return messageDate.toISOString().split('T')[0]; // Returns YYYY-MM-DD
  }
}
