import React from 'react';
import { createRoot } from 'react-dom/client';
import { SWRConfig } from 'swr';
import { Auth0Provider } from '@auth0/auth0-react';
import App from './components/App';
import './styles.css';

// Basic fetcher for non-authenticated requests
// Components that need authentication will use useAuthenticatedFetcher from utils/auth.ts
const fetcher = async (url: string) => {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'omit', // Don't send cookies for cross-origin requests
    });

    if (!response.ok) {
      const error = new Error('An error occurred while fetching the data.');
      // Add status to error object for handling 401 in App.tsx
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

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <Auth0Provider
      domain="mcp.jp.auth0.com"
      clientId="safDbsh9wR6KWm2TzHpaIxkSiDB02npy"
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: 'https://mcp.jp.auth0.com/api/v2/',
        scope: 'openid profile email'
      }}
      useRefreshTokens={true}
      cacheLocation="localstorage"
    >
      <SWRConfig value={{ fetcher }}>
        <App />
      </SWRConfig>
    </Auth0Provider>
  </React.StrictMode>
);
