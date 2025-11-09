import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import axios from 'axios';
import { randomUUID } from 'crypto';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const bedrockClient = new BedrockRuntimeClient({ region: 'us-east-1' });
const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });

const USERS_TABLE = process.env.USERS_TABLE;
const DAILY_WORDS_TABLE = process.env.DAILY_WORDS_TABLE;
const WORD_BANK_TABLE = process.env.WORD_BANK_TABLE;
const SECRET_NAME = process.env.SECRET_NAME || 'onewordaday/llm-api-keys';
const USE_AI_GENERATION = process.env.USE_AI_GENERATION !== 'false'; // Default to true

// LLM Provider configurations
const LLM_PROVIDERS = {
  GROQ: {
    name: 'Groq',
    apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
    models: ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'],
    priority: 1
  }
};

/**
 * 
 * Lambda handler for getting today's word
 * API: GET /word/today
 */
export const handler = async (event) => {
  console.log('Get todays word handler triggered', { event });

  try {
    // Extract user ID from Cognito authorizer
    const userId = event.requestContext?.authorizer?.claims?.sub;
    
    if (!userId) {
      return {
        statusCode: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: 'Unauthorized' })
      };
    }

    // Get today's date
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Query parameters for specific date (optional)
    const queryDate = event.queryStringParameters?.date || today;

    // Get word for the specified date
    const params = {
      TableName: DAILY_WORDS_TABLE,
      Key: {
        userId,
        date: queryDate
      }
    };

    const result = await docClient.send(new GetCommand(params));

    console.log(`AGWord START1: ${result.Item.practiceStatus}`);

    // If word exists and was skipped, generate a new one
    if (result.Item && result.Item.practiceStatus === 'skipped' && queryDate === today) {
      console.log(`Word was skipped, generating new word for user ${userId}`);
      
      // Get user profile
      const user = await getUserProfile(userId);
      
      console.log(`AGWord START2: ${user.userId}`);
     
      // Generate new word
      const newWord = await generateNewWord(user, queryDate);
      
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'New word generated successfully',
          word: newWord,
          regenerated: true
        })
      };
    }

    if (!result.Item) {
      // Try to generate a word if none exists for today
      if (queryDate === today) {
        console.log(`No word found for today, generating for user ${userId}`);
        
        const user = await getUserProfile(userId);
        const newWord = await generateNewWord(user, queryDate);
        
        return {
          statusCode: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: 'Word generated successfully',
            word: newWord,
            generated: true
          })
        };
      }
      
      return {
        statusCode: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Word not found for this date',
          date: queryDate,
          help: 'Word generation happens daily at midnight UTC. Please check back later.'
        })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Word retrieved successfully',
        word: result.Item
      })
    };
  } catch (error) {
    console.error('Error getting todays word:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      userId: event.requestContext?.authorizer?.claims?.sub
    });
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Error retrieving word',
        error: error.message,
        errorType: error.name,
        stack: error.stack
      })
    };
  }
};

/**
 * Get user profile from DynamoDB
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
      difficultyPreference: 'medium'
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    // Return default profile if error
    return {
      userId,
      ageGroup: 'adult',
      context: 'general',
      difficultyPreference: 'medium'
    };
  }
}

/**
 * Generate new word for user
 * Now supports both AI-based generation (with images) and word bank fallback
 */
