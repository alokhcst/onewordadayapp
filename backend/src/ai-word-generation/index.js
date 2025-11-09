import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import axios from 'axios';
import { randomUUID } from 'crypto';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });

const USERS_TABLE = process.env.USERS_TABLE;
const DAILY_WORDS_TABLE = process.env.DAILY_WORDS_TABLE;
const AI_USAGE_TABLE = process.env.AI_USAGE_TABLE;
const SECRET_NAME = process.env.SECRET_NAME || 'onewordaday/llm-api-keys';

// Rate limiting configuration
const DAILY_WORD_LIMIT = 20;

// LLM Provider configurations
const LLM_PROVIDERS = {
  GROQ: {
    name: 'Groq',
    apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
    models: ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'],
    rateLimit: { requests: 30, window: 60000 }, // 30 req/min
    priority: 1
  }
};

/**
 * Main Lambda handler for AI-based word generation
 */
export const handler = async (event) => {
  console.log('AI Word Generation triggered', { event });

  try {
    const userId = event.requestContext?.authorizer?.claims?.sub || event.userId;
    
    if (!userId) {
      return createResponse(401, { message: 'Unauthorized' });
    }

    // Check rate limit
    const rateLimitCheck = await checkRateLimit(userId);
    if (!rateLimitCheck.allowed) {
      return createResponse(429, {
        message: `Daily word generation limit reached (${DAILY_WORD_LIMIT} words/day)`,
        remaining: 0,
        resetAt: rateLimitCheck.resetAt
      });
    }

    // Get user profile
    const user = await getUserProfile(userId);
    
    // Parse request body for custom prompt (if API Gateway invocation)
    const body = event.body ? JSON.parse(event.body) : {};
    const customPrompt = body.customPrompt || null;

    // Generate word using AI
    const wordData = await generateAIWord(user, customPrompt);

    // Store the word
    await storeGeneratedWord(wordData);

    // Update usage tracking
    await updateUsageTracking(userId, wordData.provider);

    return createResponse(200, {
      message: 'Word generated successfully',
      word: wordData,
      remaining: rateLimitCheck.remaining - 1,
      provider: wordData.provider
    });

  } catch (error) {
    console.error('Error in AI word generation:', error);
    return createResponse(500, {
      message: 'Error generating word',
      error: error.message
    });
  }
};

/**
 * Check if user has exceeded rate limit
 */
async function checkRateLimit(userId) {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    const params = {
      TableName: AI_USAGE_TABLE,
      Key: { userId, date: today }
    };

    const result = await docClient.send(new GetCommand(params));
    const usage = result.Item || { wordsGenerated: 0 };

    const allowed = usage.wordsGenerated < DAILY_WORD_LIMIT;
    const remaining = Math.max(0, DAILY_WORD_LIMIT - usage.wordsGenerated);

    // Calculate reset time (midnight UTC)
    const resetAt = new Date(today);
    resetAt.setUTCDate(resetAt.getUTCDate() + 1);
    resetAt.setUTCHours(0, 0, 0, 0);

    return {
      allowed,
      remaining,
      resetAt: resetAt.toISOString()
    };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    return { allowed: true, remaining: DAILY_WORD_LIMIT, resetAt: null };
  }
}

/**
 * Update usage tracking
 */
async function updateUsageTracking(userId, provider) {
  const today = new Date().toISOString().split('T')[0];

  try {
    const params = {
      TableName: AI_USAGE_TABLE,
      Key: { userId, date: today },
      UpdateExpression: 'ADD wordsGenerated :inc SET lastProvider = :provider, lastGeneratedAt = :timestamp',
      ExpressionAttributeValues: {
        ':inc': 1,
        ':provider': provider,
        ':timestamp': new Date().toISOString()
      }
    };

    await docClient.send(new UpdateCommand(params));
  } catch (error) {
    console.error('Error updating usage tracking:', error);
  }
}

/**
 * Get user profile
 */
