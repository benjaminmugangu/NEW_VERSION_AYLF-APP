import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export async function GET() {
  try {
    const { getUser, isAuthenticated } = getKindeServerSession();
    const isAuth = await isAuthenticated();

    if (!isAuth) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const kindeUser = await getUser();
    if (!kindeUser || !kindeUser.id || !kindeUser.email) {
      return NextResponse.json({ error: "Incomplete user data from Kinde" }, { status: 400 });
    }

    // 1. Chercher l'utilisateur dans notre DB
    let dbUser = await prisma.profile.findUnique({
      where: { id: kindeUser.id },
      include: {
        site: true,
        smallGroup: true,
      }
    });

    // 2. Si l'utilisateur n'existe pas, on le crée (Auto-Sync)
    if (!dbUser) {
      console.log(`Creating new user from Kinde: ${kindeUser.email}`);

      // Check for pending invitation
      const invitation = await prisma.userInvitation.findUnique({
        where: { email: kindeUser.email },
      });

      let role: UserRole = "member";
      let siteId: string | undefined;
      let smallGroupId: string | undefined;

      if (invitation) {
        console.log(`Found invitation for ${kindeUser.email}: ${invitation.role}`);
        role = invitation.role;
        siteId = invitation.siteId || undefined;
        smallGroupId = invitation.smallGroupId || undefined;

        // Mark invitation as accepted (or delete it)
        await prisma.userInvitation.update({
          where: { id: invitation.id },
          data: { status: 'accepted' }
        });
      }

      dbUser = await prisma.profile.create({
        data: {
          id: kindeUser.id,
          email: kindeUser.email,
          name: `${kindeUser.given_name ?? ''} ${kindeUser.family_name ?? ''}`.trim() || kindeUser.email,
          role: role,
          siteId: siteId,
          smallGroupId: smallGroupId,
          status: "active",
        },
        include: {
          site: true,
          smallGroup: true,
        }
      });
    }

    // 3. Construire l'objet User pour le frontend
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
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
