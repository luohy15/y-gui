// Tool API paths
export const toolPaths = {
  '/api/tool/confirm': {
    post: {
      summary: 'Confirm and execute a tool action',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                chatId: { type: 'string' },
                messageId: { type: 'string' },
                tool: { type: 'object' },
                confirm: { type: 'boolean' },
              },
              required: ['chatId', 'messageId', 'tool', 'confirm'],
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Tool execution result',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  result: { type: 'string' },
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
