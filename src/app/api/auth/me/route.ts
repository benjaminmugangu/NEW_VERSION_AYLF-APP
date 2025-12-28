import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextResponse } from "next/server";
import { prisma, withRLS } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { logInfo, logError } from "@/lib/logger";
import { MESSAGES } from "@/lib/messages";

export const dynamic = 'force-dynamic';

export async function GET() {
  console.log("[AUTH_ME] Request started");
  try {
    const { getUser, isAuthenticated, getRoles } = getKindeServerSession();
    console.log("[AUTH_ME] Checking authentication...");
    const isAuth = await isAuthenticated();
    console.log("[AUTH_ME] IsAuthenticated:", isAuth);

    if (!isAuth) {
      console.log("[AUTH_ME] Not authenticated");
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const kindeUser = await getUser();
    console.log("[AUTH_ME] Kinde User ID:", kindeUser?.id);

    if (!kindeUser || !kindeUser.id || !kindeUser.email) {
      console.log("[AUTH_ME] Invalid Kinde user data");
      return NextResponse.json({ error: MESSAGES.errors.validation }, { status: 400 });
    }

    console.log("[AUTH_ME] Entering withRLS for user:", kindeUser.id);
    return await withRLS(kindeUser.id, async () => {
      console.log("[AUTH_ME] Inside withRLS, searching for profile...");
      // 1. First, try to find user by Kinde ID
      let dbUser = await prisma.profile.findUnique({
        where: { id: kindeUser.id },
        include: { site: true, smallGroup: true }
      });
      console.log("[AUTH_ME] Prisma lookup by ID complete. Found:", !!dbUser);

      // 2. Fallback: Search by email if not found by ID
      if (!dbUser && kindeUser.email) {
        console.log("[AUTH_ME] Falling back to email lookup:", kindeUser.email);
        const normalizedEmail = kindeUser.email.toLowerCase();
        const userByEmail = await prisma.profile.findUnique({
          where: { email: normalizedEmail },
          include: { site: true, smallGroup: true }
        });

        if (userByEmail) {
          console.error(`[AUTH_SYNC] CRITICAL: ID Mismatch for ${normalizedEmail}. Kinde ID: ${kindeUser.id}, Profile ID: ${userByEmail.id}`);

          return NextResponse.json({
            error: "Identity synchronization error",
            code: "ID_MISMATCH",
            details: {
              email: normalizedEmail,
              kindeId: kindeUser.id,
              dbId: userByEmail.id
            }
          }, { status: 403 });
        } else {
          console.log(`[AUTH_SYNC] User not found by ID (${kindeUser.id}) OR Email (${normalizedEmail}).`);
        }
      }

      // 3. Create profile if it still doesn't exist
      if (!dbUser) {
        console.log(`[AUTH_ME] Profile not found, attempting creation...`);

        const normalizedEmail = kindeUser.email!.toLowerCase();
        const invitation = await prisma.userInvitation.findFirst({
          where: {
            email: { equals: normalizedEmail, mode: 'insensitive' },
            status: "pending"
          },
          orderBy: { createdAt: "desc" }
        });

        const role: UserRole = invitation?.role || "MEMBER";
        const siteId = invitation?.siteId || null;
        const smallGroupId = invitation?.smallGroupId || null;

        try {
          dbUser = await prisma.profile.create({
            data: {
              id: kindeUser.id,
              email: normalizedEmail,
              name: `${kindeUser.given_name ?? ''} ${kindeUser.family_name ?? ''}`.trim() || kindeUser.email,
              role: role,
              siteId: siteId,
              smallGroupId: smallGroupId,
              status: "active",
            },
            include: { site: true, smallGroup: true }
          });
          console.log("[AUTH_ME] Profile created successfully");

          if (invitation) {
            await prisma.userInvitation.update({
              where: { id: invitation.id },
              data: { status: "accepted" }
            });
          }
        } catch (createError) {
          console.error(`[AUTH_SYNC] Profile creation FAILED:`, createError);
          throw createError;
        }
      }

      // 4. Role & Name Refresh 
      if (dbUser) {
        console.log("[AUTH_ME] Profile exists, checking for refreshes...");
        const kindeRoles = (await getRoles()) || [];
        const kindeRoleKey = kindeRoles[0]?.key;

        const roleMap: Record<string, UserRole> = {
          'national_coordinator': 'NATIONAL_COORDINATOR',
          'site_coordinator': 'SITE_COORDINATOR',
          'small_group_leader': 'SMALL_GROUP_LEADER',
          'member': 'MEMBER'
        };

        const targetRole = roleMap[kindeRoleKey || ''] || dbUser.role;
        const targetName = `${kindeUser.given_name ?? ''} ${kindeUser.family_name ?? ''}`.trim() || kindeUser.email || dbUser.name;

        if (dbUser.role !== targetRole || dbUser.name !== targetName) {
          console.log(`[AUTH_SYNC] Updating profile metadata...`);
          dbUser = await prisma.profile.update({
            where: { id: dbUser.id },
            data: {
              role: targetRole,
              name: targetName
            },
            include: { site: true, smallGroup: true }
          });
        }
      }

      console.log("[AUTH_ME] Finalizing response");
      const frontendUser = {
        id: dbUser!.id,
        name: dbUser!.name,
        email: dbUser!.email,
        role: dbUser!.role,
        siteId: dbUser!.siteId,
        smallGroupId: dbUser!.smallGroupId,
        siteName: dbUser!.site?.name,
        smallGroupName: dbUser!.smallGroup?.name,
        createdAt: dbUser!.createdAt.toISOString(),
        status: dbUser!.status,
      };

      return NextResponse.json({ user: frontendUser });
    });

  } catch (error: any) {
    console.error("[AUTH_ME_ERROR] CRITICAL:", error);
    return NextResponse.json({
      error: "Internal Server Error",
      message: error?.message || "Unknown error",
      details: error?.toString(),
      stack: error?.stack
    }, { status: 500 });
  }
}
