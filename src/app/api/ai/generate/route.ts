import { NextRequest, NextResponse } from 'next/server';
import { generateAIResponse, AIRequest } from '@/lib/ai/aiService';

export async function POST(req: NextRequest) {
    try {
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
