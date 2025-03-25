import { useAuth0 } from '@auth0/auth0-react';

/**
 * Creates an authenticated fetch function that includes the Auth0 ID token
 * in the Authorization header. Automatically handles 401 errors by logging out
 * and redirecting to login page.
 *
 * @returns A fetch function that includes the Auth0 ID token
 */
export const createAuthenticatedFetch = (getIdTokenClaims: () => Promise<any>, logout?: () => void) => {
  return async (url: string, options: RequestInit = {}) => {
    try {
      // Get the ID token from claims
      const claims = await getIdTokenClaims();
      if (!claims || !claims.__raw) {
        throw new Error('Failed to get ID token');
      }

      const idToken = claims.__raw;

      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
          ...options.headers,
        },
        credentials: 'omit', // Don't send cookies for cross-origin requests
      });

      if (!response.ok) {
        // Handle 401 Unauthorized errors by logging out
        if (response.status === 401 && logout) {
          console.log('Received 401 response, logging out...');
          logout();
          window.location.href = '/'; // This will redirect to login due to Auth0 setup
          return null;
        }

        const error = new Error('An error occurred while fetching the data.');
        (error as any).status = response.status;
        throw error;
      }

      return response.json();
    } catch (error) {
      console.error('Fetch error:', error);
      // Re-throw the error to be handled by SWR
      throw error;
    }
  };
};

/**
 * Custom hook to get an authenticated fetcher for use with SWR
 * Must be used within a component wrapped by Auth0Provider
 */
export const useAuthenticatedFetcher = () => {
  const { getIdTokenClaims, logout } = useAuth0();
  return createAuthenticatedFetch(getIdTokenClaims, logout);
};
