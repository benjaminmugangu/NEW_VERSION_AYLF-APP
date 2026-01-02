import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import UsersClient from "./components/UsersClient";

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const { isAuthenticated, getUser } = getKindeServerSession();
  const isAuth = await isAuthenticated();

  if (!isAuth) {
    redirect("/login");
  }

  const user = await getUser();
  if (!user) {
    redirect("/login");
  }
  const currentUser = await prisma.profile.findUnique({
    where: { id: user.id },
  });

  if (currentUser?.role !== 'NATIONAL_COORDINATOR') {
    redirect("/dashboard");
  }

  const rawUsers = await prisma.profile.findMany({
    include: {
      site: { select: { name: true } },
      smallGroup: {
        include: {
          site: { select: { name: true } }
        }
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Normalize users with site fallback
  const users = rawUsers.map((user: any) => ({
    ...user,
    site: user.site || user.smallGroup?.site || null
  }));

  return <UsersClient initialUsers={users} />;
}
