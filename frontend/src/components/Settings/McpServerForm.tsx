import React, { useEffect, useState } from 'react';
import { McpServerConfig } from '../../../../shared/types';

// MCP Server form modal component
interface McpServerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (server: McpServerConfig) => void;
  initialServer?: McpServerConfig;
  isDarkMode: boolean;
}

export const McpServerFormModal: React.FC<McpServerFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialServer,
  isDarkMode
}) => {
  const [formData, setFormData] = useState<McpServerConfig>(
    initialServer || {
      name: '',
      command: null,
      args: null,
      env: null,
      url: null,
      token: null
    }
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [argsString, setArgsString] = useState<string>('');
  const [envPairs, setEnvPairs] = useState<{ key: string; value: string }[]>([{ key: '', value: '' }]);

  useEffect(() => {
    if (initialServer) {
      setFormData(initialServer);
      // Convert args array to string for display
      if (initialServer.args) {
        setArgsString(initialServer.args.join(' '));
      } else {
        setArgsString('');
      }

      // Convert env object to key-value pairs for display
      if (initialServer.env) {
        const pairs = Object.entries(initialServer.env).map(([key, value]) => ({ key, value }));
        setEnvPairs(pairs.length > 0 ? pairs : [{ key: '', value: '' }]);
      } else {
        setEnvPairs([{ key: '', value: '' }]);
      }
    } else {
      setFormData({
        name: '',
        command: null,
        args: null,
        env: null,
        url: null,
        token: null
      });
      setArgsString('');
      setEnvPairs([{ key: '', value: '' }]);
    }
  }, [initialServer]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // Handle null values appropriately
    if (value === '') {
      setFormData(prev => ({ ...prev, [name]: null }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleArgsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setArgsString(e.target.value);

    // Parse args string to array
    if (e.target.value.trim() === '') {
      setFormData(prev => ({ ...prev, args: null }));
    } else {
      const argsArray = e.target.value.split(' ').filter(arg => arg.trim() !== '');
      setFormData(prev => ({ ...prev, args: argsArray }));
    }
  };

  const handleEnvChange = (index: number, field: 'key' | 'value', value: string) => {
    const newEnvPairs = [...envPairs];
    newEnvPairs[index][field] = value;
    setEnvPairs(newEnvPairs);

    // Convert env pairs to object
    const envObject: Record<string, string> = {};
    let hasValues = false;

    newEnvPairs.forEach(pair => {
      if (pair.key.trim() !== '') {
        envObject[pair.key] = pair.value;
        hasValues = true;
      }
    });

    setFormData(prev => ({ ...prev, env: hasValues ? envObject : null }));
  };

  const addEnvPair = () => {
    setEnvPairs([...envPairs, { key: '', value: '' }]);
  };

  const removeEnvPair = (index: number) => {
    if (envPairs.length > 1) {
      const newEnvPairs = envPairs.filter((_, i) => i !== index);
      setEnvPairs(newEnvPairs);

      // Update form data with new env pairs
      const envObject: Record<string, string> = {};
      let hasValues = false;

      newEnvPairs.forEach(pair => {
        if (pair.key.trim() !== '') {
          envObject[pair.key] = pair.value;
          hasValues = true;
        }
      });

      setFormData(prev => ({ ...prev, env: hasValues ? envObject : null }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Validate required fields
    if (!formData.name) {
      setError('Server name is required');
      setIsSubmitting(false);
      return;
    }

    // Validate that at least command or url is provided
    if (!formData.command && !formData.url) {
      setError('Either command or URL must be provided');
      setIsSubmitting(false);
      return;
    }

    onSubmit(formData);
    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className={`relative w-full max-w-2xl ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg shadow-lg max-h-[90vh] flex flex-col`}>
        <div className="p-4 sm:p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">
              {initialServer ? 'Edit MCP Server' : 'Add New MCP Server'}
            </h3>
            <button
              onClick={onClose}
              className={`p-1 rounded-full ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  Command
                </label>
                <input
                  type="text"
                  name="command"
                  value={formData.command || ''}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="e.g., node, python, etc."
                />
                <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Command to execute the MCP server
                </p>
              </div>

              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  Arguments
                </label>
                <input
                  type="text"
                  name="args"
                  value={argsString}
                  onChange={handleArgsChange}
                  className={`w-full px-3 py-2 border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="e.g., /path/to/script.js arg1 arg2"
                />
                <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Space-separated arguments for the command
                </p>
              </div>

              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  URL
                </label>
                <input
                  type="text"
                  name="url"
                  value={formData.url || ''}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="e.g., http://localhost:3000"
                />
                <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  URL for the MCP server (if using HTTP instead of command)
                </p>
              </div>

              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  Token (Optional)
                </label>
                <input
                  type="password"
                  name="token"
                  value={formData.token || ''}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                />
                <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Authentication token for the MCP server
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Environment Variables
                  </label>
                  <button
                    type="button"
                    onClick={addEnvPair}
                    className={`text-sm ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                  >
                    + Add Variable
                  </button>
                </div>

                <div className="space-y-2">
                  {envPairs.map((pair, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={pair.key}
                        onChange={(e) => handleEnvChange(index, 'key', e.target.value)}
                        placeholder="Key"
                        className={`flex-1 px-3 py-2 border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                      />
                      <input
                        type="text"
                        value={pair.value}
                        onChange={(e) => handleEnvChange(index, 'value', e.target.value)}
                        placeholder="Value"
                        className={`flex-1 px-3 py-2 border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                      />
                      {envPairs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEnvPair(index)}
                          className="p-2 text-red-500 hover:text-red-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Environment variables for the MCP server
                </p>
              </div>
            </div>

            <div className="mt-4 sm:mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} rounded-md`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? 'Saving...' : initialServer ? 'Update Server' : 'Add Server'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
