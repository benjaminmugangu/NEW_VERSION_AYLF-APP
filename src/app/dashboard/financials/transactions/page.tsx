import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { profileService } from '@/services/profileService';
import { transactionService } from '@/services/transactionService';
import { ROLES } from '@/lib/constants';
import { TransactionsClient } from './components/TransactionsClient';
import type { User, FinancialTransaction } from '@/lib/types';

export default async function TransactionsPage(props: any) {
  const { searchParams } = props;
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser }, error } = await supabase.auth.getUser();

  if (error || !authUser) {
    redirect('/login');
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
