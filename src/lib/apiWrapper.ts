import { NextRequest, NextResponse } from 'next/server';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { withRLS } from './prisma';
import { MESSAGES } from './messages';

/**
 * A higher-order function to wrap API route handlers.
 * It authenticates the user via Kinde and wraps the handler execution 
 * in a Prisma RLS context using AsyncLocalStorage.
 * 
 * @param handler The API route handler function (GET, POST, etc.)
 * @returns A wrapped handler that enforces session-based RLS
 */
export function withApiRLS(handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>) {
    return async (req: NextRequest, ...args: any[]) => {
        try {
            const { getUser, isAuthenticated } = getKindeServerSession();
            const isAuth = await isAuthenticated();

            if (!isAuth) {
                return NextResponse.json({ error: MESSAGES.errors.unauthorized }, { status: 401 });
            }

            const user = await getUser();
            if (!user || !user.id) {
                return NextResponse.json({ error: MESSAGES.errors.validation }, { status: 400 });
            }

            // Run the handler within the RLS context
            return await withRLS(user.id, () => handler(req, ...args));
        } catch (error) {
            console.error('[API_RLS_WRAPPER_ERROR]', error);
            return NextResponse.json(
                { error: MESSAGES.errors.serverError },
                { status: 500 }
            );
        }
    };
}
