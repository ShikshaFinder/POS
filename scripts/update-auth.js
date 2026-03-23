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

const posRoutes = findRoutes(path.join(__dirname, '..', 'src', 'app', 'api', 'pos'));
const userRoutes = findRoutes(path.join(__dirname, '..', 'src', 'app', 'api', 'user'));
const allRoutes = [...posRoutes, ...userRoutes];

let updated = 0;
let skipped = 0;

for (const file of allRoutes) {
  let content = fs.readFileSync(file, 'utf8');

  if (content.includes('authenticateRequest')) {
    skipped++;
    continue;
  }
  if (!content.includes('getServerSession')) {
    skipped++;
    continue;
  }

  let modified = content;

  // Remove getServerSession import
  modified = modified.replace(/import\s*\{\s*getServerSession\s*\}\s*from\s*['"]next-auth['"];?\n/g, '');

  // Remove authOptions import if standalone
  modified = modified.replace(/import\s*\{\s*authOptions\s*\}\s*from\s*['"]@\/lib\/auth['"];?\n/g, '');

  // Add authenticateRequest import at top
  const importLine = "import { authenticateRequest } from '@/lib/auth-mobile'\n";
  modified = importLine + modified;

  // Determine if function params use 'req' or 'request'
  const usesRequest = /export\s+async\s+function\s+\w+\s*\(\s*request/.test(modified) ||
                      /\(\s*request\s*:\s*NextRequest/.test(modified) ||
                      /\(\s*request\s*:\s*Request/.test(modified);
  const paramName = usesRequest ? 'request' : 'req';

  // Replace getServerSession calls
  modified = modified.replace(
    /const\s+session\s*=\s*await\s+getServerSession\s*\(\s*authOptions\s*\)\s*;?/g,
    `const user = await authenticateRequest(${paramName})`
  );

  // Replace !session -> !user
  modified = modified.replace(/!\s*session(?![.\w])/g, '!user');

  // Replace session.user.X -> user.X
  modified = modified.replace(/session\.user\.currentOrganizationId/g, 'user.currentOrganizationId');
  modified = modified.replace(/session\.user\.id/g, 'user.id');
  modified = modified.replace(/session\.user\.email/g, 'user.email');
  modified = modified.replace(/session\.user\.organizationName/g, 'user.organizationName');
  modified = modified.replace(/session\.user\.role/g, 'user.role');
  modified = modified.replace(/session\.user/g, 'user');

  // If function doesn't have req/request param, we need to check
  // NextJS route handlers get (req: NextRequest) or (request: NextRequest) as first param
  // Most already have it, but some might not name it

  fs.writeFileSync(file, modified, 'utf8');
  updated++;
  const relPath = path.relative(path.join(__dirname, '..'), file);
  console.log('Updated:', relPath);
}

console.log('\nDone! Updated:', updated, 'Skipped:', skipped);
