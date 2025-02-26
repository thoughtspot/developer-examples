import { useEffect, useState, useCallback } from 'react';
import { 
  init, 
  AuthType,
  AnswerService
} from '@thoughtspot/visual-embed-sdk';
import './App.css';
import ThoughtSpotEmbed from './components/ThoughtSpotEmbed';
import * as answerServiceHelpers from './services/answerServiceHelpers';

// Default values
const DEFAULT_THOUGHTSPOT_HOST = 'https://try-everywhere.thoughtspot.cloud';
const DEFAULT_DATASOURCE_ID = 'cd252e5c-b552-49a8-821d-3eadaa049cca';

// @ts-ignore
const VITE_THOUGHTSPOT_HOST = import.meta.env.VITE_THOUGHTSPOT_HOST;
// @ts-ignore
const VITE_DATASOURCE_ID = import.meta.env.VITE_DATASOURCE_ID;

type ResultType = 'none' | 'tml' | 'session';

function App() {
  const [thoughtspotHost, setThoughtspotHost] = useState(
    VITE_THOUGHTSPOT_HOST || DEFAULT_THOUGHTSPOT_HOST
  );
  const [datasourceId, setDatasourceId] = useState(
    VITE_DATASOURCE_ID || DEFAULT_DATASOURCE_ID
  );
  const [isConfigChanged, setIsConfigChanged] = useState(false);
  const [embedKey, setEmbedKey] = useState(Date.now()); // Key to force re-render

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [answerService, setAnswerService] = useState<AnswerService | null>(null);
  const [tmlData, setTmlData] = useState<any | null>(null);
  const [sessionInfo, setSessionInfo] = useState<any | null>(null);
  
  const [activeResult, setActiveResult] = useState<ResultType>('none');

  useEffect(() => {
    if (thoughtspotHost) {
      console.log('Initializing ThoughtSpot SDK with host:', thoughtspotHost);
      try {
        init({
          thoughtSpotHost: thoughtspotHost,
          authType: AuthType.None,
        });
      } catch (error) {
        console.error('Error initializing ThoughtSpot SDK:', error);
        setError(`Error initializing ThoughtSpot SDK: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }, [thoughtspotHost]);

  const resetState = useCallback(() => {
    setError(null);
    setAnswerService(null);
    setTmlData(null);
    setSessionInfo(null);
    setActiveResult('none');
  }, []);

  // Apply configuration changes
  const applyConfigChanges = useCallback(() => {
    console.log('Applying configuration changes');
    resetState();
    setEmbedKey(Date.now());
    setIsConfigChanged(false);
  }, [resetState]);

  // Handle answer service availability
  const handleAnswerServiceAvailable = useCallback((service: AnswerService) => {
    console.log('AnswerService is now available');
    setAnswerService(service);
  }, []);

  // Get TML from AnswerService
  const getTML = useCallback(async () => {
    if (!answerService) {
      setError('Answer service not available');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await answerServiceHelpers.getTML(answerService);
      
      if (result.error) {
        setError(result.error);
      } else {
        setTmlData(result.tml);
        setActiveResult('tml');
      }
    } catch (err: unknown) {
      console.error('Error in getTML:', err);
      setError(`Error in getTML: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [answerService]);

  // Get Session Info from AnswerService
  const getSessionInfo = useCallback(async () => {
    if (!answerService) {
      setError('Answer service not available');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = answerServiceHelpers.getSessionInfo(answerService);
      
      if (result.error) {
        setError(result.error);
      } else {
        setSessionInfo(result.session);
        setActiveResult('session');
      }
    } catch (err: unknown) {
      console.error('Error in getSessionInfo:', err);
      setError(`Error in getSessionInfo: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [answerService]);

  // Handle form submission
  const handleApplyConfig = (e: React.FormEvent) => {
    e.preventDefault();
    applyConfigChanges();
  };

  // Render the appropriate result based on activeResult
  const renderResult = () => {
    switch (activeResult) {
      case 'tml':
        return (
          <div className="data-container">
            <h2>TML Data</h2>
            <pre className="code-block">
              {JSON.stringify(tmlData, null, 2)}
            </pre>
          </div>
        );
      case 'session':
        return (
          <div className="data-container">
            <h2>Session Info</h2>
            <pre className="code-block">
              {JSON.stringify(sessionInfo, null, 2)}
            </pre>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="app-layout">
      {/* Left Sidebar */}
      <div className="sidebar">
        <div className="sidebar-content">
          <h2>Configuration</h2>
          <form onSubmit={handleApplyConfig}>
            <div className="form-group">
              <label htmlFor="thoughtspot-host">ThoughtSpot Host:</label>
              <input
                id="thoughtspot-host"
                type="text"
                value={thoughtspotHost}
                onChange={(e) => {
                  setThoughtspotHost(e.target.value);
                  setIsConfigChanged(true);
                }}
                placeholder="https://your-thoughtspot-host.com"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="datasource-id">Datasource ID:</label>
              <input
                id="datasource-id"
                type="text"
                value={datasourceId}
                onChange={(e) => {
                  setDatasourceId(e.target.value);
                  setIsConfigChanged(true);
                }}
                placeholder="Enter datasource GUID"
              />
            </div>
            
            <button 
              type="submit" 
              className="apply-button"
              disabled={!isConfigChanged}
            >
              Apply Changes
            </button>
          </form>
          
          <div className="sidebar-section">
            <h3>AnswerService Features</h3>
            <div className="feature-buttons">
              <button 
                className={`feature-button ${activeResult === 'tml' ? 'active-button' : ''}`}
                onClick={getTML}
                disabled={loading || !answerService}
              >
                Get TML
              </button>
              <button 
                className={`feature-button ${activeResult === 'session' ? 'active-button' : ''}`}
                onClick={getSessionInfo}
                disabled={loading || !answerService}
              >
                Get Session Info
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="main-content">
        <h1>ThoughtSpot AnswerService Example</h1>
        <p className="description">
          This example demonstrates how to use the AnswerService from the ThoughtSpot Visual Embed SDK
          to retrieve TML and session information from a ThoughtSpot answer.
        </p>
        
        <div className="embed-container">
          <ThoughtSpotEmbed 
            key={embedKey}
            thoughtspotHost={thoughtspotHost}
            datasourceId={datasourceId}
            onAnswerServiceAvailable={handleAnswerServiceAvailable}
          />
        </div>
        
        {loading && (
          <div className="loading-indicator">
            <p>Loading data...</p>
          </div>
        )}
        
        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}
        
        {/* Results Section - Only shows the active result */}
        <div className="results-section">
          {renderResult()}
        </div>
      </div>
    </div>
  );
}

export default App;
