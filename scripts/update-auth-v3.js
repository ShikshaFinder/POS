const fs = require('fs');
const path = require('path');

function findRoutes(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findRoutes(fullPath));
    else if (entry.name === 'route.ts') results.push(fullPath);
  }
  return results;
}

const base = path.resolve(__dirname, '..');
const posRoutes = findRoutes(path.join(base, 'src', 'app', 'api', 'pos'));
const userRoutes = findRoutes(path.join(base, 'src', 'app', 'api', 'user'));
const allRoutes = [...posRoutes, ...userRoutes];

let updated = 0;
let skipped = 0;
const errors = [];

for (const file of allRoutes) {
  let content = fs.readFileSync(file, 'utf8');
  const relPath = path.relative(base, file);

  // Skip stock routes that were already manually updated correctly
  if (!content.includes('getServerSession') && content.includes('authenticateRequest') && !content.includes('session')) {
    skipped++;
    continue;
  }

  // Skip files with no auth at all
  if (!content.includes('getServerSession') && !content.includes('authenticateRequest')) {
    skipped++;
    continue;
  }

  let modified = content;

  // Remove any existing authenticateRequest import (will re-add clean)
  modified = modified.replace(/import\s*\{\s*authenticateRequest\s*\}\s*from\s*['"][^'"]*['"];?\s*\n/g, '');

  // Remove getServerSession import (any quote style)
  modified = modified.replace(/import\s*\{\s*getServerSession\s*\}\s*from\s*['"]next-auth['"];?\s*\n/g, '');

  // Remove authOptions import (any path: @/lib/auth, relative paths like ../../lib/auth, etc.)
  modified = modified.replace(/import\s*\{\s*authOptions\s*\}\s*from\s*['"][^'"]*['"];?\s*\n/g, '');

  // Add clean import at top
  modified = "import { authenticateRequest } from '@/lib/auth-mobile'\n" + modified;

  // Determine param name
  const usesRequest = /\(\s*request\s*[,:\)]/.test(modified);
  const paramName = usesRequest ? 'request' : 'req';

  // Replace getServerSession calls (preserve only trailing newline, not whitespace)
  modified = modified.replace(
    /const\s+session\s*=\s*await\s+getServerSession\s*\(\s*authOptions\s*\)\s*;?/g,
    `const user = await authenticateRequest(${paramName})`
  );

  // Fix: "if (!session?.user)" or "if(!session?.user)" -> "if (!user)"
  modified = modified.replace(/if\s*\(\s*!user\?\.\w+\s*\)/g, 'if (!user)');
  modified = modified.replace(/if\s*\(\s*!session\?\.\w+\s*\)/g, 'if (!user)');
  modified = modified.replace(/if\s*\(\s*!session\s*\)/g, 'if (!user)');

  // Fix concatenated lines: "authenticateRequest(req)if" -> "authenticateRequest(req)\n    if"
  // Detect indentation from context
  modified = modified.replace(
    /authenticateRequest\((req|request)\)(\s*)if\s*\(/g,
    (match, p, ws) => `authenticateRequest(${p})\n    if (`
  );

  // Replace session.user.X -> user.X (all variations)
  modified = modified.replace(/session\.user\.currentOrganizationId/g, 'user.currentOrganizationId');
  modified = modified.replace(/session\.user\.id/g, 'user.id');
  modified = modified.replace(/session\.user\.email/g, 'user.email');
  modified = modified.replace(/session\.user\.organizationName/g, 'user.organizationName');
  modified = modified.replace(/session\.user\.role/g, 'user.role');
  modified = modified.replace(/session\.user/g, 'user');

  // Replace (user as any).currentOrganizationId -> user.currentOrganizationId
  modified = modified.replace(/\(user\s+as\s+any\)\.currentOrganizationId/g, 'user.currentOrganizationId');
  modified = modified.replace(/\(user\s+as\s+any\)\.id/g, 'user.id');
  modified = modified.replace(/\(user\s+as\s+any\)\.email/g, 'user.email');
  modified = modified.replace(/\(user\s+as\s+any\)/g, 'user');

  // Replace !session (standalone, not session.X) -> !user
  modified = modified.replace(/!\s*session(?![.\w])/g, '!user');

  // Replace remaining "session" references where it was the auth session variable
  // But be careful not to replace "session" in other contexts (like POSSession)
  // Only replace standalone "session" that appears to be the auth variable
  modified = modified.replace(/\bsession\.user\b/g, 'user');

  // Clean up any "user?.user" patterns -> "user"
  modified = modified.replace(/user\?\.\s*user/g, 'user');
  
  // Clean up double newlines from removed imports
  modified = modified.replace(/\n{3,}/g, '\n\n');

  fs.writeFileSync(file, modified, 'utf8');
  updated++;
  console.log('Updated:', relPath);

  // Quick validation: check for remaining session.user references
  if (modified.includes('session.user')) {
    errors.push(`  WARNING: ${relPath} still has 'session.user'`);
  }
  if (modified.includes('getServerSession')) {
    errors.push(`  WARNING: ${relPath} still has 'getServerSession'`);
  }
}

console.log('\nDone! Updated:', updated, 'Skipped:', skipped);
if (errors.length > 0) {
  console.log('\nWarnings:');
  errors.forEach(e => console.log(e));
}
