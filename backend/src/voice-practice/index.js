import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });

const USERS_TABLE = process.env.USERS_TABLE;
const DAILY_WORDS_TABLE = process.env.DAILY_WORDS_TABLE;
const MAX_ATTEMPTS = 10;
const POINTS_VOICE_SUCCESS = Number(process.env.POINTS_VOICE_SUCCESS || 1000);

const MEMBERSHIP_THRESHOLDS = [
  { level: 'diamond', minPoints: 100000 },
  { level: 'platinum', minPoints: 75000 },
  { level: 'gold', minPoints: 50000 },
  { level: 'silver', minPoints: 25000 },
  { level: 'member', minPoints: 0 }
];

const getMembershipLevel = (points) => {
  const match = MEMBERSHIP_THRESHOLDS.find((entry) => points >= entry.minPoints);
  return match ? match.level : 'member';
};

export function normalizeWord(s) {
  if (!s || typeof s !== 'string') return '';
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}\s'-]/gu, '')
    .trim();
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

export function isTranscriptCorrect(targetWord, transcript) {
  const t = normalizeWord(targetWord);
  const tr = normalizeWord(transcript);
  if (!t) return false;
  if (tr === t) return true;
  const words = tr.split(/\s+/).filter(Boolean);
  if (words.includes(t)) return true;
  if (t.length <= 12 && tr.length <= 32 && levenshtein(tr, t) <= 1) return true;
  return false;
}

function voiceStateKey(wordId, date) {
  return `${wordId}|${date}`;
}

let cachedOpenAiKey;
async function getOpenAiKey() {
  if (cachedOpenAiKey) return cachedOpenAiKey;
  if (process.env.OPENAI_API_KEY) {
    cachedOpenAiKey = process.env.OPENAI_API_KEY;
    return cachedOpenAiKey;
  }
  const secretId = process.env.SECRET_NAME;
  if (!secretId) return null;
  const res = await secretsClient.send(new GetSecretValueCommand({ SecretId: secretId }));
  const parsed = JSON.parse(res.SecretString || '{}');
  cachedOpenAiKey = parsed.openai || parsed.OPENAI_API_KEY || null;
  return cachedOpenAiKey;
}

async function transcribeWhisper(buffer, mimeType, apiKey) {
  const ext = mimeType?.includes('wav')
    ? 'wav'
    : mimeType?.includes('mp4') || mimeType?.includes('m4a')
      ? 'm4a'
      : 'webm';
  const blob = new Blob([buffer], { type: mimeType || 'audio/m4a' });
  const form = new FormData();
  form.append('file', blob, `audio.${ext}`);
  form.append('model', 'whisper-1');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Whisper error', res.status, errText);
    throw new Error(`Whisper failed: ${res.status}`);
  }

  const data = await res.json();
  return data.text || '';
}

async function evaluateWithGpt(apiKey, targetWord, transcript, normalizedMatch) {
  const system = `You are a supportive English vocabulary coach. Respond with ONLY valid JSON, no markdown.
Schema:
{
  "mistakes": string[],
  "suggestions": string[],
  "review": { "whatWentWell": string[], "toImprove": string[] },
  "followUpQuestions": string[]
}
Keep items brief (max 3 each). Be kind. Follow-up questions should relate to using the word in context.`;

  const user = `Target word: "${targetWord}"
User said (transcript): "${transcript}"
Normalized match (roughly correct): ${normalizedMatch}
Fill the JSON. If normalizedMatch is true, still give 1–2 light follow-up questions about usage.`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: 0.6,
      max_tokens: 600
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('GPT eval error', res.status, errText);
    return {
      mistakes: [],
      suggestions: ['Try again slowly, focusing on each syllable.'],
      review: {
        whatWentWell: ['You completed a practice attempt.'],
        toImprove: ['Listen to the sample pronunciation.']
      },
      followUpQuestions: [`How would you use "${targetWord}" in a sentence about your day?`]
    };
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  try {
    return JSON.parse(content);
  } catch {
    return {
      mistakes: [],
      suggestions: [],
      review: { whatWentWell: [], toImprove: [] },
      followUpQuestions: []
    };
  }
}

