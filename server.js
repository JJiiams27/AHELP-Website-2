const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : '';
const sameSite = 'Strict';
const users = new Map([['admin', hash('password')]]);
const sessions = new Map();

function hash(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function getCookies(req) {
  return Object.fromEntries(
    (req.headers.cookie || '')
      .split(';')
      .map(c => c.trim().split('='))
      .filter(([k]) => k)
  );
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/login' && req.method === 'POST') {
    const cookies = getCookies(req);
    if (req.headers['x-csrf-token'] !== cookies.csrfToken) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'CSRF token mismatch' }));
    }

    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) req.connection.destroy();
    });
    req.on('end', () => {
      try {
        const { username = '', password = '' } = JSON.parse(body || '{}');
        const hashed = users.get(username);
        if (!hashed || hashed !== hash(password)) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Invalid credentials' }));
        }
        const sessionId = crypto.randomUUID();
        sessions.set(sessionId, username);
        const headers = {
          'Content-Type': 'application/json',
          'Set-Cookie': `session=${sessionId}; HttpOnly${secureFlag}; SameSite=${sameSite}; Path=/`
        };
        res.writeHead(200, headers);
        res.end(JSON.stringify({ status: 'ok' }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bad request' }));
      }
    });
  } else if (req.method === 'GET') {
    const cookies = getCookies(req);
    const csrfCookie = cookies.csrfToken;
    const setCookie = csrfCookie
      ? undefined
      : `csrfToken=${crypto.randomUUID()}; HttpOnly${secureFlag}; SameSite=${sameSite}; Path=/`;
    const filePath = path.join(
      __dirname,
      'dist',
      req.url === '/' ? 'index.html' : req.url
    );
    fs.readFile(filePath, (err, data) => {
      if (err) {
        const notFoundPath = path.join(
          __dirname,
          'dist',
          '404.html'
        );
        fs.readFile(notFoundPath, (nfErr, nfData) => {
          const headers = { 'Content-Type': 'text/html' };
          if (setCookie) headers['Set-Cookie'] = setCookie;
          res.writeHead(404, headers);
          res.end(nfErr ? 'Not found' : nfData);
        });
      } else {
        const headers = {};
        if (setCookie) headers['Set-Cookie'] = setCookie;
        res.writeHead(200, headers);
        res.end(data);
      }
    });
  } else {
    res.writeHead(405);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
