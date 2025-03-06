import React from 'react';


interface LoginProps {
  onLogin: (token: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [secretKey, setSecretKey] = React.useState('');
  const [error, setError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretKey.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey: secretKey.trim() }),
        credentials: 'omit'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || data.message || 'Invalid secret key');
      }

      const data = await response.json() as { token?: string; message?: string };

      if (!data.token) {
        throw new Error('Invalid response from server');
      }

      const { token } = data;
      localStorage.setItem('authToken', token);
      onLogin(token);
    } catch (err) {
      console.error('Login error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else if (!navigator.onLine) {
        setError('Please check your internet connection');
      } else {
        setError('Authentication failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Welcome to Y-GUI
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please enter your secret key to continue
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="secretKey" className="sr-only">
              Secret Key
            </label>
            <input
              id="secretKey"
              type="password"
              autoComplete="off"
              spellCheck="false"
              autoCapitalize="off"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              className={`appearance-none rounded-lg relative block w-full px-3 py-2 border ${
                error ? 'border-red-300' : 'border-gray-300'
              } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
              placeholder="Enter your secret key"
              required
            />
          </div>
          {error && (
            <div role="alert" className="text-sm text-red-600 text-center" aria-live="polite">
              {error}
            </div>
          )}
          <div>
            <button
              type="submit"
              disabled={isLoading || !secretKey.trim()}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                isLoading
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-busy={isLoading}
            >
              {isLoading ? 'Authenticating...' : 'Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
