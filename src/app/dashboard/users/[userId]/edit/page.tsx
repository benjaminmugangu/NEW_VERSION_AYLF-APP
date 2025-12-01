import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EditUserForm from "../../components/EditUserForm";

export const dynamic = 'force-dynamic';

interface EditUserPageProps {
  params: Promise<{
    userId: string;
  }>;
}

export default async function EditUserPage({ params }: EditUserPageProps) {
  const { userId } = await params;
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

  const targetUser = await prisma.profile.findUnique({
    where: { id: userId },
  });

  if (!targetUser) {
    notFound();
  }

  const sites = await prisma.site.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  const smallGroups = await prisma.smallGroup.findMany({
    select: { id: true, name: true, siteId: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit User</h1>
        <p className="text-muted-foreground">
          Update user role and assignments.
        </p>
      </div>
      <EditUserForm user={targetUser} sites={sites} smallGroups={smallGroups} />
    </div>
  );
}
