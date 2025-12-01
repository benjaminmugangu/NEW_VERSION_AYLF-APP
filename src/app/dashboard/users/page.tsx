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

  if (!currentUser || currentUser.role !== 'national_coordinator') {
    redirect("/dashboard");
  }

  const users = await prisma.profile.findMany({
    include: {
      site: { select: { name: true } },
      smallGroup: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return <UsersClient initialUsers={users} />;
}
