const http = require('http');
const server = http.createServer((req, res) => {
  res.end('Hello from Node.js');
});
server.listen(3000, '127.0.0.1', () => {
  console.log('Listening on 127.0.0.1:3000');
});
