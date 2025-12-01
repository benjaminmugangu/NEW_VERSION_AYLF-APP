import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from 'next/navigation';
import * as profileService from '@/services/profileService';
import * as transactionService from '@/services/transactionService';
import { ROLES } from '@/lib/constants';
import { TransactionsClient } from './components/TransactionsClient';
import type { User, FinancialTransaction } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function TransactionsPage(props: any) {
  const { searchParams } = await props;
  const { getUser } = getKindeServerSession();
  const authUser = await getUser();

  if (!authUser || !authUser.id) {
    redirect('/api/auth/login');
  }

  const currentUser: User = await profileService.getProfile(authUser.id);

  if (!currentUser || currentUser.role !== ROLES.NATIONAL_COORDINATOR) {
    return (
      <div className="p-4">
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  const typeParam = searchParams?.type;
  const typeValue = Array.isArray(typeParam) ? typeParam[0] : typeParam;
  let typeFilter: 'income' | 'expense' | undefined;
  if (typeValue === 'income' || typeValue === 'expense') {
    typeFilter = typeValue;
  }

  const initialFilters = {
    user: currentUser,
    typeFilter,
  };

  let initialTransactions: FinancialTransaction[] = [];
  try {
    initialTransactions = await transactionService.getFilteredTransactions(initialFilters);
  } catch (error) {
    console.error('Failed to fetch initial transactions:', error);
    // The client component will show an error state
  }

  return <TransactionsClient initialTransactions={initialTransactions} user={currentUser} />;
}
