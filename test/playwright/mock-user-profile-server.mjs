/**
 * Minimal in-memory /user/profile server for Playwright (mirrors merge behavior in backend).
 * @see backend/src/user-preferences/index.js
 */
import http from 'http';

const PORT = parseInt(process.env.MOCK_PROFILE_API_PORT || '48765', 10);

const DEFAULT_NOTIFICATION_PREFS = {
  dailyWord: {
    enabled: true,
    channels: ['local'],
    frequency: 'once_daily',
    primaryTime: '09:00',
    secondaryTime: '18:00',
    time: '09:00',
    timezone: 'UTC',
  },
  feedbackReminder: {
    enabled: true,
    time: '20:00',
  },
  milestones: {
    enabled: true,
  },
};

function mergeNotificationPreferences(existing, incoming) {
  const prev = existing && typeof existing === 'object' ? existing : {};
  if (!incoming || typeof incoming !== 'object') {
    return Object.keys(prev).length ? prev : { ...DEFAULT_NOTIFICATION_PREFS };
  }
  return {
    ...DEFAULT_NOTIFICATION_PREFS,
    ...prev,
    ...incoming,
    dailyWord: {
      ...DEFAULT_NOTIFICATION_PREFS.dailyWord,
      ...prev.dailyWord,
      ...incoming.dailyWord,
    },
    feedbackReminder: {
      ...DEFAULT_NOTIFICATION_PREFS.feedbackReminder,
      ...prev.feedbackReminder,
      ...incoming.feedbackReminder,
    },
    milestones: {
      ...DEFAULT_NOTIFICATION_PREFS.milestones,
      ...prev.milestones,
      ...incoming.milestones,
    },
  };
}

let profile = {
  userId: 'playwright-mock-user',
  email: 'mock@example.com',
  name: 'Mock User',
  notificationPreferences: { ...DEFAULT_NOTIFICATION_PREFS },
};

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  const url = req.url?.split('?')[0] || '';

  if (req.method === 'GET' && url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }

  /** Mirrors GET /word/today auth behavior for Playwright P2 when TEST_JWT is unset. */
  if (req.method === 'GET' && url === '/word/today') {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) {
      sendJson(res, 401, { message: 'Unauthorized' });
      return;
    }
    sendJson(res, 200, {
      word: {
        wordId: 'mock-word-id',
        word: 'serendipity',
        date: new Date().toISOString().slice(0, 10),
      },
    });
    return;
  }

  if (req.method === 'GET' && url === '/user/profile') {
    sendJson(res, 200, { message: 'ok', profile });
    return;
  }

  if (req.method === 'PUT' && url === '/user/profile') {
    try {
      const body = await readBody(req);
      if (body.notificationPreferences) {
        profile = {
          ...profile,
          notificationPreferences: mergeNotificationPreferences(
            profile.notificationPreferences,
            body.notificationPreferences
          ),
        };
      }
      sendJson(res, 200, { message: 'updated', profile });
    } catch {
      sendJson(res, 400, { message: 'Bad JSON' });
    }
    return;
  }

  sendJson(res, 404, { message: 'Not found' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.error(`[mock-user-profile] listening on http://127.0.0.1:${PORT}`);
});
