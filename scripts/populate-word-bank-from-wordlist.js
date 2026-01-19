/**
 * Populate the word bank from a public wordlist URL.
 *
 * Usage:
 *   PowerShell:
 *     $env:WORD_BANK_TABLE="onewordaday-production-word-bank"
 *     $env:WORDLIST_URL="https://raw.githubusercontent.com/wordnik/wordlist/master/wordlist-2019.txt"
 *     node scripts/populate-word-bank-from-wordlist.js
 *
 * Optional:
 *   $env:WORD_LIMIT="50000"  # limit number of words processed
 */

const https = require('https');
const readline = require('readline');
const path = require('path');
const { createHash } = require('crypto');

const { createRequire } = require('module');

// Resolve AWS SDK from backend node_modules (primary) or project root (fallback)
const backendModulesPath = path.join(__dirname, '../backend/node_modules/index.js');
const backendRequire = createRequire(backendModulesPath);

let DynamoDBClient, DynamoDBDocumentClient, BatchWriteCommand, NodeHttpHandler;
try {
  ({ DynamoDBClient } = backendRequire('@aws-sdk/client-dynamodb'));
  ({ DynamoDBDocumentClient, BatchWriteCommand } = backendRequire('@aws-sdk/lib-dynamodb'));
  ({ NodeHttpHandler } = backendRequire('@smithy/node-http-handler'));
} catch (error) {
  try {
    ({ DynamoDBClient } = require('@aws-sdk/client-dynamodb'));
    ({ DynamoDBDocumentClient, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb'));
    ({ NodeHttpHandler } = require('@smithy/node-http-handler'));
  } catch (fallbackError) {
    console.error('❌ Error: AWS SDK modules not found.');
    console.error('Please run: cd backend && npm install');
    console.error('Error details:', fallbackError.message);
    process.exit(1);
  }
}

const REGION = process.env.AWS_REGION || 'us-east-1';
const TABLE_NAME = process.env.WORD_BANK_TABLE || 'onewordaday-production-word-bank';
const WORDLIST_URL =
  process.env.WORDLIST_URL ||
  'https://raw.githubusercontent.com/wordnik/wordlist/main/wordlist-20210729.txt';
const WORD_LIMIT = process.env.WORD_LIMIT ? Number(process.env.WORD_LIMIT) : null;
const BATCH_DELAY_MS = process.env.BATCH_DELAY_MS ? Number(process.env.BATCH_DELAY_MS) : 25;
const MAX_RETRIES = process.env.BATCH_RETRIES ? Number(process.env.BATCH_RETRIES) : 8;
const MAX_SOCKETS = process.env.MAX_SOCKETS ? Number(process.env.MAX_SOCKETS) : 10;

const ddbClient = new DynamoDBClient({
  region: REGION,
  requestHandler: new NodeHttpHandler({ maxSockets: MAX_SOCKETS }),
  maxAttempts: 5,
});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const difficultyFromWord = (word) => {
  const length = word.length;
  if (length <= 5) return 1;
  if (length <= 7) return 2;
  if (length <= 9) return 3;
  if (length <= 12) return 4;
  return 5;
};

const buildItem = (word) => ({
  wordId: createHash('sha256').update(word).digest('hex'),
  word,
  definition: '',
  partOfSpeech: 'unknown',
  pronunciation: '',
  difficulty: difficultyFromWord(word),
  synonyms: [],
  antonyms: [],
  examples: [],
  ageGroups: ['teen', 'young_adult', 'adult', 'senior'],
  contexts: ['general'],
  category: 'general',
  frequency: 1,
  audioUrl: '',
  imageUrl: '',
  createdAt: new Date().toISOString(),
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const flushBatch = async (items) => {
  if (!items.length) return;
  let remaining = items;
  let attempts = 0;

  while (remaining.length && attempts < MAX_RETRIES) {
    attempts += 1;
    let response;
    try {
      response = await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [TABLE_NAME]: remaining.map((Item) => ({ PutRequest: { Item } })),
          },
        })
      );
    } catch (error) {
      const errorName = error?.name || error?.__type || 'UnknownError';
      const isThrottle = String(errorName).includes('Throttling');
      if (!isThrottle) {
        throw error;
      }
      console.warn(`Throttled on batch write (attempt ${attempts}). Backing off...`);
      await sleep(500 * attempts);
      continue;
    }

    const unprocessed = response.UnprocessedItems?.[TABLE_NAME] || [];
    remaining = unprocessed.map((entry) => entry.PutRequest.Item);

    if (remaining.length) {
      console.warn(`Retrying ${remaining.length} unprocessed items...`);
      await sleep(500 * attempts);
    }
  }

  if (remaining.length) {
    console.error(`Failed to write ${remaining.length} items after retries.`);
  }
};

const populate = async () => {
  console.log('========================================');
  console.log('Word Bank Population (Wordlist)');
  console.log('========================================');
  console.log(`Table: ${TABLE_NAME}`);
  console.log(`Region: ${REGION}`);
  console.log(`Wordlist: ${WORDLIST_URL}`);
  if (WORD_LIMIT) {
    console.log(`Limit: ${WORD_LIMIT}`);
  }
  console.log('========================================\n');

  let total = 0;
  let processed = 0;
  let skipped = 0;
  let lastWord = null;
  const batch = [];

  await new Promise((resolve, reject) => {
    https
      .get(WORDLIST_URL, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} downloading wordlist`));
          return;
        }

        const rl = readline.createInterface({ input: res });

        rl.on('line', async (line) => {
          rl.pause();
          const raw = line.trim();
          if (!raw) {
            skipped += 1;
            rl.resume();
            return;
          }

          const unquoted = raw.replace(/^"+|"+$/g, '');
          const normalized = unquoted.toLowerCase();
          if (!/^[a-z][a-z'-]*$/.test(normalized)) {
            skipped += 1;
            rl.resume();
            return;
          }

          if (normalized === lastWord) {
            skipped += 1;
            rl.resume();
            return;
          }

          lastWord = normalized;
          total += 1;

          if (WORD_LIMIT && total > WORD_LIMIT) {
            rl.close();
            return;
          }

          batch.push(buildItem(normalized));

          if (batch.length >= 25) {
            await flushBatch(batch.splice(0, batch.length));
            processed += 25;
            if (processed % 1000 === 0) {
              console.log(`Processed ${processed} words...`);
            }
            if (BATCH_DELAY_MS > 0) {
              await sleep(BATCH_DELAY_MS);
            }
          }

          rl.resume();
        });

        rl.on('close', resolve);
      })
      .on('error', reject);
  });

  if (batch.length) {
    await flushBatch(batch);
    processed += batch.length;
  }

  console.log('\n========================================');
  console.log(`Completed. Written: ${processed}`);
  console.log(`Skipped: ${skipped}`);
  console.log('========================================\n');
};

populate().catch((error) => {
  console.error('❌ Population failed:', error.message);
  process.exit(1);
});
