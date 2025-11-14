export const getThoughtspotToken = async (username: string) => {
  const response = await fetch(`/api/my-token-endpoint`, {
    headers: {
      'x-my-username' : username,
    }
  });
  const { token } = await response.json();
  return token as string;
}