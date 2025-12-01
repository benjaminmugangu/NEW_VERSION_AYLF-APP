import { NextResponse } from 'next/server';

const KINDE_DOMAIN = process.env.KINDE_ISSUER_URL;
const KINDE_M2M_CLIENT_ID = process.env.KINDE_M2M_CLIENT_ID;
const KINDE_M2M_CLIENT_SECRET = process.env.KINDE_M2M_CLIENT_SECRET;

interface KindeTokenResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
}

interface CreateUserParams {
    email: string;
    firstName: string;
    lastName?: string;
}

/**
 * Fetches an access token for the Kinde Management API using Client Credentials flow.
 */
async function getKindeAccessToken(): Promise<string> {
    if (!KINDE_DOMAIN || !KINDE_M2M_CLIENT_ID || !KINDE_M2M_CLIENT_SECRET) {
        throw new Error('Missing Kinde M2M configuration (KINDE_ISSUER_URL, KINDE_M2M_CLIENT_ID, KINDE_M2M_CLIENT_SECRET)');
    }

    // Extract domain from URL if needed, or use full URL for token endpoint
    // KINDE_ISSUER_URL is usually like "https://your-domain.kinde.com"
    const tokenEndpoint = `${KINDE_DOMAIN}/oauth2/token`;

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('audience', `${KINDE_DOMAIN}/api`);

    const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(`${KINDE_M2M_CLIENT_ID}:${KINDE_M2M_CLIENT_SECRET}`).toString('base64'),
        },
        body: params,
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[KINDE_M2M_TOKEN_ERROR]', errorText);
        throw new Error('Failed to get Kinde access token');
    }

    const data: KindeTokenResponse = await response.json();
    return data.access_token;
}

/**
 * Creates a user in Kinde.
 * Note: This creates the user. To send an invitation, Kinde's behavior depends on settings.
 * If "Send welcome email" is enabled in Kinde for the organization, they might receive one.
 * Alternatively, we might need to trigger a specific invitation flow if available via API.
 * For now, we use the standard Create User endpoint.
 */
export async function createKindeUser({ email, firstName, lastName }: CreateUserParams) {
    try {
        const accessToken = await getKindeAccessToken();

        // Kinde Management API endpoint for creating a user
        // Docs: https://kinde.com/api/docs/#create-user
        const createUserEndpoint = `${KINDE_DOMAIN}/api/v1/user`;

        const response = await fetch(createUserEndpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                profile: {
                    given_name: firstName,
                    family_name: lastName,
                },
                identities: [
                    {
                        type: 'email',
                        details: {
                            email: email,
                        },
                    },
                ],
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            // If user already exists, Kinde might return 409 or similar.
            // We should handle that gracefully if possible, but for now let's log it.
            console.error('[KINDE_CREATE_USER_ERROR]', errorText);
            throw new Error(`Failed to create user in Kinde: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('[KINDE_SERVICE_ERROR]', error);
        throw error;
    }
}
