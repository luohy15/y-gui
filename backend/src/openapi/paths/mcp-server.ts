// MCP Server API paths
export const mcpServerPaths = {
  '/api/mcp-servers': {
    get: {
      summary: 'List all MCP server configurations',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'List of MCP server configurations',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    command: { type: 'string' },
                    args: { 
                      type: 'array',
                      items: { type: 'string' }
                    },
                    url: { type: 'string' },
                    env: { 
                      type: 'object',
                      additionalProperties: { type: 'string' }
                    },
                    disabled: { type: 'boolean' },
                    autoApprove: {
                      type: 'array',
                      items: { type: 'string' }
                    }
                  },
                },
              },
            },
          },
        },
        '401': {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
      },
    },
  },
  '/api/mcp-server': {
    post: {
      summary: 'Create a new MCP server configuration',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                command: { type: 'string' },
                args: { 
                  type: 'array',
                  items: { type: 'string' }
                },
                url: { type: 'string' },
                env: { 
                  type: 'object',
                  additionalProperties: { type: 'string' }
                },
                disabled: { type: 'boolean' },
                autoApprove: {
                  type: 'array',
                  items: { type: 'string' }
                }
              },
              required: ['name'],
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'MCP server created successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  server: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      command: { type: 'string' },
                      args: { 
                        type: 'array',
                        items: { type: 'string' }
                      },
                      url: { type: 'string' },
                      env: { 
                        type: 'object',
                        additionalProperties: { type: 'string' }
                      },
                      disabled: { type: 'boolean' },
                      autoApprove: {
                        type: 'array',
                        items: { type: 'string' }
                      }
                    },
                  },
                },
              },
            },
          },
        },
        '400': {
          description: 'Bad request',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        '401': {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        '409': {
          description: 'Conflict - MCP server with this name already exists',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
      },
    },
  },
  '/api/mcp-server/{name}': {
    put: {
      summary: 'Update an existing MCP server configuration',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'name',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'MCP server name',
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                command: { type: 'string' },
                args: { 
                  type: 'array',
                  items: { type: 'string' }
                },
                url: { type: 'string' },
                env: { 
                  type: 'object',
                  additionalProperties: { type: 'string' }
                },
                disabled: { type: 'boolean' },
                autoApprove: {
                  type: 'array',
                  items: { type: 'string' }
                }
              },
              required: ['name'],
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'MCP server updated successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  server: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      command: { type: 'string' },
                      args: { 
                        type: 'array',
                        items: { type: 'string' }
                      },
                      url: { type: 'string' },
                      env: { 
                        type: 'object',
                        additionalProperties: { type: 'string' }
                      },
                      disabled: { type: 'boolean' },
                      autoApprove: {
                        type: 'array',
                        items: { type: 'string' }
                      }
                    },
                  },
                },
              },
            },
          },
        },
        '400': {
          description: 'Bad request',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        '401': {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        '404': {
          description: 'MCP server not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
      },
    },
    delete: {
      summary: 'Delete an MCP server configuration',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'name',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'MCP server name',
        },
      ],
      responses: {
        '200': {
          description: 'MCP server deleted successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                },
              },
            },
          },
        },
        '401': {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        '404': {
          description: 'MCP server not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
      },
    },
  },
};
