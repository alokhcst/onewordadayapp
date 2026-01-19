import 'dotenv/config';
import type { ConfigContext, ExpoConfig } from 'expo/config';

const appJson = require('./app.json');

const buildExtra = (baseExtra: Record<string, unknown> = {}) => ({
  ...baseExtra,
  EXPO_PUBLIC_USER_POOL_ID: process.env.EXPO_PUBLIC_USER_POOL_ID,
  EXPO_PUBLIC_USER_POOL_CLIENT_ID: process.env.EXPO_PUBLIC_USER_POOL_CLIENT_ID,
  EXPO_PUBLIC_OAUTH_DOMAIN: process.env.EXPO_PUBLIC_OAUTH_DOMAIN,
  EXPO_PUBLIC_API_ENDPOINT: process.env.EXPO_PUBLIC_API_ENDPOINT,
});

export default ({ config }: ConfigContext): ExpoConfig => {
  const baseConfig = appJson?.expo ?? config;

  return {
    ...baseConfig,
    extra: buildExtra((baseConfig as ExpoConfig).extra || {}),
  };
};
