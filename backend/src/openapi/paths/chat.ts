// Chat API paths
export const chatPaths = {
  '/api/chats': {
    get: {
      summary: 'List all chats',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'search',
          in: 'query',
          schema: { type: 'string' },
          description: 'Search term for filtering chats',
        },
        {
          name: 'page',
          in: 'query',
          schema: { type: 'integer' },
          description: 'Page number for pagination',
        },
        {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer' },
          description: 'Number of results per page',
        },
      ],
      responses: {
        '200': {
          description: 'List of chats',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  chats: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Chat' },
                  },
                  total: { type: 'integer' },
                  page: { type: 'integer' },
                  limit: { type: 'integer' },
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
    post: {
      summary: 'Create a new chat',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Chat' },
          },
        },
      },
      responses: {
        '200': {
          description: 'Created chat',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Chat' },
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
  '/api/chats/{id}': {
    get: {
      summary: 'Get a specific chat by ID',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'Chat ID',
        },
      ],
      responses: {
        '200': {
          description: 'Chat details',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Chat' },
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
          description: 'Chat not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
      },
    },
  },
  '/api/chat/id': {
    get: {
      summary: 'Generate a new unique chat ID',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'New unique chat ID',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
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
  '/api/chat/completions': {
    post: {
      summary: 'Send a message to chat and get AI completion',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                chatId: { type: 'string' },
                message: { type: 'string' },
                botId: { type: 'string' },
              },
              required: ['chatId', 'message'],
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'AI completion response',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { $ref: '#/components/schemas/Message' },
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
};