async function generateNewWord(user, date) {
  try {
    console.log('generateNewWord called', { userId: user.userId, date });
    
    // Get user's recent words to avoid repetition
    const recentWords = await getRecentWords(user.userId, 90); // Check last 90 days
    console.log(`Retrieved ${recentWords.length} recent words`);
    
    const recentWordTexts = recentWords
      .filter(w => w && w.word)
      .map(w => w.word.toLowerCase());
    
    console.log(`Generating new word for user ${user.userId}, avoiding ${recentWordTexts.length} recent words`);
    
    let wordData;
    console.log(`AGWord START4: ${USE_AI_GENERATION}`);
    
    // Try AI-based generation first
    if (USE_AI_GENERATION) {
      try {
        console.log(`AGWord START5: ${USE_AI_GENERATION}`);
        console.log('Using AI-based word generation with image');
        wordData = await generateAIWordWithImage(user, recentWordTexts);
        console.log('AG Secret Test -wordData:', wordData);
        wordData.generationMethod = 'AI';
        console.log('AI generation successful:', wordData.word);
      } catch (error) {
        console.error('AI generation failed:', error.message);
        console.error('AI error stack:', error.stack);
        console.log('Falling back to word bank');
        // Fall back to word bank
        wordData = await generateFromWordBank(user, date, recentWordTexts);
        wordData.generationMethod = 'WordBank';
      }
    } else {
      // Use word bank directly
      console.log('Using word bank generation (USE_AI_GENERATION=false)');
      wordData = await generateFromWordBank(user, date, recentWordTexts);
      wordData.generationMethod = 'WordBank';
    }
    
    // Ensure required fields
    wordData.userId = user.userId;
    wordData.date = date;
    wordData.practiceStatus = 'pending';
    wordData.createdAt = new Date().toISOString();
    
    console.log('Storing word in DynamoDB:', { word: wordData.word, userId: wordData.userId, date: wordData.date });
    
    // Store the word in DynamoDB
    await storeDailyWord(wordData);
    
    console.log(`Word generated successfully: ${wordData.word} (method: ${wordData.generationMethod})`);
    return wordData;
  } catch (error) {
    console.error('CRITICAL ERROR in generateNewWord:', error);
    console.error('Error stack:', error.stack);
    throw new Error(`Failed to generate word: ${error.message}`);
  }
}

/**
 * Generate word using AI with image
 */
async function generateAIWordWithImage(user, excludeWords) {
  const apiKeys = await getApiKeys();
  console.log('AG Secret Test -generateAIWordWithImage -API keys:', apiKeys);
  
  // Build prompt for AI
  const prompt = buildAIPrompt(user, excludeWords);
  console.log('AG Secret Test -generateAIWordWithImage -Prompt:', prompt);
  
  // Try providers in priority order
  let wordData = null;
  for (const [providerKey, config] of Object.entries(LLM_PROVIDERS)) {
    const apiKey = apiKeys[providerKey.toLowerCase()];
    
    if (!apiKey) {
      console.log(`No API key found for ${config.name}, skipping...`);
      continue;
    }
    
    try {
      console.log(`Attempting word generation with ${config.name}...`);
      wordData = await callLLM(config, apiKey, prompt);
      console.log('AG Secret Test -wordData:', wordData);
      
      if (wordData && wordData.word) {
        wordData.provider = config.name;
        break;
      }
    } catch (error) {
      console.error(`Error with ${config.name}:`, error.message);
      // Continue to next provider
    }
  }
  
  if (!wordData || !wordData.word) {
    throw new Error('All LLM providers failed to generate a word');
  }
  
  // Fetch image for the word
  try {
    console.log(`Fetching image for word: ${wordData.word}`);
    const imageUrl = await fetchWordImage(wordData.word, wordData.definition, apiKeys.unsplash);
    wordData.imageUrl = imageUrl || '';
    console.log(`Image URL ${imageUrl ? 'found' : 'not found'}: ${imageUrl || 'N/A'}`);
  } catch (error) {
    console.error('Error fetching image:', error);
    wordData.imageUrl = '';
  }
  
  // Set word ID
  wordData.wordId = randomUUID();
  wordData.userContext = user.context || 'general';
  wordData.ageGroup = user.ageGroup || 'adult';
  wordData.audioUrl = ''; // Can be added later
  
  return wordData;
}

/**
 * Generate word from word bank (fallback method)
 */
