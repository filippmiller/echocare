#!/usr/bin/env node

const port = parseInt(process.env.PORT || '3000', 10);

console.log(`Starting Next.js standalone server on port ${port}...`);

process.env.PORT = String(port);

require('./.next/standalone/server.js');

