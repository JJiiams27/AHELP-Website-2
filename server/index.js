import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'dist');

const dataDir = path.join(__dirname, 'data');
const usersPath = path.join(dataDir, 'users.json');
const sessionsPath = path.join(dataDir, 'sessions.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function loadJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

const users = loadJSON(usersPath); // email -> { passwordHash, firstName, lastName }
const sessions = loadJSON(sessionsPath); // token -> email

function hash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

function verify(password, stored) {
  const [salt, key] = stored.split(':');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  const keyBuf = Buffer.from(key, 'hex');
  const derivedBuf = Buffer.from(derivedKey, 'hex');
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
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
      if (users[email]) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'User already exists' }));
      }
      users[email] = { firstName, lastName, passwordHash: hash(password) };
      saveJSON(usersPath, users);
      const token = crypto.randomUUID();
      sessions[token] = email;
      saveJSON(sessionsPath, sessions);
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
      const user = users[email];
      if (!user || !verify(password, user.passwordHash)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Invalid credentials' }));
      }
      const token = crypto.randomUUID();
      sessions[token] = email;
      saveJSON(sessionsPath, sessions);
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
    const safePath = req.url === '/' ? '/index.html' : req.url;
    const filePath = path.join(publicDir, safePath);
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
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
