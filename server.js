const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const app = express();
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static('improved-website-v14'));

// Simple in-memory user store
const USERS = {
  'user@example.com': { password: 'password', name: 'User' }
};

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = USERS[email];
  if (user && user.password === password) {
    const token = Math.random().toString(36).slice(2);
    res.cookie('session', token, { httpOnly: true });
    return res.json({ redirect: '/dashboard.html' });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