async function getUserProfile(userId) {
  try {
    const params = {
      TableName: USERS_TABLE,
      Key: { userId }
    };

    const result = await docClient.send(new GetCommand(params));
    return result.Item || {
      userId,
      ageGroup: 'adult',
      context: 'general',
      examPrep: null
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return {
      userId,
      ageGroup: 'adult',
      context: 'general',
      examPrep: null
    };
  }
}

/**
 * Generate word using AI with LLM router
 * Now includes image fetching
 */
async function generateAIWord(user, customPrompt = null) {
  const prompt = buildPrompt(user, customPrompt);
  
  // Get API keys from Secrets Manager
  const apiKeys = await getApiKeys();

  // Try providers in priority order
  for (const [providerKey, config] of Object.entries(LLM_PROVIDERS)) {
    const apiKey = apiKeys[providerKey.toLowerCase()];
    
    if (!apiKey) {
      console.log(`No API key found for ${config.name}, skipping...`);
      continue;
    }

    try {
      console.log(`Attempting word generation with ${config.name}...`);
      const wordData = await callLLM(config, apiKey, prompt);
      
      if (wordData) {
        wordData.provider = config.name;
        wordData.userId = user.userId;
        wordData.date = new Date().toISOString().split('T')[0];
        wordData.wordId = randomUUID();
        wordData.userContext = user.context;
        wordData.ageGroup = user.ageGroup;
        wordData.examPrep = user.examPrep;
        wordData.createdAt = new Date().toISOString();
        
        // Fetch image for the word
        try {
          console.log(`Fetching image for word: ${wordData.word}`);
          const imageUrl = await fetchWordImage(wordData.word, wordData.definition, apiKeys.unsplash);
          wordData.imageUrl = imageUrl || '';
        } catch (imageError) {
          console.error('Error fetching image:', imageError);
          wordData.imageUrl = '';
        }
        
        return wordData;
      }
    } catch (error) {
      console.error(`Error with ${config.name}:`, error.message);
      // Continue to next provider
    }
  }

  throw new Error('All LLM providers failed. Please try again later.');
}

/**
 * Build LLM prompt based on user context
 */
function buildPrompt(user, customPrompt) {
  const basePrompt = `Generate a vocabulary word suitable for the following profile:

Age Group: ${user.ageGroup}
Context: ${user.context}
${user.examPrep ? `Exam Preparation: ${user.examPrep}` : ''}
${customPrompt ? `\nCustom Requirements: ${customPrompt}` : ''}

Provide a response in the following JSON format:
{
  "word": "the vocabulary word",
  "definition": "clear, concise definition",
  "partOfSpeech": "noun/verb/adjective/etc",
  "pronunciation": "IPA phonetic notation",
  "syllables": "word broken into syllables with hyphens",
  "difficulty": 1-5 (1=easy, 5=advanced),
  "sentences": ["example sentence 1", "example sentence 2", "example sentence 3"],
  "synonyms": ["synonym1", "synonym2", "synonym3"],
  "antonyms": ["antonym1", "antonym2"],
  "usageContext": "brief note on when/how to use this word",
  "etymology": "optional brief word origin"
}

Requirements:
- Age-appropriate for ${user.ageGroup}
- Relevant to ${user.context} context
- Useful for vocabulary building
- Include 3 natural example sentences
- Must be a real English word
- Provide accurate pronunciation

Return ONLY the JSON object, no additional text.`;

  return basePrompt;
}

/**
 * Call LLM provider API
 */
async function callLLM(config, apiKey, prompt) {
  try {
    const requestData = {
      model: config.models[0],
      messages: [
        {
          role: 'system',
          content: 'You are a vocabulary expert and English language teacher. Provide educational vocabulary words with detailed information in JSON format.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    };

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };

    const response = await axios.post(config.apiUrl, requestData, {
      headers,
      timeout: 30000
    });

    if (response.data?.choices?.[0]?.message?.content) {
      const content = response.data.choices[0].message.content;
      const wordData = JSON.parse(content);
      
      // Validate response
      if (wordData.word && wordData.definition && wordData.sentences) {
        return wordData;
      }
    }

    return null;
  } catch (error) {
    console.error(`LLM API error for ${config.name}:`, error.message);
    throw error;
  }
}

/**
 * Get API keys from AWS Secrets Manager
 */
async function getApiKeys() {
  try {
    const command = new GetSecretValueCommand({ SecretId: SECRET_NAME });
    const response = await secretsClient.send(command);
    
    if (response.SecretString) {
      return JSON.parse(response.SecretString);
    }
    
    return {};
  } catch (error) {
    console.error('Error retrieving API keys from Secrets Manager:', error);
    
    // Fallback to environment variables for development
    return {
      groq: process.env.GROQ_API_KEY,
      unsplash: process.env.UNSPLASH_API_KEY
    };
  }
}

/**
 * Fetch relevant image for the word using Unsplash API
 */
async function fetchWordImage(word, definition, apiKey) {
  if (!apiKey) {
    console.log('No Unsplash API key available, skipping image fetch');
    return '';
  }
  
  try {
    // Search for images related to the word using Unsplash API
    const searchQuery = encodeURIComponent(word);
    const url = `https://api.unsplash.com/search/photos?query=${searchQuery}&per_page=1&orientation=landscape`;
    
    // Use proper Authorization header (public authentication)
    // Reference: https://unsplash.com/documentation#public-authentication
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Client-ID ${apiKey}`,
        'Accept-Version': 'v1'
      },
      timeout: 10000
    });
    
    if (response.data?.results?.length > 0) {
      const image = response.data.results[0];
      console.log(`Found image for word "${word}": ${image.id}`);
      // Return the regular size URL
      return image.urls.regular;
    }
    
    console.log(`No image found for word: ${word}`);
    return '';
  } catch (error) {
    console.error('Error fetching word image:', error.message);
    if (error.response) {
      console.error('Unsplash API error status:', error.response.status);
      console.error('Unsplash API error data:', error.response.data);
    }
    return '';
  }
}

/**
 * Store generated word in DynamoDB
 */
async function storeGeneratedWord(wordData) {
  const params = {
    TableName: DAILY_WORDS_TABLE,
    Item: {
      userId: wordData.userId,
      date: wordData.date,
      wordId: wordData.wordId,
      word: wordData.word,
      syllables: wordData.syllables,
      pronunciation: wordData.pronunciation,
      definition: wordData.definition,
      partOfSpeech: wordData.partOfSpeech,
      sentences: wordData.sentences || [],
      synonyms: wordData.synonyms || [],
      antonyms: wordData.antonyms || [],
      difficulty: wordData.difficulty || 3,
      usageContext: wordData.usageContext || '',
      etymology: wordData.etymology || '',
      audioUrl: '',
      imageUrl: '',
      userContext: wordData.userContext,
      ageGroup: wordData.ageGroup,
      examPrep: wordData.examPrep,
      provider: wordData.provider,
      practiceStatus: 'pending',
      createdAt: wordData.createdAt
    }
  };

  await docClient.send(new PutCommand(params));
}

/**
 * Create HTTP response
 */
function createResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  };
}

/**
 * Export for testing
 */
export { checkRateLimit, generateAIWord };

