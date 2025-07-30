export const sendMessage = async (chatId: string, message: any) => {
    const res = await fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, message }),
    });
    return res.json();
};

export const startAgentChat = async () => {
    const response = await fetch('/api/start', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    return response.json();
};