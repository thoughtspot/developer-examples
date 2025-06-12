import React, { useEffect, useRef, memo } from 'react';

export interface Message {
  text: string;
  isUser: boolean;
  id: string;
  container?: HTMLElement;
}

interface MessageProps {
  msg: Message;
}

interface MessagesContainerProps {
  messages: Message[];
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
}

export const Message = memo(({ msg }: MessageProps) => {
  const messageContentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (msg.container && messageContentRef.current) {
      if (messageContentRef.current.childElementCount === 0) {
        messageContentRef.current.innerHTML = '';
        messageContentRef.current.appendChild(msg.container);
      }
    }
  }, [msg.container]);
  
  return (
    <div className={`message ${msg.isUser ? 'user-message' : 'ts-message'}`}>
      {msg.isUser ? (
        <div className="message-content">{msg.text}</div>
      ) : msg.container ? (
        <div 
          className="message-content ts-response" 
          ref={messageContentRef}
        />
      ) : (
        <div className="message-content">{msg.text}</div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.msg.id === nextProps.msg.id;
});

export const MessagesContainer = memo(({ messages, isLoading, messagesEndRef, messagesContainerRef }: MessagesContainerProps) => {
  return (
    <div className="messages-container" ref={messagesContainerRef}>
      {messages.map((msg, index) => (
        <Message key={msg.id || index} msg={msg} />
      ))}
      
      {isLoading && (
        <div className="message ts-message">
          <div className="message-content loading">Thinking...</div>
        </div>
      )}
      
      <div ref={messagesEndRef} style={{ float: 'left', clear: 'both' }} />
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.messages.length === nextProps.messages.length && 
         prevProps.isLoading === nextProps.isLoading;
}); 