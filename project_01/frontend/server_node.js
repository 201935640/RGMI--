const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 3001;

// Proxy /api to backend (5000)
app.use(
  '/api',
  createProxyMiddleware({
    target: 'http://127.0.0.1:5000',
    changeOrigin: true,
  })
);

// Serve static files from build
app.use(express.static(path.join(__dirname, 'build')));

// Handle SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Server is running on http://127.0.0.1:${PORT}`);
});
