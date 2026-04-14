/**
 * One-time / occasional: merge OPENAI_API_KEY from repo-root .env into AWS Secrets Manager
 * JSON (same secret Groq uses: "openai" key). Does not print the key.
 *
 * Prerequisites: AWS CLI credentials configured (aws sts get-caller-identity works).
 *
 * Usage (from backend folder):
 *   LLM_KEYS_SECRET_NAME=onewordaday-production/llm-api-keys node scripts/sync-openai-from-env.mjs
 *
 * Or pass secret id as first argument:
 *   node scripts/sync-openai-from-env.mjs onewordaday-production/llm-api-keys
 *
 * Secret name: Terraform output `llm_api_keys_secret_name` or AWS Console → Secrets Manager.
 */
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
  PutSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.join(__dirname, '../../.env');

function parseDotenv(filePath) {
  if (!existsSync(filePath)) {
    console.error('Missing file:', filePath);
    process.exit(1);
  }
  const out = {};
  const raw = readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const secretId =
  process.argv[2] ||
  process.env.LLM_KEYS_SECRET_NAME ||
  process.env.SECRET_NAME ||
  '';

if (!secretId) {
  console.error(
    'Set LLM_KEYS_SECRET_NAME or pass secret id as first argument.\nExample: node scripts/sync-openai-from-env.mjs onewordaday-production/llm-api-keys'
  );
  process.exit(1);
}

const env = parseDotenv(rootEnv);
const openai = env.OPENAI_API_KEY;
if (!openai || openai === 'your-key-here') {
  console.error('OPENAI_API_KEY is missing or placeholder in .env at repo root.');
  process.exit(1);
}

const region = process.env.AWS_REGION || 'us-east-1';
const client = new SecretsManagerClient({ region });

let existing = {};
try {
  const got = await client.send(new GetSecretValueCommand({ SecretId: secretId }));
  if (got.SecretString) {
    try {
      existing = JSON.parse(got.SecretString);
    } catch {
      console.error('Secret exists but is not valid JSON. Fix with scripts/fix-secret.ps1 first.');
      process.exit(1);
    }
  }
} catch (e) {
  if (e.name === 'ResourceNotFoundException') {
    console.error('Secret not found:', secretId);
    process.exit(1);
  }
  throw e;
}

const next = { ...existing, openai };
await client.send(
  new PutSecretValueCommand({
    SecretId: secretId,
    SecretString: JSON.stringify(next),
  })
);

console.log('OK: merged "openai" into secret:', secretId);
console.log('Keys now:', Object.keys(next).join(', '));
console.log(
  'Voice-practice Lambda reads this via SECRET_NAME + JSON key "openai" (or env OPENAI_API_KEY on the function).'
);
