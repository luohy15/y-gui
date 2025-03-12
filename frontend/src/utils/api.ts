import { useAuth0 } from '@auth0/auth0-react';
import useSWR, { SWRConfiguration, SWRResponse } from 'swr';
import { createAuthenticatedFetch } from './auth';

/**
 * Custom hook for making authenticated API requests with SWR
 *
 * @param url The URL to fetch
 * @param options SWR configuration options
 * @returns SWR response with data, error, and other SWR properties
 */
export function useAuthenticatedSWR<Data = any, Error = any>(
  url: string | null,
  options?: SWRConfiguration
): SWRResponse<Data, Error> {
  const { getAccessTokenSilently } = useAuth0();
  const authenticatedFetcher = createAuthenticatedFetch(getAccessTokenSilently);

  return useSWR<Data, Error>(
    url,
    authenticatedFetcher,
    options
  );
}

/**
 * Custom hook for making authenticated API requests without SWR
 *
 * @returns Object with methods for making authenticated API requests
 */
export function useApi() {
  const { getAccessTokenSilently } = useAuth0();

  const fetchWithAuth = async <T = any>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> => {
    try {
      const token = await getAccessTokenSilently();

      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  };

  return {
    get: <T = any>(url: string) => fetchWithAuth<T>(url),

    post: <T = any>(url: string, data: any) =>
      fetchWithAuth<T>(url, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    put: <T = any>(url: string, data: any) =>
      fetchWithAuth<T>(url, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: <T = any>(url: string) =>
      fetchWithAuth<T>(url, {
        method: 'DELETE',
      }),
  };
}
