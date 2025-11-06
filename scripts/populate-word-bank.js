/**
 * Script to populate the word bank with initial words
 * Run this after deploying the infrastructure
 * 
 * Usage:
 *   PowerShell: $env:WORD_BANK_TABLE="table-name"; node scripts/populate-word-bank.js
 *   Bash: WORD_BANK_TABLE="table-name" node scripts/populate-word-bank.js
 */

const path = require('path');

// Add backend node_modules to the module search path
const backendModulesPath = path.join(__dirname, '../backend/node_modules');
require('module').globalPaths.unshift(backendModulesPath);

// Load modules
let DynamoDBClient, DynamoDBDocumentClient, PutItemCommand, uuidv4;

try {
  ({ DynamoDBClient } = require('@aws-sdk/client-dynamodb'));
  ({ DynamoDBDocumentClient, PutItemCommand } = require('@aws-sdk/lib-dynamodb'));
  ({ v4: uuidv4 } = require('uuid'));
} catch (error) {
  console.error('❌ Error: AWS SDK modules not found.');
  console.error('Please run: cd backend && npm install');
  console.error('Error details:', error.message);
  process.exit(1);
}

const ddbClient = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(ddbClient);

// Sample words to populate
const SAMPLE_WORDS = [
  {
    word: 'serendipity',
    definition: 'The occurrence and development of events by chance in a happy or beneficial way',
    partOfSpeech: 'noun',
    pronunciation: '/ˌserənˈdipədē/',
    difficulty: 3,
    synonyms: ['fortune', 'luck', 'chance'],
    antonyms: ['misfortune', 'bad luck'],
    examples: ['Finding that book was pure serendipity.', 'Their meeting was a fortunate serendipity.'],
    ageGroups: ['young_adult', 'adult', 'senior'],
    contexts: ['general', 'corporate'],
  },
  {
    word: 'ephemeral',
    definition: 'Lasting for a very short time',
    partOfSpeech: 'adjective',
    pronunciation: '/əˈfem(ə)rəl/',
    difficulty: 4,
    synonyms: ['transient', 'fleeting', 'temporary'],
    antonyms: ['permanent', 'lasting', 'eternal'],
    examples: ['The beauty of the sunset was ephemeral.', 'Fame can be ephemeral.'],
    ageGroups: ['adult', 'senior'],
    contexts: ['general', 'college'],
  },
  {
    word: 'resilient',
    definition: 'Able to recover quickly from difficulties',
    partOfSpeech: 'adjective',
    pronunciation: '/rəˈzilyənt/',
    difficulty: 3,
    synonyms: ['tough', 'strong', 'flexible'],
    antonyms: ['weak', 'fragile'],
    examples: ['She showed a resilient spirit.', 'The economy proved resilient.'],
    ageGroups: ['teen', 'young_adult', 'adult', 'senior'],
    contexts: ['general', 'corporate', 'school'],
  },
  {
    word: 'eloquent',
    definition: 'Fluent or persuasive in speaking or writing',
    partOfSpeech: 'adjective',
    pronunciation: '/ˈeləkwənt/',
    difficulty: 3,
    synonyms: ['articulate', 'expressive', 'fluent'],
    antonyms: ['inarticulate', 'ineloquent'],
    examples: ['He gave an eloquent speech.', 'Her writing is eloquent and moving.'],
    ageGroups: ['young_adult', 'adult', 'senior'],
    contexts: ['general', 'corporate', 'exam_prep'],
  },
  {
    word: 'innovative',
    definition: 'Featuring new methods; advanced and original',
    partOfSpeech: 'adjective',
    pronunciation: '/ˈinəˌvādiv/',
    difficulty: 2,
    synonyms: ['creative', 'original', 'novel'],
    antonyms: ['traditional', 'conventional'],
    examples: ['The company has an innovative approach.', 'She developed innovative solutions.'],
    ageGroups: ['teen', 'young_adult', 'adult', 'senior'],
    contexts: ['general', 'corporate', 'business', 'school'],
  },
  {
    word: 'collaborate',
    definition: 'Work jointly on an activity or project',
    partOfSpeech: 'verb',
    pronunciation: '/kəˈlabəˌrāt/',
    difficulty: 2,
    synonyms: ['cooperate', 'work together', 'partner'],
    antonyms: ['compete', 'oppose'],
    examples: ['Teams should collaborate effectively.', 'Scientists collaborate on research.'],
    ageGroups: ['teen', 'young_adult', 'adult', 'senior'],
    contexts: ['general', 'corporate', 'school', 'college'],
  },
  {
    word: 'perseverance',
    definition: 'Persistence in doing something despite difficulty',
    partOfSpeech: 'noun',
    pronunciation: '/ˌpərsəˈvir(ə)ns/',
    difficulty: 3,
    synonyms: ['persistence', 'determination', 'tenacity'],
    antonyms: ['giving up', 'surrender'],
    examples: ['Success requires perseverance.', 'Her perseverance paid off.'],
    ageGroups: ['teen', 'young_adult', 'adult', 'senior'],
    contexts: ['general', 'school', 'exam_prep'],
  },
  {
    word: 'ubiquitous',
    definition: 'Present, appearing, or found everywhere',
    partOfSpeech: 'adjective',
    pronunciation: '/yo͞oˈbikwədəs/',
    difficulty: 4,
    synonyms: ['omnipresent', 'everywhere', 'pervasive'],
    antonyms: ['rare', 'scarce'],
    examples: ['Smartphones are ubiquitous today.', 'Coffee shops are ubiquitous in cities.'],
    ageGroups: ['adult', 'senior'],
    contexts: ['general', 'college', 'exam_prep'],
  },
  {
    word: 'meticulous',
    definition: 'Showing great attention to detail; very careful',
    partOfSpeech: 'adjective',
    pronunciation: '/məˈtikyələs/',
    difficulty: 3,
    synonyms: ['careful', 'precise', 'thorough'],
    antonyms: ['careless', 'sloppy'],
    examples: ['She is meticulous in her work.', 'The plan was meticulous.'],
    ageGroups: ['young_adult', 'adult', 'senior'],
    contexts: ['general', 'corporate', 'exam_prep'],
  },
  {
    word: 'ambiguous',
    definition: 'Open to more than one interpretation; unclear',
    partOfSpeech: 'adjective',
    pronunciation: '/amˈbiɡyo͞oəs/',
    difficulty: 3,
    synonyms: ['unclear', 'vague', 'uncertain'],
    antonyms: ['clear', 'obvious', 'unambiguous'],
    examples: ['The statement was ambiguous.', 'His answer was deliberately ambiguous.'],
    ageGroups: ['young_adult', 'adult', 'senior'],
    contexts: ['general', 'corporate', 'college'],
  },
];

