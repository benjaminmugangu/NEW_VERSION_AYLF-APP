import { NextRequest, NextResponse } from 'next/server';
import { generateAIResponse, AIRequest } from '@/lib/ai/aiService';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
    try {
        // 1. Rate Limiting to prevent AI abuse
        const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
        const { success } = await rateLimit(ip, { limit: 5, interval: 60 * 1000, uniqueTokenPerInterval: 500 }); // 5 requests per minute

        if (!success) {
            return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
        }

        const body = await req.json();
        const { action, text } = body;

        if (!action || !text) {
            return NextResponse.json({ error: 'Missing action or text' }, { status: 400 });
        }

        const result = await generateAIResponse({ action, text } as AIRequest);

        return NextResponse.json({ result });
    } catch (error) {
        console.error('AI Service Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
