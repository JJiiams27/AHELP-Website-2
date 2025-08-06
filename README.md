# AHELP Website

## Build

Use `npm run build` to render HTML files from the `improved-website-v14` source directory into the `dist` folder.

## Server

`server.js` provides a tiny Node.js server.
When a client posts to `/login` the server issues a session identifier using `crypto.randomUUID()`
and returns it as an HTTP-only cookie.

Cookie settings:

- `HttpOnly` prevents client-side scripts from reading the cookie.
- `SameSite=Strict` limits the cookie to same-site requests.
- `Secure` is automatically added when `NODE_ENV` is set to `production`.

### Configuration

- `PORT` – port for the server to listen on (defaults to `3000`).
- `NODE_ENV=production` – enable the `Secure` cookie attribute.

Run the server with:

```bash
node server.js
```