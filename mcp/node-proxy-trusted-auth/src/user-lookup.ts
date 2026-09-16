import { UsersApi, createBearerAuthenticationConfig } from "@thoughtspot/rest-api-sdk";
import { getAccessTokenForUser } from "./trusted-auth.js";

/**
 * Resolves a ThoughtSpot username from an email address.
 *
 * The Users API requires an authenticated ThoughtSpot session to call, even
 * though the proxy has no logged-in user yet at this point in the flow — so
 * we mint a short-lived trusted-auth token for a fixed admin/service username
 * (TS_ADMIN_USERNAME) purely to perform this lookup. That username is never
 * otherwise exposed or used for anything beyond this API call.
 *
 * This mints a fresh admin token on every lookup, which is simplest for an
 * example. A real deployment should cache the admin token and only re-mint it
 * once it's near expiry.
 */
export async function findTsUsernameByEmail(
	instanceUrl: string,
	email: string,
	adminUsername: string,
	secretKey: string,
): Promise<string | undefined> {
	const adminToken = await getAccessTokenForUser(instanceUrl, adminUsername, secretKey);
	const config = createBearerAuthenticationConfig(instanceUrl, () =>
		Promise.resolve(adminToken),
	);
	const users = await new UsersApi(config).searchUsers({ email });
	return users[0]?.name;
}
