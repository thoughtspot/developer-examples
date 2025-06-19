import { useState, useEffect, useRef } from 'react';
import { Drawer, Input, Button, List, Typography, Spin } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import Liveboard from './Liveboard';

const { Text } = Typography;

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  isStreaming?: boolean;
}

interface ChatSidebarProps {
  visible: boolean;
  onClose: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ visible, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [chatId, setChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize chat session when component mounts
  useEffect(() => {
    const initializeChat = async () => {
      try {
        const response = await fetch('/api/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to initialize chat');
        }
        
        const data = await response.json();
        setChatId(data.chatId);
      } catch (error) {
        console.error('Error initializing chat:', error);
      }
    };

    if (visible && !chatId) {
      initializeChat();
    }
  }, [visible, chatId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !chatId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Create a placeholder for the assistant's response
    const assistantMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantMessageId, content: '', sender: 'assistant', isStreaming: true },
    ]);

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create a new AbortController for this request
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId,
          message: inputValue,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      let accumulatedResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        // Convert the chunk to text
        const chunk = new TextDecoder().decode(value);
        accumulatedResponse += chunk;

        // Update the assistant's message with the accumulated response
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: accumulatedResponse }
              : msg
          )
        );
      }

      // Mark the message as no longer streaming
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId ? { ...msg, isStreaming: false } : msg
        )
      );
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request was aborted');
      } else {
        console.error('Error sending message:', error);
        // Update the assistant's message with an error
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: 'Sorry, there was an error processing your request.', isStreaming: false }
              : msg
          )
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderMessage = (message: Message) => {
    if (message.sender === 'user') {
      return (
        <div
          style={{
            maxWidth: '80%',
            padding: '8px 12px',
            borderRadius: '8px',
            backgroundColor: '#1890ff',
            color: 'white',
            marginLeft: 'auto',
          }}
        >
          <Text style={{ color: 'white' }}>{message.content}</Text>
        </div>
      );
    }

    // Extract liveboard ID if present in the message
    const liveboardMatch = message.content.match(
      /(?:https:\/\/[^/]+\/#\/pinboard\/([^/\s)]+)|\[.*?\]\(https:\/\/[^/]+\/#\/pinboard\/([^/\s)]+)\))/
    );
    const liveboardId = liveboardMatch ? (liveboardMatch[1] || liveboardMatch[2]) : null;

    return (
      <div
        style={{
          width: '100%',
          padding: '8px 12px',
        }}
      >
        <ReactMarkdown>{message.content}</ReactMarkdown>
        {message.isStreaming && (
          <Spin size="small" style={{ marginLeft: 8 }} />
        )}
        {liveboardId && (
          <div style={{ marginTop: '16px', height: '600px' }}>
            <Liveboard liveboardId={liveboardId} />
          </div>
        )}
      </div>
    );
  };

  return (
    <Drawer
      title="Chat Assistant"
      placement="right"
      onClose={onClose}
      open={visible}
      width={600}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
          <List
            dataSource={messages}
            renderItem={(message) => (
              <List.Item
                style={{
                  justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                  width: '100%',
                }}
              >
                {renderMessage(message)}
              </List.Item>
            )}
          />
          <div ref={messagesEndRef} />
        </div>
        <div style={{ padding: '16px 0', borderTop: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Input.TextArea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              autoSize={{ minRows: 1, maxRows: 4 }}
              disabled={isLoading}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
            />
          </div>
        </div>
      </div>
    </Drawer>
  );
};

export default ChatSidebar; 