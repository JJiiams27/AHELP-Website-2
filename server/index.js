import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'improved-website-v14');

const users = new Map(); // email -> { passwordHash, firstName, lastName }
const sessions = new Map(); // token -> email

function hash(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
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
        'Set-Cookie': `session=${token}; HttpOnly; Path=/; SameSite=Strict`
      });
      res.end(JSON.stringify({ token }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Server error' }));
    }
  } else if (req.method === 'POST' && req.url === '/api/login') {
    try {
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
        'Set-Cookie': `session=${token}; HttpOnly; Path=/; SameSite=Strict`
      });
      res.end(JSON.stringify({ token }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Server error' }));
    }
  } else if (req.method === 'GET') {
    let requestedPath = req.url.split('?')[0];
    requestedPath = requestedPath === '/' ? '/index.html' : requestedPath;

    if (requestedPath.includes('..')) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }

    const safePath = path.normalize(requestedPath).replace(/^\/+/g, '');
    const filePath = path.join(publicDir, safePath);
    if (!filePath.startsWith(publicDir)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
      } else {
        res.writeHead(200);
        res.end(data);
      }
    });
  } else {
    res.writeHead(405).end();
  }
});

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default server;
