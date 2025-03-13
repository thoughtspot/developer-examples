const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';
export const getThoughtspotToken = async () => {
  const response = await fetch(`${SERVER_URL}/my-token-endpoint`);
  const { token } = await response.json();
  return token as string;
}