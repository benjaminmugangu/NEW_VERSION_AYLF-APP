import { withAuth } from '@kinde-oss/kinde-auth-nextjs/middleware';
import { NextRequest } from 'next/server';

export default withAuth(
  async function middleware(req: NextRequest) {
    // Optionnel : tu peux inspecter req.kindeAuth ici
    // const { user } = req.kindeAuth || {};
    // console.log('Kinde user in middleware:', user);
  },
  {
    // Routes publiques (pas besoin d'être connecté)
    publicPaths: ['/', '/login', '/signup', '/auth/auth-code-error'],
    // Tu pourras retirer /login et /signup quand on les aura remplacées par Kinde
  },
);

export const config = {
  matcher: [
    // Protéger toutes les routes sauf les internals Next.js et les assets statiques
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
};