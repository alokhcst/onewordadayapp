import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import axios from 'axios';
import { randomUUID } from 'crypto';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const s3Client = new S3Client({});
const secretsClient = new SecretsManagerClient({});

const WORD_BANK_TABLE = process.env.WORD_BANK_TABLE;
const AUDIO_BUCKET = process.env.AUDIO_BUCKET;
const IMAGES_BUCKET = process.env.IMAGES_BUCKET;

/**
 * Lambda handler for content enrichment
 * Enriches word bank with definitions, pronunciations, audio, and images
 */
export const handler = async (event) => {
  console.log('Content enrichment triggered', { event });

  try {
    const { word, partOfSpeech } = event;

    if (!word) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Word is required' })
      };
    }

    // Get API keys from Secrets Manager
    const apiKeys = await getApiKeys();

    // Fetch word data from dictionary API
    const definition = await fetchDefinition(word, apiKeys.dictionaryApiKey);
    
    // Fetch pronunciation
    const pronunciation = definition.pronunciation || await fetchPronunciation(word);
    
    // Download and store audio
    const audioUrl = await fetchAndStoreAudio(word, apiKeys.forvoApiKey);
    
    // Fetch and store image (optional)
    const imageUrl = await fetchAndStoreImage(word, apiKeys.unsplashApiKey);

    // Create word entry
    const wordData = {
      wordId: randomUUID(),
      word: word.toLowerCase(),
      definition: definition.definition,
      partOfSpeech: partOfSpeech || definition.partOfSpeech || 'noun',
      pronunciation: pronunciation,
      synonyms: definition.synonyms || [],
      antonyms: definition.antonyms || [],
      examples: definition.examples || [],
      difficulty: calculateDifficulty(word, definition),
      category: 'general',
      frequency: definition.frequency || 0,
      audioUrl,
      imageUrl,
      ageGroups: determineAgeGroups(definition.difficulty || 3),
      contexts: ['general'],
      createdAt: new Date().toISOString()
    };

    // Store in Word Bank
    await storeWordInBank(wordData);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Word enriched successfully',
        wordData
      })
    };
  } catch (error) {
    console.error('Error in content enrichment:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error enriching content',
        error: error.message
      })
    };
  }
};

/**
 * Get API keys from AWS Secrets Manager
 */
async function getApiKeys() {
  try {
    const command = new GetSecretValueCommand({
      SecretId: 'onewordaday/api-keys'
    });
    
    const response = await secretsClient.send(command);
    return JSON.parse(response.SecretString);
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return {
      dictionaryApiKey: process.env.DICTIONARY_API_KEY || '',
      forvoApiKey: process.env.FORVO_API_KEY || '',
      unsplashApiKey: process.env.UNSPLASH_API_KEY || ''
    };
  }
}

/**
 * Fetch word definition from Merriam-Webster API
 */
async function fetchDefinition(word, apiKey) {
  try {
    const url = `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${word}?key=${apiKey}`;
    const response = await axios.get(url);
    
    if (Array.isArray(response.data) && response.data.length > 0) {
      const entry = response.data[0];
      
      if (typeof entry === 'object') {
        return {
          definition: entry.shortdef?.[0] || 'Definition not available',
          partOfSpeech: entry.fl || 'noun',
          pronunciation: entry.hwi?.prs?.[0]?.mw || '',
          synonyms: entry.meta?.syns?.[0] || [],
          antonyms: entry.meta?.ants?.[0] || [],
          examples: entry.def?.[0]?.sseq?.[0]?.[0]?.[1]?.dt?.[1]?.[1]?.[0]?.t || []
        };
      }
    }
    
    // Fallback to basic definition
    return {
      definition: `A word meaning: ${word}`,
      partOfSpeech: 'noun',
      pronunciation: '',
      synonyms: [],
      antonyms: [],
      examples: []
    };
  } catch (error) {
    console.error('Error fetching definition:', error);
    return {
      definition: `Definition for ${word}`,
      partOfSpeech: 'noun',
      pronunciation: '',
      synonyms: [],
      antonyms: [],
      examples: []
    };
  }
}

/**
 * Fetch pronunciation using IPA notation
 */
async function fetchPronunciation(word) {
  // Implement pronunciation fetching logic
  return `/ˈwərd/`; // Placeholder
}

/**
 * Fetch and store audio pronunciation
 */
async function fetchAndStoreAudio(word, apiKey) {
  try {
    // Using Forvo API or similar
    const url = `https://apifree.forvo.com/key/${apiKey}/format/json/action/word-pronunciations/word/${word}/language/en`;
    const response = await axios.get(url);
    
    if (response.data.items && response.data.items.length > 0) {
      const audioUrl = response.data.items[0].pathmp3;
      
      // Download audio file
      const audioResponse = await axios.get(audioUrl, { responseType: 'arraybuffer' });
      const audioBuffer = Buffer.from(audioResponse.data);
      
      // Upload to S3
      const key = `audio/${word}.mp3`;
      await s3Client.send(new PutObjectCommand({
        Bucket: AUDIO_BUCKET,
        Key: key,
        Body: audioBuffer,
        ContentType: 'audio/mpeg'
      }));
      
      return `https://${AUDIO_BUCKET}.s3.amazonaws.com/${key}`;
    }
    
    return '';
  } catch (error) {
    console.error('Error fetching audio:', error);
    return '';
  }
}

/**
 * Fetch and store relevant image
 */
async function fetchAndStoreImage(word, apiKey) {
  try {
    const url = `https://api.unsplash.com/search/photos?query=${word}&per_page=1&client_id=${apiKey}`;
    const response = await axios.get(url);
    
    if (response.data.results && response.data.results.length > 0) {
      const imageUrl = response.data.results[0].urls.regular;
      
      // Download image
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const imageBuffer = Buffer.from(imageResponse.data);
      
      // Upload to S3
      const key = `images/${word}.jpg`;
      await s3Client.send(new PutObjectCommand({
        Bucket: IMAGES_BUCKET,
        Key: key,
        Body: imageBuffer,
        ContentType: 'image/jpeg'
      }));
      
      return `https://${IMAGES_BUCKET}.s3.amazonaws.com/${key}`;
    }
    
    return '';
  } catch (error) {
    console.error('Error fetching image:', error);
    return '';
  }
}

/**
 * Calculate word difficulty (1-5 scale)
 */
function calculateDifficulty(word, definition) {
  let difficulty = 3; // Default medium

  // Length-based difficulty
  if (word.length < 5) difficulty -= 1;
  if (word.length > 10) difficulty += 1;

  // Syllable count (estimate)
  const syllables = word.match(/[aeiouy]+/gi)?.length || 1;
  if (syllables > 4) difficulty += 1;

  return Math.max(1, Math.min(5, difficulty));
}

/**
 * Determine appropriate age groups
 */
function determineAgeGroups(difficulty) {
  const ageGroupMap = {
    1: ['child', 'teen', 'young_adult', 'adult', 'senior'],
    2: ['teen', 'young_adult', 'adult', 'senior'],
    3: ['young_adult', 'adult', 'senior'],
    4: ['adult', 'senior'],
    5: ['adult', 'senior']
  };

  return ageGroupMap[difficulty] || ['adult'];
}

/**
 * Store word in DynamoDB Word Bank
 */
async function storeWordInBank(wordData) {
  const params = {
    TableName: WORD_BANK_TABLE,
    Item: wordData
  };

  await docClient.send(new PutCommand(params));
}

