import test from 'node:test';
import assert from 'node:assert/strict';
import server from './index.js';

// Ensure that path traversal attempts are rejected

test('GET /../server.js returns 404', async (t) => {
  const port = await new Promise((resolve) => {
    server.listen(0, () => resolve(server.address().port));
  });

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const res = await fetch(`http://localhost:${port}/../server.js`);
  assert.equal(res.status, 404);
});
