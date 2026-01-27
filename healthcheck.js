/* eslint-disable @typescript-eslint/no-require-imports */
const http = require('http');

// Use HOSTNAME env var if set, otherwise try container hostname, fallback to 0.0.0.0
const hostname = process.env.HOSTNAME || require('os').hostname() || '0.0.0.0';

const options = {
  hostname: hostname,
  port: process.env.PORT || 3000,
  path: '/api/health',
  method: 'GET',
  timeout: 3000
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

req.on('error', () => {
  process.exit(1);
});

req.on('timeout', () => {
  req.destroy();
  process.exit(1);
});

req.end();
