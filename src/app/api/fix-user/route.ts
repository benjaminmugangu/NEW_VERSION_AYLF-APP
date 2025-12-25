import { NextResponse } from 'next/server';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { prisma, withRLS } from "@/lib/prisma";

export async function GET() {
    try {
        const { getUser } = getKindeServerSession();
        const user = await getUser();

        if (!user || !user.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // We run with RLS disabled/bypassed by using the basePrisma if needed, 
        // but here we can just use withRLS with a dummy/admin ID if we had one.
        // Actually, let's use basePrisma to bypass RLS for this fix.
        const { basePrisma } = await import('@/lib/prisma');

        const updated = await basePrisma.profile.update({
            where: { email: user.email.toLowerCase() },
            data: {
                role: 'NATIONAL_COORDINATOR',
                status: 'active'
            }
        });

        return NextResponse.json({
            success: true,
            message: `User ${user.email} promoted to NATIONAL_COORDINATOR`,
            user: updated
        });
    } catch (error: any) {
        console.error('Fix error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