async function generateFromWordBank(user, date, excludeWords) {
  try {
    console.log('generateFromWordBank called', { userId: user.userId });
    
    const recentWordIds = (await getRecentWords(user.userId, 30))
      .filter(w => w && w.wordId)
      .map(w => w.wordId);
    
    console.log(`Excluding ${recentWordIds.length} recent word IDs`);
    
    // Select appropriate word based on user preferences
    const word = await selectWord(user, recentWordIds);
    console.log('Selected word from bank:', word.word);
    
    // Enrich word with contextual information
    const enrichedWord = await enrichWord(word, user);
    console.log('Word enriched with sentences');
    
    // Create word data
    const wordData = {
      wordId: word.wordId,
      word: word.word,
      syllables: word.syllables || splitIntoSyllables(word.word),
      pronunciation: word.pronunciation,
      definition: word.definition,
      partOfSpeech: word.partOfSpeech,
      sentences: enrichedWord.sentences,
      synonyms: word.synonyms || [],
      antonyms: word.antonyms || [],
      difficulty: word.difficulty || 3,
      audioUrl: word.audioUrl || '',
      imageUrl: word.imageUrl || '',
      contextEvents: enrichedWord.contextEvents || [],
      userContext: user.context || 'general'
    };
    
    return wordData;
  } catch (error) {
    console.error('Error in generateFromWordBank:', error);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

/**
 * Build AI prompt for word generation
 */
function buildAIPrompt(user, excludeWords) {
  const excludeList = excludeWords.length > 0 
    ? `\n\nDo NOT use these recently used words: ${excludeWords.slice(-30).join(', ')}`
    : '';
  
  return `Generate a vocabulary word suitable for the following profile:

Age Group: ${user.ageGroup || 'adult'}
Context: ${user.context || 'general'}
${user.examPrep ? `Exam Preparation: ${user.examPrep}` : ''}
Difficulty Preference: ${user.difficultyPreference || 'medium'}${excludeList}

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
- Age-appropriate for ${user.ageGroup || 'adult'}
- Relevant to ${user.context || 'general'} context
- Useful for vocabulary building
- Include 3 natural example sentences
- Must be a real English word
- Provide accurate pronunciation in IPA format
- DO NOT repeat any of the excluded words listed above

Return ONLY the JSON object, no additional text.`;
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
          content: 'You are a vocabulary expert and English language teacher. Provide educational vocabulary words with detailed information in JSON format. Always return valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
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
    console.log('Fetching API keys from Secrets Manager:', SECRET_NAME);
    const command = new GetSecretValueCommand({ SecretId: SECRET_NAME });
    const response = await secretsClient.send(command);
    
    if (response.SecretString) {
      console.log('SecretString received, length:', response.SecretString.length);
      console.log('SecretString preview:', response.SecretString.substring(0, 50));
      
      try {
        const parsed = JSON.parse(response.SecretString);
        console.log('AG Secret Test - SUCCESSFULLY parsed API keys, found keys:', Object.keys(parsed));
        return parsed;
      } catch (parseError) {
        console.error('AG Secret Test - Failed to parse SecretString as JSON:', parseError.message);
        console.log('AG Secret Test - Attempting to parse malformed secret format...');
        
        // Try to parse malformed JSON-like format: {key1:value1,key2:value2,...}
        const rawValue = response.SecretString.trim();
        
        // Check if it looks like the malformed format with curly braces
        const malformedMatch = rawValue.match(/^\{(.+)\}$/);
        if (malformedMatch) {
          console.log('AG Secret Test - Detected malformed JSON-like format, extracting keys...');
          
          const content = malformedMatch[1];
          const pairs = content.split(',');
          const extractedKeys = {};
          
          pairs.forEach(pair => {
            const keyValueMatch = pair.match(/^(\w+):(.+)$/);
            if (keyValueMatch) {
              const key = keyValueMatch[1].trim();
              const value = keyValueMatch[2].trim();
              
              console.log(`AG Secret Test - Found: ${key} = ${value.substring(0, Math.min(8, value.length))}...`);
              
              // Map known keys
              if (['groq', 'unsplash'].includes(key)) {
                extractedKeys[key] = value;
              }
            }
          });
          
          if (Object.keys(extractedKeys).length > 0) {
            console.log('AG Secret Test - Successfully extracted keys:', Object.keys(extractedKeys));
            console.warn('AG Secret Test - WARNING: Secret is in malformed format. Run fix-secret.ps1 to repair it.');
            return extractedKeys;
          }
        }
        
        console.error('AG Secret Test - Could not parse malformed secret format');
        console.error('AG Secret Test - SecretString content:', response.SecretString);
        throw new Error('AG Secret Test - Secret contains invalid JSON and could not be parsed');
      }
    }
    
    console.log('AG Secret Test -No SecretString in response, returning empty object');
    return {};
  } catch (error) {
    console.error('AG Secret Test -Error retrieving API keys from Secrets Manager:', error.message);
    console.error('AG Secret Test -Error name:', error.name);
    console.error('AG Secret Test -Error code:', error.code);
    
    // Check if secret doesn't exist
    if (error.name === 'ResourceNotFoundException') {
      console.log('AG Secret Test -Secret does not exist, will use word bank fallback');
    }
    
    // Fallback to environment variables for development
    console.log('AG Secret Test -Using environment variable fallback for API keys');
    return {
      groq: process.env.GROQ_API_KEY || null,
      unsplash: process.env.UNSPLASH_API_KEY || null
    };
  }
}

/**
 * Fetch relevant image for the word using Unsplash API
 */
async function fetchWordImage(word, definition, apiKey) {
  if (!apiKey) {
    console.log('AG Secret Test - No Unsplash API key available, skipping image fetch');
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
      console.log(`AG Secret Test - Found image for word "${word}": ${image.id}`);
      // Return the regular size URL
      return image.urls.regular;
    }
    
    console.log(`AG Secret Test - No image found for word: ${word}`);
    return '';
  } catch (error) {
    console.error('AG Secret Test - Error fetching word image:', error.message);
    if (error.response) {
      console.error('AG Secret Test - Unsplash API error status:', error.response.status);
      console.error('AG Secret Test - Unsplash API error data:', error.response.data);
    }
    return '';
  }
}

