import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { redirect } from 'next/navigation';
import { Package } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { InventoryList } from '@/components/financial/InventoryList';
import { CreateInventoryDialog } from '@/components/financial/CreateInventoryDialog';
import { getInventoryItems } from '@/services/inventoryService';
import { ROLES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = [ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR];

export default async function InventoryPage() {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user || !user.id) {
    redirect('/api/auth/login');
  }

  // Fetch profile for role check
  const profileService = await import('@/services/profileService');
  const userProfile = await profileService.getProfile(user.id);

  if (!userProfile || !ALLOWED_ROLES.includes(userProfile.role as any)) {
    redirect('/dashboard');
  }

  // Site Coordinators only see their site's inventory
  const siteId = userProfile.role === ROLES.SITE_COORDINATOR ? userProfile.siteId || undefined : undefined;
  const items = await getInventoryItems(siteId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Inventory Management"
        description="Track physical assets and equipment purchased with organizational funds."
        icon={Package}
        actions={<CreateInventoryDialog siteId={siteId} />}
      />

      <InventoryList items={items} />
    </div>
  );
}
