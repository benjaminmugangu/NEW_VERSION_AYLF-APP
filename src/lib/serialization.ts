/**
 * Simple recursive function to ensure an object is a Plain Old JavaScript Object (POJO).
 * Converts Dates to ISO strings and handles arrays/nested objects.
 * Useful for ensuring serializability between Server and Client components in Next.js.
 */
export function ensurePOJO<T>(obj: T): T {
    if (obj === null || obj === undefined) return obj;

    if (obj instanceof Date) {
        return obj.toISOString() as any;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => ensurePOJO(item)) as any;
    }

    if (typeof obj === 'object') {
        // Check if it's a plain object or something else (like Decimal)
        const result: any = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const value = obj[key];

                // Handle Prisma Decimal or similar objects with toJSON/toString
                if (value && typeof value === 'object' && 'toNumber' in value && typeof value.toNumber === 'function') {
                    result[key] = value.toNumber();
                } else if (value && typeof value === 'object' && 'toString' in value && value.constructor.name === 'Decimal') {
                    result[key] = parseFloat(value.toString());
                } else {
                    result[key] = ensurePOJO(value);
                }
            }
        }
        return result;
    }

    if (typeof obj === 'bigint') {
        return (obj as bigint).toString() as any;
    }

    return obj;
}
