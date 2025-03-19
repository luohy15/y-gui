// OpenAPI component schemas
export const schemas = {
  Chat: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      title: { type: 'string' },
      messages: {
        type: 'array',
        items: { $ref: '#/components/schemas/Message' },
      },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  Message: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      role: { type: 'string', enum: ['user', 'assistant', 'system'] },
      content: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
      metadata: { type: 'object' },
    },
  },
  UserInfo: {
    type: 'object',
    properties: {
      sub: { type: 'string' },
      email: { type: 'string' },
      picture: { type: 'string' },
      name: { type: 'string' },
    },
  },
  Error: {
    type: 'object',
    properties: {
      error: { type: 'string' },
    },
  },
};

// Security schemes
export const securitySchemes = {
  bearerAuth: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'Auth0 JWT token',
  },
};
