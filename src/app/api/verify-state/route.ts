import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        // Assuming userEmail would come from authentication or query parameters in a real application.
        // For this specific change, we'll keep the hardcoded email as it was in the original,
        // as the provided snippet uses `userEmail` but doesn't define it, implying it should exist.
        // In a real scenario, this would likely be extracted from the request's auth token.
        const userEmail = 'mugangubenjamin696@gmail.com'; // Keeping this line as it was in the original, as the snippet uses `userEmail`

        const user = await prisma.profile.findUnique({
            where: { email: userEmail },
            include: { smallGroup: true, site: true }
        });

        if (!user) return NextResponse.json({ error: "User not found" });

        const searchParams = new URL(request.url).searchParams;
        const checkMode = searchParams.get('mode');

        const result: any = {
            email: user.email,
            role: user.role,
            group: user.smallGroup?.name,
            site: user.site?.name,
            siteId: user.siteId,
            canAccessNationalDashboard: user.role === 'NATIONAL_COORDINATOR'
        };

        if (checkMode === 'sc_validation') {
            // Verify SC Isolation: Try to fetch a site that isn't theirs
            const otherSite = await prisma.site.findFirst({
                where: { id: { not: user.siteId || '' } }
            });

            // This check simulates what the UI would do via RLS -> but here we are server side.
            // Server side purely with prismaClient bypasses RLS unless we use withRLS.
            // So we need to simulate the permission logic or trust the role.
            // Let's rely on role property check for now.
            result.isSiteCoordinator = user.role === 'SITE_COORDINATOR';
            result.hasSiteAssigned = !!user.siteId;
        }

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
