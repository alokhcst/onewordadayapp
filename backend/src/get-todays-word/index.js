const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const bedrockClient = new BedrockRuntimeClient({ region: 'us-east-1' });

const USERS_TABLE = process.env.USERS_TABLE;
const DAILY_WORDS_TABLE = process.env.DAILY_WORDS_TABLE;
const WORD_BANK_TABLE = process.env.WORD_BANK_TABLE;

/**
 * Lambda handler for getting today's word
 * API: GET /word/today
 */
exports.handler = async (event) => {
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

    // If word exists and was skipped, generate a new one
    if (result.Item && result.Item.practiceStatus === 'skipped' && queryDate === today) {
      console.log(`Word was skipped, generating new word for user ${userId}`);
      
      // Get user profile
      const user = await getUserProfile(userId);
      
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
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Error retrieving word',
        error: error.message
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
 */
async function generateNewWord(user, date) {
  // Get user's recent words to avoid repetition
  const recentWords = await getRecentWords(user.userId, 30);
  const recentWordIds = recentWords.map(w => w.wordId);

  // Select appropriate word based on user preferences
  const word = await selectWord(user, recentWordIds);
  
  // Enrich word with contextual information
  const enrichedWord = await enrichWord(word, user);

  // Store the word in DynamoDB
  const wordData = {
    userId: user.userId,
    date,
    wordId: word.wordId,
    word: word.word,
    syllables: word.syllables || splitIntoSyllables(word.word),
    pronunciation: word.pronunciation,
    definition: word.definition,
    partOfSpeech: word.partOfSpeech,
    sentences: enrichedWord.sentences,
    synonyms: word.synonyms || [],
    antonyms: word.antonyms || [],
    audioUrl: word.audioUrl || '',
    imageUrl: word.imageUrl || '',
    contextEvents: enrichedWord.contextEvents || [],
    userContext: user.context || 'general',
    practiceStatus: 'pending',
    createdAt: new Date().toISOString()
  };

  await storeDailyWord(wordData);
  
  return wordData;
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
  // Determine difficulty based on age group
  const difficultyMap = {
    'child': [1, 2],
    'teen': [2, 3],
    'young_adult': [3, 4],
    'adult': [4, 5],
    'senior': [3, 4, 5]
  };

  const difficulties = difficultyMap[user.ageGroup] || [3, 4];
  
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

  const result = await docClient.send(new ScanCommand(params));
  let words = result.Items || [];

  // Filter out recently used words
  if (excludeWordIds.length > 0) {
    words = words.filter(w => !excludeWordIds.includes(w.wordId));
  }

  if (words.length === 0) {
    // Fallback to default word if no matches
    return getDefaultWord();
  }

  // Randomly select from matching words
  const randomIndex = Math.floor(Math.random() * words.length);
  return words[randomIndex];
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

