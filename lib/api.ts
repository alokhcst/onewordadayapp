import axios, { AxiosInstance } from 'axios';
import { getIdToken } from './auth';

const API_ENDPOINT = process.env.EXPO_PUBLIC_API_ENDPOINT || 'https://your-api-id.execute-api.us-east-1.amazonaws.com/dev';

/**
 * Create axios instance with auth headers
 */
const createApiClient = async (): Promise<AxiosInstance> => {
  console.log('========================================');
  console.log('API CLIENT - Creating API client');
  console.log('========================================');
  console.log('  - API Endpoint:', API_ENDPOINT);
  
  let idToken: string | null = null;
  
  try {
    console.log('  - Fetching ID token...');
    idToken = await getIdToken();
    if (idToken) {
      console.log('  - ID Token retrieved successfully');
      console.log('    * Token length:', idToken.length);
      console.log('    * Token preview:', idToken.substring(0, 20) + '...');
    } else {
      console.log('  - No ID token available');
    }
  } catch (error) {
    console.warn('  - ERROR: Could not get ID token:', error);
  }

  const headers: any = {
    'Content-Type': 'application/json',
  };

  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
    console.log('  - Authorization header added');
  } else {
    console.log('  - WARNING: No Authorization header (no token)');
  }

  console.log('  - Headers:', Object.keys(headers));
  console.log('========================================\n');

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
    console.log('========================================');
    console.log('API - GET USER PROFILE');
    console.log('========================================');
    console.log('  - Endpoint: GET /user/profile');
    
    try {
      const client = await createApiClient();
      console.log('  - Sending request...');
      
      const response = await client.get('/user/profile');
      
      console.log('  - Response received:');
      console.log('    * Status:', response.status);
      console.log('    * Message:', response.data.message);
      console.log('    * Profile exists:', !!response.data.profile);
      if (response.data.profile) {
        console.log('    * Profile data:');
        console.log('      - userId:', response.data.profile.userId);
        console.log('      - email:', response.data.profile.email);
        console.log('      - name:', response.data.profile.name);
        console.log('      - ageGroup:', response.data.profile.ageGroup);
        console.log('      - context:', response.data.profile.context);
      }
      console.log('========================================\n');
      
      return response.data;
    } catch (error: any) {
      console.log('  - ERROR in getUserProfile:');
      console.log('    * Status:', error.response?.status);
      console.log('    * Message:', error.response?.data?.message || error.message);
      console.log('    * Full error:', error);
      console.log('========================================\n');
      throw error;
    }
  },

  /**
   * Update user profile
   */
  updateUserProfile: async (profileData: {
    name?: string;
    username?: string;
    email?: string;
    ageGroup?: string;
    context?: string;
    examPrep?: string;
    expoPushToken?: string;
    notificationPreferences?: {
      dailyWord?: {
        enabled?: boolean;
        time?: string;
        channels?: string[];
        timezone?: string;
      };
    };
  }) => {
    console.log('========================================');
    console.log('API - UPDATE USER PROFILE');
    console.log('========================================');
    console.log('  - Endpoint: PUT /user/profile');
    console.log('  - Payload keys:', Object.keys(profileData));
    console.log('  - Payload:', JSON.stringify(profileData, null, 2));
    
    // Validate that we have at least some data
    if (!profileData || Object.keys(profileData).length === 0) {
      console.log('  - ERROR: Empty profile data');
      console.log('========================================\n');
      throw new Error('Profile data cannot be empty');
    }
    
    try {
      const client = await createApiClient();
      console.log('  - Sending request...');
      
      const response = await client.put('/user/profile', profileData);
      
      console.log('  - Response received:');
      console.log('    * Status:', response.status);
      console.log('    * Message:', response.data.message);
      console.log('    * Profile updated:', !!response.data.profile);
      if (response.data.profile) {
        console.log('    * Updated fields:', Object.keys(response.data.profile));
      }
      console.log('========================================\n');
      
      return response.data;
    } catch (error: any) {
      console.log('  - ERROR in updateUserProfile:');
      console.log('    * Status:', error.response?.status);
      console.log('    * Status Text:', error.response?.statusText);
      console.log('    * Message:', error.response?.data?.message || error.message);
      console.log('    * Error details:', error.response?.data?.error);
      console.log('    * Full error:', error);
      console.log('========================================\n');
      throw error;
    }
  },

  /**
   * Get today's word
   */
  getTodaysWord: async (date?: string) => {
    console.log('========================================');
    console.log('API - GET TODAY\'S WORD');
    console.log('========================================');
    console.log('  - Endpoint: GET /word/today');
    console.log('  - Date param:', date || 'none (today)');
    
    try {
      const client = await createApiClient();
      const params = date ? { date } : {};
      console.log('  - Sending request...');
      
      const response = await client.get('/word/today', { params });
      
      console.log('  - Response received:');
      console.log('    * Status:', response.status);
      console.log('    * Word:', response.data.word?.word);
      console.log('    * Has image:', !!response.data.word?.imageUrl);
      console.log('========================================\n');
      
      return response.data;
    } catch (error: any) {
      console.log('  - ERROR in getTodaysWord:');
      console.log('    * Status:', error.response?.status);
      console.log('    * Message:', error.response?.data?.message || error.message);
      console.log('========================================\n');
      throw error;
    }
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
    console.log('========================================');
    console.log('API - GET WORD HISTORY');
    console.log('========================================');
    console.log('  - Endpoint: GET /word/history');
    console.log('  - Params:', params || 'none');
    
    try {
      const client = await createApiClient();
      console.log('  - Sending request...');
      
      const response = await client.get('/word/history', { params });
      
      console.log('  - Response received:');
      console.log('    * Status:', response.status);
      console.log('    * Words count:', response.data.words?.length || 0);
      console.log('========================================\n');
      
      return response.data;
    } catch (error: any) {
      console.log('  - ERROR in getWordHistory:');
      console.log('    * Status:', error.response?.status);
      console.log('    * Message:', error.response?.data?.message || error.message);
      console.log('========================================\n');
      throw error;
    }
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
    console.log('========================================');
    console.log('API - SUBMIT FEEDBACK');
    console.log('========================================');
    console.log('  - Endpoint: POST /feedback');
    console.log('  - WordId:', feedbackData.wordId);
    console.log('  - Rating:', feedbackData.rating);
    console.log('  - Practiced:', feedbackData.practiced);
    
    try {
      const client = await createApiClient();
      console.log('  - Sending request...');
      
      const response = await client.post('/feedback', feedbackData);
      
      console.log('  - Response received:');
      console.log('    * Status:', response.status);
      console.log('    * Message:', response.data.message);
      console.log('========================================\n');
      
      return response.data;
    } catch (error: any) {
      console.log('  - ERROR in submitFeedback:');
      console.log('    * Status:', error.response?.status);
      console.log('    * Message:', error.response?.data?.message || error.message);
      console.log('========================================\n');
      throw error;
    }
  },
};

export default api;

