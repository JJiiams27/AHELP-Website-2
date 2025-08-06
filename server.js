const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : '';
const sameSite = 'Strict';

const server = http.createServer((req, res) => {
  if (req.url === '/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      const sessionId = crypto.randomUUID();
      const headers = {
        'Content-Type': 'application/json',
        'Set-Cookie': `session=${sessionId}; HttpOnly${secureFlag}; SameSite=${sameSite}; Path=/`
      };
      res.writeHead(200, headers);
      res.end(JSON.stringify({ status: 'ok' }));
    });
  } else if (req.method === 'GET') {
    const filePath = path.join(
      __dirname,
      'improved-website-v14',
      req.url === '/' ? 'index.html' : req.url
    );
    fs.readFile(filePath, (err, data) => {
      if (err) {
        const notFoundPath = path.join(
          __dirname,
          'improved-website-v14',
          '404.html'
        );
        fs.readFile(notFoundPath, (nfErr, nfData) => {
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res.end(nfErr ? 'Not found' : nfData);
        });
      } else {
        res.writeHead(200);
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
