import { NextRequest, NextResponse } from 'next/server';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { withRLS, basePrisma } from './prisma';
import { MESSAGES } from './messages';

/**
 * A higher-order function to wrap API route handlers.
 * It authenticates the user via Kinde and wraps the handler execution 
 * in a Prisma RLS context using AsyncLocalStorage.
 * 
 * @param handler The API route handler function (GET, POST, etc.)
 * @returns A wrapped handler that enforces session-based RLS
 */
export function withApiRLS(handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse | Response>) {
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

            // IDEMPOTENCY CHECK & LOCK
            const idempotencyKey = req.headers.get('idempotency-key');
            if (idempotencyKey) {
                try {
                    // 1. Try to acquire lock by creating PENDING record
                    await basePrisma.idempotencyKey.create({
                        data: {
                            key: idempotencyKey,
                            response: { status: 'PENDING', timestamp: Date.now() }
                        }
                    });
                } catch (err: any) {
                    if (err.code === 'P2002') { // Unique constraint violation (Lock exists)
                        const existing = await basePrisma.idempotencyKey.findUnique({
                            where: { key: idempotencyKey }
                        });

                        if (existing) {
                            const stored = existing.response as any;
                            // Check if it's a finished response or a pending lock
                            if (stored?.status === 'PENDING') {
                                // 409 Conflict: Request is currently being processed
                                return NextResponse.json(
                                    { error: 'Request is currently being processed', code: 'IDEMPOTENCY_CONFLICT' },
                                    { status: 409 }
                                );
                            }
                            // Return cached response
                            return NextResponse.json(existing.response);
                        }
                    }
                    // If we can't verify lock, fail safe (allow retry or fail?)
                    // Failing is safer to prevent Duplicates.
                    console.error('[IDEMPOTENCY_LOCK_ERROR]', err);
                    throw err;
                }
            }

            // Run the handler within the RLS context
            let response;
            try {
                response = await withRLS(user.id, () => handler(req, ...args));
            } catch (handlerError) {
                // If handler crashed, Release Lock so it can be retried
                if (idempotencyKey) {
                    await basePrisma.idempotencyKey.delete({ where: { key: idempotencyKey } }).catch(() => { });
                }
                throw handlerError;
            }

            // IDEMPOTENCY UPDATE (Unlock)
            if (idempotencyKey) {
                if (response.ok) {
                    try {
                        const clone = response.clone();
                        const contentType = clone.headers.get('content-type');
                        if (contentType && contentType.includes('application/json')) {
                            const body = await clone.json();
                            // Update the placeholder with actual response
                            await basePrisma.idempotencyKey.update({
                                where: { key: idempotencyKey },
                                data: { response: body }
                            });
                        } else {
                            // Non-JSON response? Delete lock? Or store dummy?
                            // Delete lock implies it wasn't valid for caching.
                            await basePrisma.idempotencyKey.delete({ where: { key: idempotencyKey } });
                        }
                    } catch (saveError) {
                        console.error('[IDEMPOTENCY_UPDATE_ERROR]', saveError);
                        // Try to delete lock if update failed?
                    }
                } else {
                    // Failed response (4xx, 5xx) -> Release Lock
                    await basePrisma.idempotencyKey.delete({ where: { key: idempotencyKey } }).catch(() => { });
                }
            }

            return response;

        } catch (error) {
            console.error('[API_RLS_WRAPPER_ERROR]', error);
            return NextResponse.json(
                { error: MESSAGES.errors.serverError },
                { status: 500 }
            );
        }
    };
}
