import archiver from 'archiver';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Lambda functions to build
const functions = [
  'word-generation',
  'ai-word-generation',
  'content-enrichment',
  'notification-dispatcher',
  'feedback-processor',
  'user-preferences',
  'get-todays-word',
  'word-history'
];

// Create dist directory if it doesn't exist
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Build each function
console.log('Building Lambda functions...\n');

functions.forEach(funcName => {
  console.log(`Building ${funcName}...`);
  
  const output = fs.createWriteStream(path.join(distDir, `${funcName}.zip`));
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', () => {
    console.log(`✓ ${funcName}.zip created (${archive.pointer()} bytes)\n`);
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(output);

  // Add package.json to enable ESM in Lambda
  const packageJson = {
    type: 'module',
    name: funcName,
    version: '1.0.0'
  };
  archive.append(JSON.stringify(packageJson, null, 2), { name: 'package.json' });

  // Add function source
  const funcPath = path.join(__dirname, 'src', funcName);
  archive.directory(funcPath, false);

  // Add shared dependencies (if exists)
  const sharedPath = path.join(__dirname, 'src', 'shared');
  if (fs.existsSync(sharedPath)) {
    archive.directory(sharedPath, 'shared');
  }

  archive.finalize();
});

console.log('Build complete!');

