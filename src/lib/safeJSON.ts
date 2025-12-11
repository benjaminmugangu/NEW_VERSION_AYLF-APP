/**
 * Safely parse JSON from a request
 * Returns parsed data or throws a descriptive error
 */
export async function safeParseJSON(request: Request): Promise<any> {
    try {
        const text = await request.text();

        if (!text || text.trim() === '') {
            throw new Error('Request body is empty');
        }

        return JSON.parse(text);
    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error('Invalid JSON in request body');
        }
        throw error;
    }
}