/**
 * Get user's recent words
 */
async function getRecentWords(userId, days) {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const params = {
    TableName: DAILY_WORDS_TABLE,
    KeyConditionExpression: 'userId = :userId AND #date BETWEEN :startDate AND :endDate',
    ExpressionAttributeNames: {
      '#date': 'date'
    },
    ExpressionAttributeValues: {
      ':userId': userId,
      ':startDate': startDate,
      ':endDate': endDate
    }
  };

  try {
    const result = await docClient.send(new QueryCommand(params));
    return result.Items || [];
  } catch (error) {
    console.error('Error getting recent words:', error);
    return [];
  }
}

/**
 * Select word from word bank based on user preferences
 */
async function selectWord(user, excludeWordIds) {
  try {
    console.log('selectWord called', { ageGroup: user.ageGroup, excludeCount: excludeWordIds.length });
    
    // Determine difficulty based on age group
    const difficultyMap = {
      'child': [1, 2],
      'teen': [2, 3],
      'young_adult': [3, 4],
      'adult': [4, 5],
      'senior': [3, 4, 5]
    };

    const difficulties = difficultyMap[user.ageGroup] || [3, 4];
    console.log('Selected difficulties:', difficulties);
    
    // Query word bank
    const params = {
      TableName: WORD_BANK_TABLE,
      FilterExpression: 'difficulty IN (:d1, :d2)',
      ExpressionAttributeValues: {
        ':d1': difficulties[0],
        ':d2': difficulties[1] || difficulties[0]
      },
      Limit: 100
    };

    console.log('Scanning word bank with params:', JSON.stringify(params));
    const result = await docClient.send(new ScanCommand(params));
    let words = result.Items || [];
    
    console.log(`Found ${words.length} words in word bank`);

    // Filter out recently used words
    if (excludeWordIds.length > 0) {
      const beforeFilter = words.length;
      words = words.filter(w => !excludeWordIds.includes(w.wordId));
      console.log(`Filtered out ${beforeFilter - words.length} recently used words`);
    }

    if (words.length === 0) {
      console.log('No words available in word bank, using default word');
      // Fallback to default word if no matches
      return getDefaultWord();
    }

    // Randomly select from matching words
    const randomIndex = Math.floor(Math.random() * words.length);
    const selectedWord = words[randomIndex];
    console.log(`Selected word: ${selectedWord.word} (${selectedWord.wordId})`);
    return selectedWord;
  } catch (error) {
    console.error('Error in selectWord:', error);
    console.error('Error stack:', error.stack);
    console.log('Using default word due to error');
    return getDefaultWord();
  }
}

