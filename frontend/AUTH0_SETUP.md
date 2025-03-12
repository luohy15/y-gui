# Auth0 Integration Setup Guide

This guide explains how to set up Auth0 authentication for the y-gui application.

## Prerequisites

1. An Auth0 account (sign up at [auth0.com](https://auth0.com) if you don't have one)
2. Access to your Auth0 dashboard

## Step 1: Create an Auth0 Application

1. Log in to your [Auth0 Dashboard](https://manage.auth0.com/)
2. Navigate to **Applications > Applications** in the left sidebar
3. Click the **Create Application** button
4. Enter a name for your application (e.g., "y-gui")
5. Select **Single Page Application** as the application type
6. Click **Create**

## Step 2: Configure Application Settings

After creating your application, you'll be taken to its settings page. Configure the following:

1. **Allowed Callback URLs**: Add your application's callback URL
   - For local development: `http://localhost:3000`
   - For production: Add your production URL

2. **Allowed Logout URLs**: Add your application's logout URL
   - For local development: `http://localhost:3000`
   - For production: Add your production URL

3. **Allowed Web Origins**: Add your application's origin
   - For local development: `http://localhost:3000`
   - For production: Add your production URL

4. Scroll down and click **Save Changes**

## Step 3: Enable Google Social Login (Optional)

To enable Google login:

1. Go to **Authentication > Social** in the left sidebar
2. Click on **Google**
3. Toggle the switch to enable Google connections
4. Enter your Google OAuth 2.0 credentials (Client ID and Client Secret)
   - You can obtain these from the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a project, enable the Google+ API, and create OAuth credentials
5. Click **Save**

## Step 4: Configure Your Application

Update your application's Auth0 configuration in `frontend/src/index.tsx`:

```tsx
<Auth0Provider
  domain="YOUR_AUTH0_DOMAIN"
  clientId="YOUR_AUTH0_CLIENT_ID"
  authorizationParams={{
    redirect_uri: window.location.origin,
  }}
>
  {/* ... */}
</Auth0Provider>
```

Replace:
- `YOUR_AUTH0_DOMAIN` with your Auth0 domain (e.g., `dev-abc123.us.auth0.com`)
- `YOUR_AUTH0_CLIENT_ID` with your Auth0 application's Client ID

You can find these values in your Auth0 application settings.

## Step 5: Configure Backend API (If Applicable)

If your backend API needs to validate Auth0 tokens:

1. In Auth0 Dashboard, go to **Applications > APIs**
2. Click **Create API**
3. Enter a name and identifier (URL) for your API
4. Configure your backend to validate tokens using Auth0's libraries

## Testing the Integration

1. Start your application
2. You should be redirected to the Auth0 login page
3. After successful authentication, you'll be redirected back to your application

## Troubleshooting

- **Login doesn't work**: Check that your Auth0 domain and client ID are correct
- **Redirect issues**: Verify your callback URLs are correctly configured in Auth0
- **Token validation fails**: Ensure your backend is correctly validating Auth0 tokens

## Additional Resources

- [Auth0 React SDK Documentation](https://auth0.com/docs/libraries/auth0-react)
- [Auth0 Authentication Documentation](https://auth0.com/docs/authenticate)
- [Auth0 Social Connections](https://auth0.com/docs/connections/social)
