import { Amplify } from 'aws-amplify';

// AWS Configuration
// Replace these values with your actual AWS resources after deployment
export const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.EXPO_PUBLIC_USER_POOL_ID || 'YOUR_USER_POOL_ID',
      userPoolClientId: process.env.EXPO_PUBLIC_USER_POOL_CLIENT_ID || 'YOUR_CLIENT_ID',
      // identityPoolId is optional - only needed for AWS service access, not for User Pool auth
      loginWith: {
        oauth: {
          domain: process.env.EXPO_PUBLIC_OAUTH_DOMAIN || 'onewordaday-production.auth.us-east-1.amazoncognito.com',
          scopes: ['email', 'openid', 'profile'],
          redirectSignIn: [
            'onewordadayapp://',
            typeof window !== 'undefined' ? window.location.origin : 'http://localhost:19006'
          ],
          redirectSignOut: [
            'onewordadayapp://logout',
            typeof window !== 'undefined' ? window.location.origin + '/logout' : 'http://localhost:19006/logout'
          ],
          responseType: 'code',
        },
      },
    },
  },
  API: {
    REST: {
      OneWordADayAPI: {
        endpoint: process.env.EXPO_PUBLIC_API_ENDPOINT || 'https://your-api-id.execute-api.us-east-1.amazonaws.com/dev',
        region: 'us-east-1',
      },
    },
  },
};

// Initialize Amplify
export const configureAmplify = () => {
  Amplify.configure(awsConfig);
};

