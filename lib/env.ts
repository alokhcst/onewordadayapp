import Constants from 'expo-constants';

type ExtraEnv = Record<string, unknown>;

const extraEnv = (Constants.expoConfig?.extra || Constants.manifest?.extra || {}) as ExtraEnv;

export const getEnv = (key: string): string | undefined => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }

  const value = extraEnv[key];
  return typeof value === 'string' ? value : undefined;
};
