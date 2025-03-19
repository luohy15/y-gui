// Bot API paths
export const botPaths = {
  '/api/bots': {
    get: {
      summary: 'List all bot configurations',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'List of bot configurations',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    provider: { type: 'string' },
                    model: { type: 'string' },
                    systemPrompt: { type: 'string' },
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
};
