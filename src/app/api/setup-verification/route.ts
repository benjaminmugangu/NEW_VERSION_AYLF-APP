
import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const userEmail = 'mugangubenjamin696@gmail.com';

        // Restore to National Coordinator
        // We keep the site/group association as it doesn't hurt, 
        // or we can remove it. Let's keep it to show they can belong to a group too.
        // Actually, let's remove it to return to a clean state.

        const updatedUser = await prisma.profile.update({
            where: { email: userEmail },
            data: {
                role: 'NATIONAL_COORDINATOR',
                // siteId: null,      // Optional: keep or remove
                // smallGroupId: null // Optional: keep or remove
            }
        });

        return NextResponse.json({
            success: true,
            message: `User ${userEmail} restored to NATIONAL_COORDINATOR.`,
            user: updatedUser
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
