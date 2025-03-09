// fetch auth token from token server
const TOKEN_VALIDITY_TIME = 60 * 2;
let tokenLastFetched = 0;
let cachedToken = "";

const TOKEN_SERVER_URL = process.env.VITE_TOKEN_SERVER_URL || "";

export const getCachedAuthToken = async () => {
  // if token has 30s remaining, return cached token
  if (Date.now() - tokenLastFetched > (TOKEN_VALIDITY_TIME - 30)) {
    return cachedToken;
  }
  // fetch new token
  const response = await fetch(`${TOKEN_SERVER_URL}/api/token`, {
    method: "POST",
  });
  const data = await response.json();
  tokenLastFetched = Date.now();
  cachedToken = data.token;
  return data.token;
}