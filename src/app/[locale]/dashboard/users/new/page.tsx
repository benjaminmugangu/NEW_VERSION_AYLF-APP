import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import InviteUserForm from "../components/InviteUserForm";
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function InviteUserPage() {
  const t = await getTranslations('Users');
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
        <h1 className="text-3xl font-bold tracking-tight">{t('invite_user')}</h1>
        <p className="text-muted-foreground">
          {t('forms.fill_details')}
        </p>
      </div>
      <InviteUserForm sites={sites} smallGroups={smallGroups} />
    </div>
  );
}
