import { NextRequest, NextResponse } from 'next/server';
import { generateAIResponse, AIRequest } from '@/lib/ai/aiService';
import { rateLimit } from '@/lib/rateLimit';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { withApiRLS } from '@/lib/apiWrapper';

export const POST = withApiRLS(async (req: NextRequest) => {
    try {
        const { getUser } = getKindeServerSession();
        const user = await getUser();

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Rate Limiting to prevent AI abuse (now per user, not IP)
        const { success } = await rateLimit(user.id, { limit: 5, interval: 60 * 1000, uniqueTokenPerInterval: 500 }); // 5 requests per minute per user

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
});

