// Auth API paths
export const authPaths = {
  '/api/auth/userinfo': {
    get: {
      summary: 'Get authenticated user information',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'User information',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UserInfo' },
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
