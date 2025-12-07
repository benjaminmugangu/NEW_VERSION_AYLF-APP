import { withAuth } from '@kinde-oss/kinde-auth-nextjs/middleware';
import createMiddleware from 'next-intl/middleware';
import { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware({
  locales: ['fr', 'en', 'sw'],
  defaultLocale: 'fr'
});

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Define public paths (both root and localized)
  // These paths bypass Kinde authentication
  const publicPathPrefixes = ['/login', '/signup', '/auth', '/api/auth', '/api/webhooks', '/impact'];

  const isPublic =
    pathname === '/' ||
    publicPathPrefixes.some(prefix => pathname.startsWith(prefix)) ||
    // Check localized public paths (e.g., /fr/login)
    ['/fr', '/en', '/sw'].some(locale =>
      pathname === locale ||
      publicPathPrefixes.some(prefix => pathname.startsWith(`${locale}${prefix}`))
    );

  // 2. Run next-intl middleware first to handle redirects and locale detection
  const res = intlMiddleware(req);

  // 3. If it's a public path, return the intl response immediately
  if (isPublic) {
    return res;
  }

  // 4. Wrap with Kinde Auth for protected routes
  // We apply 'as any' cast to bypass TypeScript error regarding call signature
  return (withAuth(async (req: NextRequest) => {
    // If we are here, user is authenticated
    return res;
  }) as any)(req);
}

export const config = {
  matcher: [
    // Match all paths except static files and next internals
    '/((?!api|_next|.*\\..*).*)'
  ]
};