async function getDailyWordForUser(userId, date) {
  let result = await docClient.send(
    new GetCommand({
      TableName: DAILY_WORDS_TABLE,
      Key: { userId, date }
    })
  );
  if (result.Item) return { item: result.Item, source: 'user' };
  result = await docClient.send(
    new GetCommand({
      TableName: DAILY_WORDS_TABLE,
      Key: { userId: 'GLOBAL', date }
    })
  );
  if (result.Item) return { item: result.Item, source: 'global' };
  return { item: null, source: null };
}

async function getVoicePracticeState(userId) {
  const res = await docClient.send(
    new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId }
    })
  );
  const raw = res.Item?.voicePracticeJson;
  if (!raw || typeof raw !== 'string') return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function saveVoicePracticeState(userId, state) {
  await docClient.send(
    new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: 'SET voicePracticeJson = :j',
      ExpressionAttributeValues: {
        ':j': JSON.stringify(state)
      }
    })
  );
}

async function updatePointsAndMembership(userId) {
  const userResult = await docClient.send(
    new GetCommand({ TableName: USERS_TABLE, Key: { userId } })
  );
  const user = userResult.Item || {};
  const currentPoints = user.pointsTotal || 0;
  const previousLevel = user.membershipLevel || getMembershipLevel(currentPoints);
  const newPoints = currentPoints + POINTS_VOICE_SUCCESS;
  const newLevel = getMembershipLevel(newPoints);
  const membershipUpdatedAt =
    previousLevel !== newLevel ? new Date().toISOString() : user.membershipUpdatedAt || null;

  await docClient.send(
    new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: 'SET pointsTotal = :p, membershipLevel = :l, membershipUpdatedAt = :mu',
      ExpressionAttributeValues: {
        ':p': newPoints,
        ':l': newLevel,
        ':mu': membershipUpdatedAt
      }
    })
  );

  return {
    pointsAdded: POINTS_VOICE_SUCCESS,
    pointsTotal: newPoints,
    previousLevel,
    newLevel,
    levelChanged: previousLevel !== newLevel
  };
}

async function bumpPracticedWordsIfNeeded(userId, wasAlreadyPracticed) {
  if (wasAlreadyPracticed) return;
  try {
    const userResult = await docClient.send(
      new GetCommand({ TableName: USERS_TABLE, Key: { userId } })
    );
    const user = userResult.Item || {};
    const lp = user.learningPatterns || {
      totalWords: 0,
      practicedWords: 0,
      averageRating: 0,
      difficultyPreference: 'medium'
    };
    lp.practicedWords = (lp.practicedWords || 0) + 1;
    await docClient.send(
      new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { userId },
        UpdateExpression: 'SET learningPatterns = :lp',
        ExpressionAttributeValues: { ':lp': lp }
      })
    );
  } catch (e) {
    console.error('bumpPracticedWordsIfNeeded', e);
  }
}

/**
 * Mark practiced on user's daily row; clone from GLOBAL if user row missing.
 */