/**
 * Enrich word with AI-generated contextual sentences
 */
async function enrichWord(word, user) {
  try {
    // Use examples from word bank if available
    if (word.examples && word.examples.length >= 3) {
      return {
        sentences: word.examples.slice(0, 3),
        contextEvents: []
      };
    }

    // Generate contextual sentences using Amazon Bedrock
    const sentences = await generateContextualSentences(word, user);
    
    return {
      sentences,
      contextEvents: []
    };
  } catch (error) {
    console.error('Error enriching word:', error);
    return {
      sentences: [
        `The word "${word.word}" is commonly used in everyday conversation.`,
        `Understanding ${word.word} can help improve your vocabulary.`,
        `Try to use ${word.word} in your daily communication.`
      ],
      contextEvents: []
    };
  }
}

/**
 * Generate contextual sentences using Bedrock AI
 */
async function generateContextualSentences(word, user) {
  const prompt = `Generate 3 example sentences using the word "${word.word}" (${word.partOfSpeech}). 
Definition: ${word.definition}
Context: ${user.context || 'general'}
Age group: ${user.ageGroup || 'adult'}

The sentences should be:
1. Age-appropriate and relevant to the user's context
2. Natural and conversational
3. Clearly demonstrate the meaning of the word

Return only the 3 sentences, one per line, without numbering.`;

  try {
    const input = {
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    };

    const command = new InvokeModelCommand(input);
    const response = await bedrockClient.send(command);
    
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const sentences = responseBody.content[0].text.trim().split('\n').filter(s => s.trim());
    
    return sentences.slice(0, 3);
  } catch (error) {
    console.error('Bedrock API error:', error);
    // Return default sentences if AI fails
    return [
      `The ${word.word} is an important concept to understand.`,
      `Learning about ${word.word} can be beneficial.`,
      `Consider the meaning of ${word.word} in your daily life.`
    ];
  }
}

/**
 * Store daily word in DynamoDB
 */
async function storeDailyWord(wordData) {
  const params = {
    TableName: DAILY_WORDS_TABLE,
    Item: wordData
  };

  await docClient.send(new PutCommand(params));
}

/**
 * Split word into syllables (simple implementation)
 */
function splitIntoSyllables(word) {
  // Simple heuristic for syllabification
  const vowels = 'aeiouy';
  const syllables = [];
  let currentSyllable = '';

  for (let i = 0; i < word.length; i++) {
    currentSyllable += word[i];
    
    if (vowels.includes(word[i].toLowerCase())) {
      if (i < word.length - 1 && !vowels.includes(word[i + 1].toLowerCase())) {
        syllables.push(currentSyllable);
        currentSyllable = '';
      }
    }
  }

  if (currentSyllable) {
    syllables.push(currentSyllable);
  }

  return syllables.length > 0 ? syllables.join('-') : word;
}

/**
 * Get default word as fallback
 */
function getDefaultWord() {
  return {
    wordId: 'default-serendipity',
    word: 'serendipity',
    syllables: 'ser-en-dip-i-ty',
    pronunciation: '/ˌserənˈdipədē/',
    definition: 'The occurrence and development of events by chance in a happy or beneficial way',
    partOfSpeech: 'noun',
    difficulty: 3,
    synonyms: ['fortune', 'luck', 'chance'],
    antonyms: ['misfortune', 'bad luck'],
    examples: [
      'Finding that book was pure serendipity.',
      'Their meeting was a fortunate serendipity.',
      'It was serendipity that we bumped into each other.'
    ],
    audioUrl: '',
    imageUrl: ''
  };
}

