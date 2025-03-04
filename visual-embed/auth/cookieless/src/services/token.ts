const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';
export const getThoughtspotToken = async () => {
  const response = await fetch(`${SERVER_URL}/api/token`);
  const { token } = await response.json();
  return token as string;
}