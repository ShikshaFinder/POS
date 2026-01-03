const fs = require('fs');
const path = require('path');

const clientPath = path.join(process.cwd(), 'node_modules', '.prisma', 'client');
const defaultJsPath = path.join(clientPath, 'default.js');
const clientJsPath = path.join(clientPath, 'client.js');
const indexJsPath = path.join(clientPath, 'index.js');

// Ensure the client directory exists
if (!fs.existsSync(clientPath)) {
  console.error('Error: .prisma/client directory does not exist. Run "prisma generate" first.');
  process.exit(1);
}

// Check if client.js or index.js exists to determine the correct export
let exportPath = './client';
if (!fs.existsSync(clientJsPath) && fs.existsSync(indexJsPath)) {
  exportPath = './index';
}

// Create or update default.js to properly export from client/index
// This is needed for @prisma/client/default.js to work correctly
// @prisma/client/default.js requires('.prisma/client/default')
// which resolves to node_modules/.prisma/client/default.js
const defaultJsContent = `module.exports = require('${exportPath}');\n`;

if (fs.existsSync(defaultJsPath)) {
  const existingContent = fs.readFileSync(defaultJsPath, 'utf8');
  if (existingContent !== defaultJsContent) {
    fs.writeFileSync(defaultJsPath, defaultJsContent);
    console.log('✓ Updated default.js file');
  } else {
    console.log('✓ default.js file is already up to date');
  }
} else {
  fs.writeFileSync(defaultJsPath, defaultJsContent);
  console.log('✓ Created default.js file');
}

// Verify the file was created correctly
if (fs.existsSync(defaultJsPath)) {
  const content = fs.readFileSync(defaultJsPath, 'utf8');
  if (content.trim() === defaultJsContent.trim()) {
    console.log('✓ Prisma client ready');
  } else {
    console.error('Error: default.js file content mismatch');
    process.exit(1);
  }
} else {
  console.error('Error: Failed to create default.js file');
  process.exit(1);
}

