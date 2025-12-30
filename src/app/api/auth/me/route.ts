import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma, withRLS } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { logInfo, logError } from "@/lib/logger";
import { MESSAGES } from "@/lib/messages";
import { getSyncProfile } from "@/services/authService";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    // Unified Profile Fetch, Creation, and Sync
    const kindeRoles = (await getRoles()) || [];
    const kindeRoleKey = kindeRoles[0]?.key;

    // We optionally pass withRLS here for logging context, 
    // but the actual DB operations in getSyncProfile use basePrisma to avoid timeouts.
    return await withRLS(kindeUser.id, async () => {
      const user = await getSyncProfile(kindeUser, kindeRoleKey);

      console.log("[AUTH_ME] Sync complete for:", user.email);
      return NextResponse.json({ user });
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
