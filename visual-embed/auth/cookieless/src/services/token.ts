const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';

export const getThoughtspotToken = async (username: string) => {
  const response = await fetch(`${SERVER_URL}/my-token-endpoint`, {
    headers: {
      'x-my-username' : username,
    }
  });
  const { token } = await response.json();
  return token as string;
}