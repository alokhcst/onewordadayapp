import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' });

const USERS_TABLE = process.env.USERS_TABLE;
const DAILY_WORDS_TABLE = process.env.DAILY_WORDS_TABLE;
const WORD_BANK_TABLE = process.env.WORD_BANK_TABLE;
const AI_WORD_GEN_FUNCTION = process.env.AI_WORD_GEN_FUNCTION;
const USE_AI_GENERATION = process.env.USE_AI_GENERATION === 'true';

/**
 * Lambda handler for daily word generation
 * Triggered by EventBridge daily at midnight UTC
 * Now supports both AI-based and word bank generation
 */
export const handler = async (event) => {
  console.log('Starting daily word generation', { event, useAI: USE_AI_GENERATION });

  try {
    // Get all active users
    const users = await getAllUsers();
    console.log(`Found ${users.length} users`);

    const results = [];
    
    // Generate personalized word for each user
    for (const user of users) {
      try {
        let wordData;
        
        // Choose generation method based on configuration
        if (USE_AI_GENERATION && AI_WORD_GEN_FUNCTION) {
          // Use AI-based word generation
          wordData = await generateWordWithAI(user);
        } else {
          // Fall back to word bank generation
          wordData = await generateWordFromBank(user);
        }
        
        results.push({ userId: user.userId, success: true, word: wordData.word, method: wordData.method });
      } catch (error) {
        console.error(`Error generating word for user ${user.userId}:`, error);
        results.push({ userId: user.userId, success: false, error: error.message });
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Daily word generation completed',
        processed: users.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        method: USE_AI_GENERATION ? 'AI' : 'WordBank',
        results
      })
    };
  } catch (error) {
    console.error('Error in word generation:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error generating daily words',
        error: error.message
      })
    };
  }
};

/**
 * Get all active users from DynamoDB
 */
async function getAllUsers() {
  const params = {
    TableName: USERS_TABLE
  };

  const result = await docClient.send(new ScanCommand(params));
  return result.Items || [];
}

/**
 * Generate word using AI Lambda function
 */
async function generateWordWithAI(user) {
  try {
    const payload = {
      userId: user.userId,
      requestContext: {
        authorizer: {
          claims: {
            sub: user.userId
          }
        }
      }
    };

    const command = new InvokeCommand({
      FunctionName: AI_WORD_GEN_FUNCTION,
      Payload: JSON.stringify(payload)
    });

    const response = await lambdaClient.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.Payload));
    
    if (result.statusCode === 200) {
      const body = JSON.parse(result.body);
      return { ...body.word, method: 'AI' };
    } else {
      throw new Error(`AI generation failed: ${result.body}`);
    }
  } catch (error) {
    console.error('AI generation error, falling back to word bank:', error);
    // Fall back to word bank if AI fails
    return await generateWordFromBank(user);
  }
}

/**
 * Generate word from existing word bank (legacy method)
 */
async function generateWordFromBank(user) {
  const today = new Date().toISOString().split('T')[0];

  // Check if word already exists for today
  const existingWord = await getExistingWordForToday(user.userId, today);
  if (existingWord) {
    console.log(`Word already exists for user ${user.userId} on ${today}`);
    return { ...existingWord, method: 'WordBank' };
  }

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
    date: today,
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
    createdAt: new Date().toISOString(),
    method: 'WordBank'
  };

  await storeDailyWord(wordData);
  
  return wordData;
}

/**
 * Check if word already exists for today
 */
async function getExistingWordForToday(userId, date) {
  const params = {
    TableName: DAILY_WORDS_TABLE,
    Key: {
      userId,
      date
    }
  };

  const result = await docClient.send(new GetCommand(params));
  return result.Item;
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

  const result = await docClient.send(new QueryCommand(params));
  return result.Items || [];
}

/**
 * Select word from word bank based on user preferences
 */
async function selectWord(user, excludeWordIds) {
  const difficultyMap = {
    'child': [1, 2],
    'teen': [2, 3],
    'young_adult': [3, 4],
    'adult': [4, 5],
    'senior': [3, 4, 5]
  };

  const difficulties = difficultyMap[user.ageGroup] || [3, 4];
  
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

  if (excludeWordIds.length > 0) {
    words = words.filter(w => !excludeWordIds.includes(w.wordId));
  }

  if (words.length === 0) {
    return getDefaultWord();
  }

  const randomIndex = Math.floor(Math.random() * words.length);
  return words[randomIndex];
}

/**
 * Enrich word with contextual information
 */
async function enrichWord(word, user) {
  try {
    if (word.examples && word.examples.length >= 3) {
      return {
        sentences: word.examples.slice(0, 3),
        contextEvents: []
      };
    }

    return {
      sentences: [
        `The word "${word.word}" is commonly used in everyday conversation.`,
        `Understanding ${word.word} can help improve your vocabulary.`,
        `Try to use ${word.word} in your daily communication.`
      ],
      contextEvents: []
    };
  } catch (error) {
    console.error('Error enriching word:', error);
    return {
      sentences: [
        `The word "${word.word}" is useful to know.`,
        `Practice using ${word.word} regularly.`,
        `${word.word} appears frequently in ${user.context || 'general'} contexts.`
      ],
      contextEvents: []
    };
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
 * Split word into syllables
 */
function splitIntoSyllables(word) {
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
