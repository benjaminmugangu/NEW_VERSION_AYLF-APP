import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

    // 1. First, try to find user by Kinde ID
    let dbUser = await prisma.profile.findUnique({
      where: { id: kindeUser.id },
      include: { site: true, smallGroup: true }
    });

    // 2. If not found by ID, try finding by email (in case of manual creation or ID change)
    if (!dbUser && kindeUser.email) {
      console.log(`[AUTH_SYNC] Searching by email for: ${kindeUser.email}`);
      const userByEmail = await prisma.profile.findUnique({
        where: { email: kindeUser.email.toLowerCase() },
        include: { site: true, smallGroup: true }
      });

      if (userByEmail) {
        console.log(`[AUTH_SYNC] Found existing profile by email. Updating ID to Kinde ID: ${kindeUser.id}`);
        try {
          dbUser = await prisma.profile.update({
            where: { id: userByEmail.id },
            data: { id: kindeUser.id }, // Update the primary key to match Kinde
            include: { site: true, smallGroup: true }
          });
        } catch (updateError) {
          console.error(`[AUTH_SYNC] Could not update ID. Using existing profile.`, updateError);
          dbUser = userByEmail;
        }
      }
    }

    // 3. Auto-Sync: Create profile if it still doesn't exist
    if (!dbUser) {
      console.log(`[AUTH_SYNC] Creating new profile for: ${kindeUser.email}`);

      const invitation = await prisma.userInvitation.findFirst({
        where: {
          email: { equals: kindeUser.email, mode: 'insensitive' },
          status: "pending"
        },
        orderBy: { createdAt: "desc" }
      });

      const role: UserRole = invitation?.role || "member";
      const siteId = invitation?.siteId || null;
      const smallGroupId = invitation?.smallGroupId || null;

      try {
        dbUser = await prisma.profile.create({
          data: {
            id: kindeUser.id,
            email: kindeUser.email.toLowerCase(),
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
        console.error(`[AUTH_SYNC] Profile creation FAILED:`, createError);
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

  } catch (error) {
    console.error("[AUTH_SYNC_ERROR]", error);
    logError("[AUTH_SYNC_ERROR]", error);
    return NextResponse.json({ error: MESSAGES.errors.serverError }, { status: 500 });
  }
}
