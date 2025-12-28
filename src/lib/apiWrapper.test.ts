import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { withApiRLS } from './apiWrapper';
import { basePrisma } from './prisma';

// Mock dependencies
vi.mock('@kinde-oss/kinde-auth-nextjs/server', () => ({
    getKindeServerSession: () => ({
        getUser: async () => ({ id: 'user_123' }),
        isAuthenticated: async () => true,
    }),
}));

vi.mock('./prisma', async () => {
    const actual = await vi.importActual('./prisma');
    return {
        ...actual,
        basePrisma: {
            idempotencyKey: {
                findUnique: vi.fn(),
                create: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
            },
            $extends: vi.fn(() => ({
                $transaction: vi.fn((cb) => cb({ $executeRawUnsafe: vi.fn() }))
            })),
        },
        withRLS: vi.fn((userId, fn) => fn()),
    };
});

describe('withApiRLS Idempotency', () => {
    const mockHandler = vi.fn(async () => NextResponse.json({ message: 'Success' }));

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should execute handler if no idempotency key', async () => {
        const req = new NextRequest('http://localhost/api/test', { method: 'POST' });
        const wrapped = withApiRLS(mockHandler);
        await wrapped(req);
        expect(mockHandler).toHaveBeenCalledTimes(1);
    });

    it('should return cached response if key exists and is COMPLETED', async () => {
        const key = 'idem_1';
        const cachedResponse = { message: 'Cached' };

        // Mock DB finding the key directly (Lock-First logic checks create error first usually, but check findUnique logic)
        // Actually, logic is: try create -> catch P2002 -> findUnique.
        // So we must simulate create failure P2002.
        (basePrisma.idempotencyKey.create as any).mockRejectedValue({ code: 'P2002' });
        (basePrisma.idempotencyKey.findUnique as any).mockResolvedValue({
            key,
            response: cachedResponse
        });

        const req = new NextRequest('http://localhost/api/test', {
            method: 'POST',
            headers: { 'idempotency-key': key }
        });

        const wrapped = withApiRLS(mockHandler);
        const res = await wrapped(req);

        expect(basePrisma.idempotencyKey.create).toHaveBeenCalled();
        expect(basePrisma.idempotencyKey.findUnique).toHaveBeenCalledWith({ where: { key } });
        expect(mockHandler).not.toHaveBeenCalled();
        const body = await res.json();
        expect(body).toEqual(cachedResponse);
    });

    it('should return 409 if key exists and is PENDING (Concurrency)', async () => {
        const key = 'idem_conflict';
        
        // Mock DB: Create fails (P2002), Find returns PENDING
        (basePrisma.idempotencyKey.create as any).mockRejectedValue({ code: 'P2002' });
        (basePrisma.idempotencyKey.findUnique as any).mockResolvedValue({
            key,
            response: { status: 'PENDING', timestamp: 12345 }
        });

        const req = new NextRequest('http://localhost/api/test', {
            method: 'POST',
            headers: { 'idempotency-key': key }
        });

        const wrapped = withApiRLS(mockHandler);
        const res = await wrapped(req);

        expect(res.status).toBe(409);
        expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should lock, execute, and update response if key is new', async () => {
        const key = 'idem_new';
        // Mock Create Success
        (basePrisma.idempotencyKey.create as any).mockResolvedValue({ key });

        const req = new NextRequest('http://localhost/api/test', {
            method: 'POST',
            headers: { 'idempotency-key': key }
        });

        const wrapped = withApiRLS(mockHandler);
        const res = await wrapped(req);

        // 1. Lock acquired
        expect(basePrisma.idempotencyKey.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                key,
                response: expect.objectContaining({ status: 'PENDING' })
            })
        }));

        // 2. Handler executed
        expect(mockHandler).toHaveBeenCalledTimes(1);

        // 3. Response Updated
        expect(basePrisma.idempotencyKey.update).toHaveBeenCalledWith({
            where: { key },
            data: { response: { message: 'Success' } }
        });
    });
});
