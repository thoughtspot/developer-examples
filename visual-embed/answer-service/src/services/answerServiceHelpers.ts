import { AnswerService } from '@thoughtspot/visual-embed-sdk';

// Get TML from AnswerService
export const getTML = async (answerService: AnswerService): Promise<{
  tml: any | null;
  error?: string;
}> => {
  try {
    // Get TML from AnswerService
    const tmlResponse = await (answerService as any).getTML();
    console.log('TML Response:', tmlResponse);
    return { tml: tmlResponse };
  } catch (err: unknown) {
    console.error('Error getting TML:', err);
    return { 
      tml: null, 
      error: `Error getting TML: ${err instanceof Error ? err.message : 'Unknown error'}` 
    };
  }
};

// Get Session Info from AnswerService
export const getSessionInfo = (answerService: AnswerService): {
  session: any | null;
  error?: string;
} => {
  try {
    // Get Session Info from AnswerService
    const session = (answerService as any).getSession();
    console.log('Session Info:', session);
    return { session };
  } catch (err: unknown) {
    console.error('Error getting session info:', err);
    return { 
      session: null, 
      error: `Error getting session info: ${err instanceof Error ? err.message : 'Unknown error'}` 
    };
  }
};