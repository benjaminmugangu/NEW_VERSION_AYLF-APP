'use server';

import { notFound, redirect } from 'next/navigation';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import * as allocationService from '@/services/allocations.service';
import { prisma } from '@/lib/prisma';
import { AllocationDetailClient } from './AllocationDetailClient';

interface AllocationDetailPageProps {
    params: Promise<{ id: string; locale: string }>;
}

export default async function AllocationDetailPage(props: AllocationDetailPageProps) {
    const params = await props.params;
    const { getUser } = getKindeServerSession();
    const kindeUser = await getUser();

    if (!kindeUser) {
        redirect('/login');
    }

    try {
        // Fetch allocation details
        const response = await allocationService.getAllocationById(params.id);

        if (!response.success || !response.data) {
            notFound();
        }
        const allocation = response.data;

        // Fetch user profile for authorization
        const userProfile = await prisma.profile.findUnique({
            where: { id: kindeUser.id },
            include: {
                site: true,
                smallGroup: true,
            }
        });

        if (!userProfile) {
            redirect('/login');
        }

        return (
            <AllocationDetailClient
                allocation={allocation}
                user={userProfile as any}
                locale={params.locale}
            />
        );
    } catch (error) {
        console.error('[AllocationDetail] Error:', error);
        notFound();
    }
}
