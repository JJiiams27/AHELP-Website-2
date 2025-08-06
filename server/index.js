import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'dist');
const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : '';
const sameSite = 'Strict';

const users = new Map(); // email -> { passwordHash, firstName, lastName }
const sessions = new Map(); // token -> email

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

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) req.connection.destroy();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        resolve(data);
      } catch (e) {
        reject(e);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/register') {
    try {
      const cookies = getCookies(req);
      if (req.headers['x-csrf-token'] !== cookies.csrfToken) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'CSRF token mismatch' }));
      }

      const { firstName = '', lastName = '', email = '', password = '' } = await parseBody(req);
      if (!email || !password) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Email and password required' }));
      }
      if (users.has(email)) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'User already exists' }));
      }
      users.set(email, { firstName, lastName, passwordHash: hash(password) });
      const token = crypto.randomUUID();
      sessions.set(token, email);
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Set-Cookie': `session=${token}; HttpOnly${secureFlag}; Path=/; SameSite=${sameSite}`
      });
      res.end(JSON.stringify({ token }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Server error' }));
    }
  } else if (req.method === 'POST' && req.url === '/api/login') {
    try {
      const cookies = getCookies(req);
      if (req.headers['x-csrf-token'] !== cookies.csrfToken) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'CSRF token mismatch' }));
      }

      const { email = '', password = '' } = await parseBody(req);
      const user = users.get(email);
      if (!user || user.passwordHash !== hash(password)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Invalid credentials' }));
      }
      const token = crypto.randomUUID();
      sessions.set(token, email);
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Set-Cookie': `session=${token}; HttpOnly${secureFlag}; Path=/; SameSite=${sameSite}`
      });
      res.end(JSON.stringify({ token }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Server error' }));
    }
  } else if (req.method === 'GET') {
    const safePath = req.url === '/' ? '/index.html' : req.url;
    const filePath = path.join(publicDir, safePath);
    const cookies = getCookies(req);
    const csrfCookie = cookies.csrfToken;
    const setCookie = csrfCookie
      ? undefined
      : `csrfToken=${crypto.randomUUID()}; HttpOnly${secureFlag}; Path=/; SameSite=${sameSite}`;
    fs.readFile(filePath, (err, data) => {
      if (err) {
        const notFoundPath = path.join(publicDir, '404.html');
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
    res.writeHead(405).end();
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
