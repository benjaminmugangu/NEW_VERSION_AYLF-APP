
import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import type { UserRole } from '@prisma/client';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');
        const userEmail = 'mugangubenjamin696@gmail.com'; // Hardcoded for testing session

        if (!action) {
            return NextResponse.json({ error: "Action required" }, { status: 400 });
        }

        // 1. Ensure Base Entities Exist
        const siteName = 'Scenario Site';
        let site = await prisma.site.findFirst({ where: { name: siteName } });
        if (!site) {
            site = await prisma.site.create({
                data: { name: siteName, city: 'Goma', country: 'DRC' }
            });
        }

        const groupName = 'Scenario Group';
        let group = await prisma.smallGroup.findFirst({ where: { name: groupName } });
        if (!group) {
            group = await prisma.smallGroup.create({
                data: { name: groupName, siteId: site.id, meetingDay: 'Friday', meetingTime: '16:00' }
            });
        }

        let updatedUser;

        // 2. Switch Roles based on Action
        switch (action) {
            case 'setup_nc':
                updatedUser = await prisma.profile.update({
                    where: { email: userEmail },
                    data: { role: 'NATIONAL_COORDINATOR' } // NC sees all, siteId/groupId optional but usually null
                });
                break;

            case 'setup_sc':
                updatedUser = await prisma.profile.update({
                    where: { email: userEmail },
                    data: {
                        role: 'SITE_COORDINATOR',
                        siteId: site.id,
                        smallGroupId: null
                    }
                });
                break;

            case 'setup_sgl':
                updatedUser = await prisma.profile.update({
                    where: { email: userEmail },
                    data: {
                        role: 'SMALL_GROUP_LEADER',
                        siteId: site.id,
                        smallGroupId: group.id
                    }
                });
                break;

            case 'setup_member':
                updatedUser = await prisma.profile.update({
                    where: { email: userEmail },
                    data: {
                        role: 'MEMBER',
                        siteId: site.id,
                        smallGroupId: group.id
                    }
                });
                break;

            case 'check_state':
                updatedUser = await prisma.profile.findUnique({
                    where: { email: userEmail },
                    include: { site: true, smallGroup: true }
                });
                break;

            default:
                return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            action,
            user: {
                email: updatedUser?.email,
                role: updatedUser?.role,
                site: updatedUser?.siteId,
                group: updatedUser?.smallGroupId
            }
        });

    } catch (error: any) {
        console.error('Test Controller Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
