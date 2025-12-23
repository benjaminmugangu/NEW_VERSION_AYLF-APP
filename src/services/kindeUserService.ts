'use server';

/**
 * KINDE USER MANAGEMENT - TO BE IMPLEMENTED
 * 
 * Cette Server Action permettra de créer des utilisateurs dans Kinde
 * via leur Management API.
 * 
 * Documentation: https://kinde.com/docs/developer-tools/management-api/
 * 
 * REQUIREMENTS:
 * 1. Créer une Machine-to-Machine (M2M) application dans Kinde Dashboard
 * 2. Obtenir M2M Client ID et Client Secret
 * 3. Ajouter à .env.local :
 *    - KINDE_M2M_CLIENT_ID=...
 *    - KINDE_M2M_CLIENT_SECRET=...
 * 4. Installer SDK Kinde Management : npm install @kinde/management-api-js
 * 
 * TEMPORARY WORKAROUND:
 * En attendant l'implémentation, les utilisateurs peuvent être créés dans:
 * https://benjaminmugangu.kinde.com/admin/users
 */

import { prisma } from '@/lib/prisma';

export interface CreateUserData {
    email: string;
    name: string;
    role: 'NATIONAL_COORDINATOR' | 'SITE_COORDINATOR' | 'SMALL_GROUP_LEADER' | 'MEMBER';
    siteId?: string | null;
    smallGroupId?: string | null;
    mandateStartDate?: string | null;
    mandateEndDate?: string | null;
    status?: 'active' | 'inactive';
}

/**
 * NOTE: Cette fonction est un PLACEHOLDER qui simule la création
 * d'un utilisateur Kinde. Elle nécessite une vraie implémentation
 * avec Kinde Management API.
 */
export async function createKindeUser(data: CreateUserData) {
    throw new Error(
        'CREATE_USER_NOT_IMPLEMENTED: ' +
        'Cette fonctionnalité requiert Kinde Management API. ' +
        'Les utilisateurs doivent être créés manuellement dans le dashboard Kinde: ' +
        'https://benjaminmugangu.kinde.com/admin/users'
    );

    // FUTURE IMPLEMENTATION:
    // 1. Use Kinde Management API to create user:
    //    const accessToken = await getKindeM2MToken();
    //    const response = await fetch('https://benjaminmugangu.kinde.com/api/v1/user', {
    //      method: 'POST',
    //      headers: { 
    //        'Authorization': `Bearer ${accessToken}`,
    //        'Content-Type': 'application/json' 
    //      },
    //      body: JSON.stringify({
    //        email: data.email,
    //        given_name: data.name.split(' ')[0],
    //        family_name: data.name.split(' ').slice(1).join(' '),
    //      })
    //    });
    //
    // 2. Get Kinde user ID from response
    //
    // 3. Create associated Profile in Prisma:
    //    await prisma.profile.create({
    //      data: {
    //        id: kindeUserId,
    //        email: data.email,
    //        name: data.name,
    //        role: data.role,
    //        status: data.status || 'active',
    //        siteId: data.siteId,
    //        smallGroupId: data.smallGroupId,
    //        mandateStartDate: data.mandateStartDate ? new Date(data.mandateStartDate) : null,
    //        mandateEndDate: data.mandateEndDate ? new Date(data.mandateEndDate) : null,
    //      }
    //    });
    //
    // 4. Send invitation email via Kinde
    //
    // 5. Return success
}

/**
 * Delete a user from both Kinde and local database
 */
export async function deleteKindeUser(userId: string) {
    throw new Error(
        'DELETE_USER_NOT_IMPLEMENTED: ' +
        'Cette fonctionnalité requiert Kinde Management API. ' +
        'Les utilisateurs doivent être supprimés manuellement dans le dashboard Kinde.'
    );

    // FUTURE IMPLEMENTATION:
    // 1. Delete from Kinde via Management API
    // 2. Delete from Prisma:
    //    await prisma.profile.delete({ where: { id: userId } });
}
