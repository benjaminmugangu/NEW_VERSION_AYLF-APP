import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EditUserForm from "../../components/EditUserForm";
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

interface EditUserPageProps {
  params: Promise<{
    userId: string;
  }>;
}

export default async function EditUserPage({ params }: EditUserPageProps) {
  const t = await getTranslations('Users');
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
        <h1 className="text-3xl font-bold tracking-tight">{t('forms.edit_user')}</h1>
        <p className="text-muted-foreground">
          {t('forms.update_details', { name: targetUser.name })}
        </p>
      </div>
      <EditUserForm user={targetUser} sites={sites} smallGroups={smallGroups} />
    </div>
  );
}
