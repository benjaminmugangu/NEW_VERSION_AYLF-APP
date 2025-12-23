const fs = require('node:fs');
const path = require('node:path');

const apiDir = path.join(process.cwd(), 'src', 'app', 'api');
const routes = [];

function findRoutes(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            findRoutes(fullPath);
        } else if (file === 'route.ts') {
            routes.push(fullPath);
        }
    }
}

findRoutes(apiDir);

console.log(`Found ${routes.length} API routes. Analyzing coverage...\n`);

let totalHandlers = 0;
let wrappedHandlers = 0;
let issues = [];

const EXCLUDED_ROUTES = [
    String.raw`api\auth\me`, // Intentionally not wrapped (identity source)
    'api/auth/me',
    String.raw`api\cron`,    // Uses Bearer token auth
    'api/cron',
    String.raw`api\auth\[kindeAuth]`, // Library handler
    'api/auth/[kindeAuth]'
];

for (const route of routes) {
    const relativePath = path.relative(process.cwd(), route);
    const content = fs.readFileSync(route, 'utf8');

    if (EXCLUDED_ROUTES.some(ex => relativePath.includes(ex))) {
        console.log(`[SKIP] ${relativePath} (Excluded)`);
        continue;
    }

    const handlers = ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'];
    let foundInFile = false;

    for (const h of handlers) {
        const regex = new RegExp(`export (async function|const) ${h}`, 'g');
        if (regex.test(content)) {
            totalHandlers++;
            foundInFile = true;

            const isWrapped = content.includes(`${h} = withApiRLS`) || content.includes(`${h}: withApiRLS`);
            if (isWrapped) {
                wrappedHandlers++;
            } else {
                issues.push(`[MISSING WRAPPER] ${h} in ${relativePath}`);
            }
        }
    }

    if (foundInFile && !content.includes('withApiRLS')) {
        issues.push(`[MISSING IMPORT] withApiRLS in ${relativePath}`);
    }
}

console.log('\n--- VERIFICATION REPORT ---');
console.log(`Total Routes Scanned: ${routes.length}`);
console.log(`Total Handlers Found: ${totalHandlers}`);
console.log(`Wrapped Handlers: ${wrappedHandlers}`);
console.log(`Coverage: ${((wrappedHandlers / totalHandlers) * 100).toFixed(2)}%`);

if (issues.length > 0) {
    console.log('\nISSUES FOUND:');
    issues.forEach(issue => console.log(issue));
    process.exit(1);
} else {
    console.log('\n✅ 100% COVERAGE VERIFIED!');
    process.exit(0);
}
