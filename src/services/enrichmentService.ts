import { getSignedUrls } from './storageService';

/**
 * Generic interface for any entity that might have an avatar URL
 */
interface EntityWithAvatar {
    [key: string]: any;
}

/**
 * Batch signs avatar URLs for a list of entities.
 * 
 * @param entities List of objects containing avatar URLs
 * @param urlKeys Array of keys in the object that contain the avatar path (e.g. ['avatarUrl', 'author.avatarUrl'])
 * @returns The entities with signed URLs
 */
export async function batchSignAvatars<T extends EntityWithAvatar>(
    entities: T[],
    urlKeys: string[] = ['avatarUrl']
): Promise<T[]> {
    if (!entities || entities.length === 0) return entities;

    // 1. Extract all unique paths
    const pathsToSign = new Set<string>();

    const getValue = (obj: any, path: string) => {
        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    };

    const setValue = (obj: any, path: string, value: string) => {
        const parts = path.split('.');
        const last = parts.pop();
        const target = parts.reduce((acc, part) => acc && acc[part], obj);
        if (target && last) target[last] = value;
    };

    entities.forEach(entity => {
        urlKeys.forEach(key => {
            const val = getValue(entity, key);
            if (val && typeof val === 'string' && !val.startsWith('http')) {
                pathsToSign.add(val);
            }
        });
    });

    if (pathsToSign.size === 0) return entities;

    try {
        // 2. Sign paths
        const signedUrls = await getSignedUrls(Array.from(pathsToSign), 'avatars');

        // 3. Re-assign signed URLs
        entities.forEach(entity => {
            urlKeys.forEach(key => {
                const originalPath = getValue(entity, key);
                if (originalPath && signedUrls[originalPath]) {
                    setValue(entity, key, signedUrls[originalPath]);
                }
            });
        });
    } catch (error) {
        console.error('[EntityEnricher] Failed to batch sign avatars:', error);
        // On error, return entities as-is (with original paths) involves minimal disruption
    }

    return entities;
}
