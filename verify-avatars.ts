
import { getProfile, getUsers } from './src/services/profileService';
import { getSitesWithDetails } from './src/services/siteService';
import { getFilteredSmallGroups } from './src/services/smallGroupService';

async function verifyAvatars() {
    console.log('--- Avatar Verification Start ---');

    try {
        // 1. Check Profile Signing
        // We'll use a dummy ID just to see if the mapping and signing logic triggers
        // (This might fail if no profiles exist in DB, but we'll try to get all users first)
        const response = await getUsers();
        if (!response.success || !response.data) {
            console.error('Failed to fetch users:', response.error);
            return;
        }
        const users = response.data;
        console.log(`Fetched ${users.length} users.`);
        users.slice(0, 2).forEach(u => {
            console.log(`User: ${u.name}, avatarUrl: ${u.avatarUrl}`);
            if (u.avatarUrl && u.avatarUrl.startsWith('http')) {
                console.log('  ✅ avatarUrl is signed/public');
            } else if (u.avatarUrl) {
                console.log('  ❌ avatarUrl is NOT signed');
            } else {
                console.log('  ℹ️ No avatarUrl');
            }
        });

        // 2. Check Site Coordinator Signing
        // Note: requires a mock user for RLS
        const mockUser: any = { id: 'admin-id', role: 'NATIONAL_COORDINATOR' };
        const sitesResponse = await getSitesWithDetails(mockUser);
        const sites = sitesResponse.success && sitesResponse.data ? sitesResponse.data : [];
        console.log(`Fetched ${sites.length} sites.`);
        sites.slice(0, 2).forEach(s => {
            console.log(`Site: ${s.name}, Coordinator Avatar: ${s.coordinatorProfilePicture}`);
            if (s.coordinatorProfilePicture && s.coordinatorProfilePicture.startsWith('http')) {
                console.log('  ✅ Coordinator Avatar is signed');
            }
        });

        // 3. Check Small Group Leader Signing
        const groupsResponse = await getFilteredSmallGroups({ user: mockUser });
        const groups = groupsResponse.success && groupsResponse.data ? groupsResponse.data : [];
        console.log(`Fetched ${groups.length} small groups.`);
        groups.slice(0, 2).forEach(g => {
            console.log(`Group: ${g.name}, Leader Avatar: ${g.leader?.avatarUrl}`);
            if (g.leader?.avatarUrl && g.leader.avatarUrl.startsWith('http')) {
                console.log('  ✅ Leader Avatar is signed');
            }
        });

    } catch (error) {
        console.error('Verification failed:', error);
    }

    console.log('--- Avatar Verification End ---');
}

verifyAvatars();
