import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextResponse } from "next/server";
import { prisma, withRLS } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { logInfo, logError } from "@/lib/logger";
import { MESSAGES } from "@/lib/messages";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { getUser, isAuthenticated } = getKindeServerSession();
    const isAuth = await isAuthenticated();

    if (!isAuth) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const kindeUser = await getUser();
    if (!kindeUser || !kindeUser.id || !kindeUser.email) {
      return NextResponse.json({ error: MESSAGES.errors.validation }, { status: 400 });
    }

    return await withRLS(kindeUser.id, async () => {
      // 1. First, try to find user by Kinde ID
      let dbUser = await prisma.profile.findUnique({
        where: { id: kindeUser.id },
        include: { site: true, smallGroup: true }
      });

      // 2. Fallback: Search by email if not found by ID
      if (!dbUser && kindeUser.email) {
        const normalizedEmail = kindeUser.email.toLowerCase();
        const userByEmail = await prisma.profile.findUnique({
          where: { email: normalizedEmail },
          include: { site: true, smallGroup: true }
        });

        if (userByEmail) {
          // SECURITY FIX: ID mismatch detected - this is a critical security issue
          // The user authenticated with Kinde ID X, but a profile exists with ID Y
          // This can happen if:
          // 1. User was created before Kinde integration
          // 2. Manual database manipulation
          // 3. Identity provider migration

          console.error(`[AUTH_SYNC] CRITICAL: ID Mismatch for ${normalizedEmail}. Kinde ID: ${kindeUser.id}, Profile ID: ${userByEmail.id}`);
          logError(`[AUTH_SYNC] ID Mismatch Detected`, new Error(`User ${normalizedEmail} has mismatched IDs`));

          // SECURITY: DO NOT allow login with mismatched IDs
          // This prevents user A from accessing user B's data
          return NextResponse.json({
            error: "Identity synchronization error. Please contact administrator.",
            code: "ID_MISMATCH",
            details: {
              email: normalizedEmail,
              hint: "Your account needs to be re-synchronized by an administrator"
            }
          }, { status: 403 });
        }
      }

      // 3. Create profile if it still doesn't exist
      if (!dbUser) {
        console.log(`[AUTH_SYNC] No profile found for ${kindeUser.email}. Creating new...`);

        const normalizedEmail = kindeUser.email.toLowerCase();
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

          if (invitation) {
            await prisma.userInvitation.update({
              where: { id: invitation.id },
              data: { status: "accepted" }
            });
          }
        } catch (createError) {
          console.error(`[AUTH_SYNC] Profile creation FAILED for ${normalizedEmail}:`, createError);
          throw createError;
        }
      }

      // 4. Final object for frontend
      const frontendUser = {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        siteId: dbUser.siteId,
        smallGroupId: dbUser.smallGroupId,
        siteName: dbUser.site?.name,
        smallGroupName: dbUser.smallGroup?.name,
        createdAt: dbUser.createdAt.toISOString(),
        status: dbUser.status,
      };

      return NextResponse.json({ user: frontendUser });
    });

  } catch (error) {
    console.error("[AUTH_SYNC_ERROR]", error);
    logError("[AUTH_SYNC_ERROR]", error);
    return NextResponse.json({ error: MESSAGES.errors.serverError }, { status: 500 });
  }
}