const TABLE_NAME = process.env.WORD_BANK_TABLE || 'onewordaday-dev-word-bank';

async function populateWordBank() {
  console.log(`Populating word bank table: ${TABLE_NAME}`);
  console.log(`Adding ${SAMPLE_WORDS.length} words...`);

  let successCount = 0;
  let errorCount = 0;

  for (const word of SAMPLE_WORDS) {
    try {
      const item = {
        wordId: uuidv4(),
        ...word,
        category: 'general',
        frequency: Math.floor(Math.random() * 100) + 1,
        audioUrl: '',
        imageUrl: '',
        createdAt: new Date().toISOString(),
      };

      await docClient.send(new PutItemCommand({
        TableName: TABLE_NAME,
        Item: item,
      }));

      successCount++;
      console.log(`✓ Added: ${word.word}`);
    } catch (error) {
      errorCount++;
      console.error(`✗ Failed to add ${word.word}:`, error.message);
    }
  }

  console.log('\n========================================');
  console.log(`✓ Successfully added: ${successCount} words`);
  if (errorCount > 0) {
    console.log(`✗ Failed: ${errorCount} words`);
  }
  console.log('========================================\n');
}

// Run if called directly
if (require.main === module) {
  populateWordBank()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error populating word bank:', error);
      process.exit(1);
    });
}

module.exports = { populateWordBank };

