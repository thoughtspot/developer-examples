import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { finishMCPServerOAuth } from '../services/mcp';

export const OAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (code && state) {
      finishMCPServerOAuth(code, state).then(() => {
        navigate('/', { replace: true });
      });
    }
  }, [searchParams, navigate]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <h2>Processing OAuth Callback...</h2>
      <p>Redirecting to home page...</p>
    </div>
  );
};
