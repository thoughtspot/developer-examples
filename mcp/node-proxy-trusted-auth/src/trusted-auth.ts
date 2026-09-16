import { AuthenticationApi, createBasicConfig } from "@thoughtspot/rest-api-sdk";

/**
 * Mints a ThoughtSpot full-access token for a given user via secret-key
 * trusted authentication (https://developers.thoughtspot.com/docs/trusted-auth-secret-key).
 *
 * `auto_create` is left false: this example does not provision ThoughtSpot users on
 * the fly. The username must already exist in the target ThoughtSpot instance.
 * 
 * Consumers can edit this function to get Access Tokens for users as needed.
 */
export async function getAccessTokenForUser(
	instanceUrl: string,
	tsUsername: string,
	secretKey: string,
	validityTimeInSec?: number,
): Promise<string> {
	const authApi = new AuthenticationApi(createBasicConfig(instanceUrl));
	const { token } = await authApi.getFullAccessToken({
		username: tsUsername,
		secret_key: secretKey,
		auto_create: false,
		...(validityTimeInSec ? { validity_time_in_sec: validityTimeInSec } : {}),
	});
	return token;
}
