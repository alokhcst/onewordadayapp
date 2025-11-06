import axios, { AxiosInstance } from 'axios';
import { getIdToken } from './auth';

const API_ENDPOINT = process.env.EXPO_PUBLIC_API_ENDPOINT || 'https://your-api-id.execute-api.us-east-1.amazonaws.com/dev';

/**
 * Create axios instance with auth headers
 */
const createApiClient = async (): Promise<AxiosInstance> => {
  let idToken: string | null = null;
  
  try {
    idToken = await getIdToken();
  } catch (error) {
    console.warn('Could not get ID token:', error);
  }

  const headers: any = {
    'Content-Type': 'application/json',
  };

  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  return axios.create({
    baseURL: API_ENDPOINT,
    headers,
    timeout: 30000, // 30 second timeout
  });
};

/**
 * API Service
 */
export const api = {
  /**
   * Get user profile
   */
  getUserProfile: async () => {
    const client = await createApiClient();
    const response = await client.get('/user/profile');
    return response.data;
  },

  /**
   * Update user profile
   */
  updateUserProfile: async (profileData: any) => {
    const client = await createApiClient();
    const response = await client.put('/user/profile', profileData);
    return response.data;
  },

  /**
   * Get today's word
   */
  getTodaysWord: async (date?: string) => {
    const client = await createApiClient();
    const params = date ? { date } : {};
    const response = await client.get('/word/today', { params });
    return response.data;
  },

  /**
   * Get word history
   */
  getWordHistory: async (params?: {
    limit?: number;
    startDate?: string;
    endDate?: string;
    search?: string;
  }) => {
    const client = await createApiClient();
    const response = await client.get('/word/history', { params });
    return response.data;
  },

  /**
   * Submit feedback
   */
  submitFeedback: async (feedbackData: {
    wordId: string;
    date: string;
    rating?: number;
    practiced?: boolean;
    encountered?: boolean;
    difficulty?: 'too_easy' | 'appropriate' | 'too_difficult';
    additionalContext?: string;
    comments?: string;
  }) => {
    const client = await createApiClient();
    const response = await client.post('/feedback', feedbackData);
    return response.data;
  },
};

export default api;

