#!/usr/bin/env node

// Set PORT before requiring Next.js server
const port = parseInt(process.env.PORT || '3000', 10);
process.env.PORT = String(port);

console.log(`Starting Next.js standalone server on port ${port}...`);

// Next.js standalone server handles HTTP server creation internally
require('./.next/standalone/server.js');

