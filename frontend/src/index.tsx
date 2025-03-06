import React from 'react';
import { createRoot } from 'react-dom/client';
import { SWRConfig } from 'swr';
import App from './components/App';
import './styles.css';

const fetcher = async (url: string) => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
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
    <SWRConfig value={{ fetcher }}>
      <App />
    </SWRConfig>
  </React.StrictMode>
);
