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

for (const file of allRoutes) {
  let content = fs.readFileSync(file, 'utf8');

  // Skip if already fully migrated (has authenticateRequest but NOT getServerSession)
  if (content.includes('authenticateRequest') && !content.includes('getServerSession')) {
    skipped++;
    continue;
  }

  // Skip if no getServerSession at all
  if (!content.includes('getServerSession')) {
    skipped++;
    continue;
  }

  let modified = content;

  // Remove existing authenticateRequest import if partially added
  modified = modified.replace(/import\s*\{\s*authenticateRequest\s*\}\s*from\s*['"]@\/lib\/auth-mobile['"];?\n/g, '');

  // Remove getServerSession import
  modified = modified.replace(/import\s*\{\s*getServerSession\s*\}\s*from\s*['"]next-auth['"];?\n/g, '');

  // Remove authOptions import if standalone
  modified = modified.replace(/import\s*\{\s*authOptions\s*\}\s*from\s*['"]@\/lib\/auth['"];?\n/g, '');
  // Also handle relative path imports of authOptions
  modified = modified.replace(/import\s*\{\s*authOptions\s*\}\s*from\s*['"][^'"]*auth['"];?\n/g, '');

  // Add authenticateRequest import at the very top
  modified = "import { authenticateRequest } from '@/lib/auth-mobile'\n" + modified;

  // Determine if function params use 'request' or 'req'
  const usesRequest = /\(\s*request\s*[,:\)]/.test(modified);
  const paramName = usesRequest ? 'request' : 'req';

  // Replace getServerSession calls
  modified = modified.replace(
    /const\s+session\s*=\s*await\s+getServerSession\s*\(\s*authOptions\s*\)\s*;?/g,
    `const user = await authenticateRequest(${paramName})`
  );

  // Replace !session -> !user (but not session.something)
  modified = modified.replace(/!\s*session(?![.\w])/g, '!user');

  // Replace session.user.X -> user.X
  modified = modified.replace(/session\.user\.currentOrganizationId/g, 'user.currentOrganizationId');
  modified = modified.replace(/session\.user\.id/g, 'user.id');
  modified = modified.replace(/session\.user\.email/g, 'user.email');
  modified = modified.replace(/session\.user\.organizationName/g, 'user.organizationName');
  modified = modified.replace(/session\.user\.role/g, 'user.role');
  modified = modified.replace(/session\.user/g, 'user');

  fs.writeFileSync(file, modified, 'utf8');
  updated++;
  console.log('Updated:', path.relative(base, file));
}

console.log('\nDone! Updated:', updated, 'Skipped:', skipped);
