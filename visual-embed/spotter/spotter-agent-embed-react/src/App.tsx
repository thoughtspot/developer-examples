import React, { useState, useEffect, useRef, useCallback } from 'react';
import { init, logout, EmbedEvent, HostEvent } from '@thoughtspot/visual-embed-sdk';
import { SpotterAgentEmbed } from '@thoughtspot/visual-embed-sdk/react';
import { CONFIG, getAuthToken } from './authService';
import { Message, MessagesContainer } from './components/MessageComponents';
import './App.css';

// Initialize ThoughtSpot SDK
init({
  thoughtSpotHost: CONFIG.thoughtSpotHost,
  authType: CONFIG.authType,
  getAuthToken: getAuthToken
});

const App = () => {
  // State for chat functionality
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Refs for SpotterAgentEmbed and DOM elements
  const conversationRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastVizRef = useRef<any>(null);
  
  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current && messagesContainerRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end'
        });
      }, 100);
    }
  }, []);
  
  // Focus input when not loading
  useEffect(() => {
    if (inputRef.current && !isLoading) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isLoading]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);
  
  // Handle input changes
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
  }, []);
  
  // Send message to SpotterAgentEmbed
  const sendMessage = async (text: string) => {
    if (!text.trim() || !conversationRef.current) return;

    // Clear input and add user message
    setInputText('');
    setMessages(prev => [...prev, { 
      text, 
      isUser: true, 
      id: `user-${Date.now()}` 
    }]);
    
    setIsLoading(true);
    
    try {
      // Send message to SpotterAgentEmbed
      const response = await conversationRef.current.sendMessage(text);
      const { container, viz: embed, error } = response;
      
      // Store the embed reference for later use
      lastVizRef.current = embed;
      
      // Add event listeners to the embed
      if (embed) {
        embed.on(EmbedEvent.VizPointRightClick, (data: any) => {
          console.log('VizPointRightClick event triggered:', data);
        });
      }
      
      if (error) {
        console.error('SpotterAgent Error:', error);
        setMessages(prev => [...prev, { 
          text: `Error: ${error.message || 'Failed to get response'}`, 
          isUser: false, 
          id: `error-${Date.now()}` 
        }]);
        return;
      }

      // Add response with container (visualization/chart)
      setMessages(prev => [...prev, { 
        text: '', 
        isUser: false, 
        container, 
        id: `response-${Date.now()}` 
      }]);
      
    } catch (err) {
      console.error('Exception:', err);
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
      setMessages(prev => [...prev, { 
        text: `Error: ${errorMessage}`, 
        isUser: false, 
        id: `error-${Date.now()}` 
      }]);
    } finally {
      setIsLoading(false);
      // Refocus input after response
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  };

  // Handle Pin host event
  const handlePin = () => {
    console.log("Triggering Pin host event");
    if (lastVizRef.current) {
      lastVizRef.current.trigger(HostEvent.Pin);
    } else {
      console.log("No visualization available to pin");
    }
  };

  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputText);
  }, [inputText]);

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  return (
    <div className="app-container">
      {/* SpotterAgentEmbed - Hidden bodyless embed for conversational AI */}
      <SpotterAgentEmbed 
        ref={conversationRef}
        worksheetId={CONFIG.worksheetId}
        className="bodyless-embed"
      />
      
      {/* Header with logout and pin button */}
      <div className="tabs">
        <h2>ThoughtSpot SpotterAgent Chat</h2>
        <div className="header-buttons">
          <button 
            className="pin-btn" 
            onClick={handlePin}
            disabled={!lastVizRef.current}
          >
            Pin Visualization
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
      
      {/* Main Chat Interface */}
      <div className="chat-container">
        <MessagesContainer 
          messages={messages}
          isLoading={isLoading}
          messagesEndRef={messagesEndRef}
          messagesContainerRef={messagesContainerRef}
        />
        
        {/* Input Form */}
        <form className="input-container" onSubmit={handleSubmit}>
          <input
            type="text"
            ref={inputRef}
            value={inputText}
            onChange={handleInputChange}
            placeholder="Ask a question about your data..."
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={isLoading || !inputText.trim()}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default App;