async function markDailyWordPracticed(userId, date, globalOrUserItem, wasGlobalOnly) {
  const now = new Date().toISOString();
  if (!wasGlobalOnly) {
    await docClient.send(
      new UpdateCommand({
        TableName: DAILY_WORDS_TABLE,
        Key: { userId, date },
        UpdateExpression:
          'SET practiceStatus = :ps, practiceAt = :pa, voiceLastSuccessAt = :vs, rating = :r',
        ExpressionAttributeValues: {
          ':ps': 'practiced',
          ':pa': now,
          ':vs': now,
          ':r': 5
        }
      })
    );
    return;
  }

  const src = { ...globalOrUserItem };
  delete src.userId;
  const newItem = {
    ...src,
    userId,
    date,
    practiceStatus: 'practiced',
    practiceAt: now,
    voiceLastSuccessAt: now,
    rating: 5
  };
  await docClient.send(
    new PutCommand({
      TableName: DAILY_WORDS_TABLE,
      Item: newItem
    })
  );
}

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  const httpMethod = event.httpMethod || event.requestContext?.http?.method;
  if (httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const userId = event.requestContext?.authorizer?.claims?.sub;
    if (!userId) {
      return { statusCode: 401, headers, body: JSON.stringify({ message: 'Unauthorized' }) };
    }

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ message: 'Invalid JSON body' }) };
    }

    const { wordId, date, audioBase64, mimeType } = body;
    if (!wordId || !date || !audioBase64) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'wordId, date, and audioBase64 are required' })
      };
    }

    let buffer;
    try {
      buffer = Buffer.from(audioBase64, 'base64');
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ message: 'Invalid audioBase64' }) };
    }

    if (buffer.length < 200) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Recording too short. Hold the button a bit longer.' })
      };
    }
    if (buffer.length > 9 * 1024 * 1024) {
      return { statusCode: 413, headers, body: JSON.stringify({ message: 'Audio too large' }) };
    }

    const { item: daily, source } = await getDailyWordForUser(userId, date);
    if (!daily || daily.wordId !== wordId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Word does not match your daily word for this date.' })
      };
    }

    const targetWord = daily.word;
    if (!targetWord) {
      return { statusCode: 400, headers, body: JSON.stringify({ message: 'Missing word text' }) };
    }

    const vk = voiceStateKey(wordId, date);
    const voiceState = await getVoicePracticeState(userId);
    const entry = voiceState[vk] || { attempts: 0, pointsAwarded: false };
    const attemptsSoFar = entry.attempts || 0;

    if (attemptsSoFar >= MAX_ATTEMPTS) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({
          message: 'Maximum voice practice attempts reached for today.',
          attemptsRemaining: 0,
          transcript: '',
          targetWord,
          normalizedMatch: false,
          mistakes: [],
          suggestions: [],
          review: { whatWentWell: [], toImprove: [] },
          followUpQuestions: [],
          scoreCorrect: false,
          pointsAwarded: 0,
          practicedMarked: false
        })
      };
    }

    const apiKey = await getOpenAiKey();
    if (!apiKey) {
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({
          message:
            'OpenAI API key not configured. Add "openai" to the llm-api-keys secret or set OPENAI_API_KEY on the Lambda.'
        })
      };
    }

    let transcript = '';
    try {
      transcript = await transcribeWhisper(buffer, mimeType, apiKey);
    } catch (e) {
      console.error(e);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ message: 'Transcription failed. Try again.' })
      };
    }

    const normalizedMatch = isTranscriptCorrect(targetWord, transcript);
    const evalJson = await evaluateWithGpt(apiKey, targetWord, transcript, normalizedMatch);

    const mistakes = Array.isArray(evalJson.mistakes) ? evalJson.mistakes : [];
    const suggestions = Array.isArray(evalJson.suggestions) ? evalJson.suggestions : [];
    const review =
      evalJson.review && typeof evalJson.review === 'object'
        ? {
            whatWentWell: Array.isArray(evalJson.review.whatWentWell) ? evalJson.review.whatWentWell : [],
            toImprove: Array.isArray(evalJson.review.toImprove) ? evalJson.review.toImprove : []
          }
        : { whatWentWell: [], toImprove: [] };
    const followUpQuestions = Array.isArray(evalJson.followUpQuestions)
      ? evalJson.followUpQuestions
      : [];

    entry.attempts = attemptsSoFar + 1;
    voiceState[vk] = entry;

    const attemptsRemaining = Math.max(0, MAX_ATTEMPTS - entry.attempts);

    const scoreCorrect = normalizedMatch;
    let pointsAwarded = 0;
    let practicedMarked = false;
    let reward = null;

    const wasGlobalOnly = source === 'global';
    const userDaily = wasGlobalOnly ? null : daily;
    const wasAlreadyPracticed =
      userDaily?.practiceStatus === 'practiced' || daily.practiceStatus === 'practiced';

    if (scoreCorrect) {
      await markDailyWordPracticed(userId, date, daily, wasGlobalOnly);
      practicedMarked = true;

      if (!entry.pointsAwarded) {
        reward = await updatePointsAndMembership(userId);
        pointsAwarded = reward.pointsAdded || POINTS_VOICE_SUCCESS;
        entry.pointsAwarded = true;
      }

      await bumpPracticedWordsIfNeeded(userId, wasAlreadyPracticed);
    }

    voiceState[vk] = entry;
    await saveVoicePracticeState(userId, voiceState);

    const payload = {
      transcript,
      targetWord,
      normalizedMatch,
      mistakes,
      suggestions,
      review,
      followUpQuestions,
      attemptsRemaining,
      scoreCorrect,
      pointsAwarded,
      practicedMarked,
      reward: reward || undefined
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(payload)
    };
  } catch (error) {
    console.error('voice-practice error', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: error.message || 'Server error' })
    }
  }
};
