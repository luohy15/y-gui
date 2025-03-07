import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

interface Bot {
  name: string;
  model: string;
  base_url: string;
  api_key: string;
  print_speed: number;
  mcp_servers?: string[];
  openrouter_config?: Record<string, any>;
  api_type?: string;
  custom_api_path?: string;
  max_tokens?: number;
  reasoning_effort?: string;
}

interface McpServer {
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
}

interface SettingsProps {
}

export const Settings: React.FC<SettingsProps> = ({ }) => {
  const navigate = useNavigate();
  const { isDarkMode, setIsDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState<'general'|'bots'|'mcp-servers'>('general');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuRef]);

  // Sample data - in real app this would come from a context or props
  const bots: Bot[] = [
    {
      name: "default",
      base_url: "https://gateway.ai.cloudflare.com/v1/0e58137b22362ba951f911c38b33f653/luohy15/openrouter",
      api_key: "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",
      model: "anthropic/claude-3.7-sonnet:beta",
      print_speed: 100,
      openrouter_config: { provider: { sort: "throughput" } }
    },
    {
      name: "web_search",
      base_url: "https://gateway.ai.cloudflare.com/v1/0e58137b22362ba951f911c38b33f653/luohy15/openrouter",
      api_key: "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",
      model: "anthropic/claude-3.7-sonnet:beta",
      print_speed: 100,
      openrouter_config: { provider: { sort: "throughput" } },
      mcp_servers: ["tavily"]
    },
    {
      name: "cli",
      base_url: "https://gateway.ai.cloudflare.com/v1/0e58137b22362ba951f911c38b33f653/luohy15/openrouter",
      api_key: "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",
      model: "anthropic/claude-3.7-sonnet:beta",
      print_speed: 100,
      openrouter_config: { provider: { sort: "throughput" } },
      mcp_servers: ["execute_command"]
    }
  ];

  const mcpServers: McpServer[] = [
    {
      name: "todo",
      command: "uvx",
      args: ["mcp-todo"],
      env: {}
    },
    {
      name: "fetch",
      command: "uvx",
      args: ["mcp-server-fetch"],
      env: {}
    },
    {
      name: "tavily",
      command: "npx",
      args: ["-y", "tavily-mcp"],
      env: { "TAVILY_API_KEY": "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" }
    }
  ];

  return (
    <div className={`max-w-full flex flex-col h-screen ${isDarkMode ? 'bg-[#1a1a1a] text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Mobile header with sections dropdown */}
      <div className="md:hidden flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-semibold">Settings</h1>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`flex items-center px-4 py-2 rounded-md ${
              isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
            } border ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}
          >
            <span>Sections</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 ml-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {isMobileMenuOpen && (
            <div className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 z-10 ${
              isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}>
              <button
                onClick={() => {
                  setActiveTab('general');
                  setIsMobileMenuOpen(false);
                }}
                className={`block w-full text-left px-4 py-2 text-sm ${
                  activeTab === 'general'
                    ? isDarkMode
                      ? 'bg-gray-700 text-white'
                      : 'bg-blue-50 text-blue-600'
                    : isDarkMode
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                General
              </button>
              <button
                onClick={() => {
                  setActiveTab('bots');
                  setIsMobileMenuOpen(false);
                }}
                className={`block w-full text-left px-4 py-2 text-sm ${
                  activeTab === 'bots'
                    ? isDarkMode
                      ? 'bg-gray-700 text-white'
                      : 'bg-blue-50 text-blue-600'
                    : isDarkMode
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Bots
              </button>
              <button
                onClick={() => {
                  setActiveTab('mcp-servers');
                  setIsMobileMenuOpen(false);
                }}
                className={`block w-full text-left px-4 py-2 text-sm ${
                  activeTab === 'mcp-servers'
                    ? isDarkMode
                      ? 'bg-gray-700 text-white'
                      : 'bg-blue-50 text-blue-600'
                    : isDarkMode
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                MCP Servers
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - hidden on mobile */}
        <div className={`hidden md:block w-56 ${isDarkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'} border-r p-4`}>
          <nav>
            <ul>
              <li className="mb-1">
                <button
                  onClick={() => setActiveTab('general')}
                  className={`block w-full text-left px-3 py-2 rounded-md ${
                    activeTab === 'general'
                      ? isDarkMode
                        ? 'bg-gray-800 text-white font-medium'
                        : 'bg-blue-50 text-blue-600 font-medium'
                      : isDarkMode
                        ? 'text-gray-300 hover:bg-gray-800'
                        : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  General
                </button>
              </li>
              <li className="mb-1">
                <button
                  onClick={() => setActiveTab('bots')}
                  className={`block w-full text-left px-3 py-2 rounded-md ${
                    activeTab === 'bots'
                      ? isDarkMode
                        ? 'bg-gray-800 text-white font-medium'
                        : 'bg-blue-50 text-blue-600 font-medium'
                      : isDarkMode
                        ? 'text-gray-300 hover:bg-gray-800'
                        : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Bots
                </button>
              </li>
              <li className="mb-1">
                <button
                  onClick={() => setActiveTab('mcp-servers')}
                  className={`block w-full text-left px-3 py-2 rounded-md ${
                    activeTab === 'mcp-servers'
                      ? isDarkMode
                        ? 'bg-gray-800 text-white font-medium'
                        : 'bg-blue-50 text-blue-600 font-medium'
                      : isDarkMode
                        ? 'text-gray-300 hover:bg-gray-800'
                        : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  MCP Servers
                </button>
              </li>
            </ul>
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          {/* General settings section */}
          {activeTab === 'general' && (
            <div className="mb-12">
              <h2 className={`text-xl md:text-2xl font-medium mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'} md:hidden`}>General</h2>
              <h2 className={`hidden md:block text-2xl font-medium mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>General</h2>

              <div className="max-w-3xl">
                <div className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} py-4`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Theme</h3>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Select your preferred color scheme</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Light</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isDarkMode}
                          onChange={(e) => setIsDarkMode(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className={`w-11 h-6 ${isDarkMode ? 'bg-blue-600' : 'bg-gray-200'} rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
                      </label>
                      <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Dark</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bot settings section */}
          {activeTab === 'bots' && (
            <div className="mb-12">
              <div className="flex justify-between items-center mb-6">
                <h2 className={`text-xl md:text-2xl font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} md:hidden`}>Bots</h2>
                <h2 className={`hidden md:block text-2xl font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Bots</h2>
                <button className={`px-3 py-1.5 md:px-4 md:py-2 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-md text-sm md:text-base`}>Add Bot</button>
              </div>

              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-6 text-sm md:text-base`}>Manage your bot configurations</p>

              <div className={`${isDarkMode ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'} border rounded-lg overflow-hidden`}>
                {bots.map((bot, index) => (
                  <div key={bot.name} className={`${index !== bots.length - 1 ? isDarkMode ? 'border-b border-gray-700' : 'border-b border-gray-200' : ''} p-4`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{bot.name}</h3>
                        <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          <span>{bot.model} {bot.mcp_servers && bot.mcp_servers.length > 0 && `• MCPs: ${bot.mcp_servers.join(', ')}`}</span>
                        </div>
                      </div>
                      <button className={`p-2 ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MCP Servers settings section */}
          {activeTab === 'mcp-servers' && (
            <div className="mb-12">
              <div className="flex justify-between items-center mb-6">
                <h2 className={`text-xl md:text-2xl font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} md:hidden`}>MCP Servers</h2>
                <h2 className={`hidden md:block text-2xl font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>MCP Servers</h2>
                <button className={`px-3 py-1.5 md:px-4 md:py-2 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-md text-sm md:text-base`}>Add Server</button>
              </div>

              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-6 text-sm md:text-base`}>Manage your MCP server configurations</p>

              <div className={`${isDarkMode ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'} border rounded-lg overflow-hidden`}>
                {mcpServers.map((server, index) => (
                  <div key={server.name} className={`${index !== mcpServers.length - 1 ? isDarkMode ? 'border-b border-gray-700' : 'border-b border-gray-200' : ''} p-4`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{server.name}</h3>
                        <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          <span>{server.command} {server.args.join(' ')}</span>
                        </div>
                      </div>
                      <button className={`p-2 ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
