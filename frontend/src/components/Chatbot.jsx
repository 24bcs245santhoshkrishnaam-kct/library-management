import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { sendChatMessage } from '../services/api';
import { 
  MessageSquare, 
  X, 
  Send, 
  Sparkles, 
  Trash2, 
  BookOpen, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw,
  ChevronDown,
  User,
  Bot
} from 'lucide-react';

const SUGGESTED_QUESTIONS = [
  "Find books about machine learning.",
  "Which Python books are available?",
  "How can I borrow a book?",
  "What is the return procedure?",
  "Show me my currently issued books.",
  "When is my book due?",
  "Have I returned my Java book?",
  "Do I have any overdue books?",
  "Show my recent borrowing history.",
  "Has my return been updated?"
];

const INITIAL_MESSAGE = {
  id: 'init-1',
  sender: 'bot',
  text: "Hello! Welcome to the KCT AI Smart Library Assistant. I can help you find books, check availability, understand borrowing procedures, and review your borrowing status.",
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
};

export default function Chatbot({ externalTriggerMessage, onClearExternalTrigger }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [lastFailedMessage, setLastFailedMessage] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [messages, isOpen, isTyping]);

  // Handle external triggers (e.g. from book card or loan list "Ask AI" button)
  useEffect(() => {
    if (externalTriggerMessage) {
      setIsOpen(true);
      handleSendMessage(externalTriggerMessage);
      if (onClearExternalTrigger) onClearExternalTrigger();
    }
  }, [externalTriggerMessage]);

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isTyping) return;

    setLastFailedMessage(null);

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const response = await sendChatMessage(text);
      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: response.reply,
        source: response.source,
        verifiedBooks: response.verifiedBooks || [],
        verifiedLoans: response.verifiedLoans || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      setLastFailedMessage(text);
      const errorMsg = {
        id: `error-${Date.now()}`,
        sender: 'bot',
        isError: true,
        text: "I encountered an issue connecting to the library assistant service. Please check your connection and try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([INITIAL_MESSAGE]);
    setLastFailedMessage(null);
  };

  return (
    <div className="smart-chatbot-container position-fixed" style={{ bottom: '24px', right: '24px', zIndex: 1050 }}>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          type="button"
          className="btn btn-primary rounded-circle shadow-lg d-flex align-items-center justify-content-center p-0 position-relative border-0 hover-scale"
          style={{ width: '60px', height: '60px', background: 'linear-gradient(135deg, #0d6efd, #0b5ed7)' }}
          onClick={() => setIsOpen(true)}
          title="Open KCT AI Smart Library Assistant"
        >
          <Sparkles size={26} className="text-white animate-pulse" />
          <span 
            className="position-absolute top-0 start-100 translate-middle p-1.5 bg-success border border-light rounded-circle"
            title="Online and connected to MySQL"
          >
            <span className="visually-hidden">Online</span>
          </span>
        </button>
      )}

      {/* Expandable Chat Window */}
      {isOpen && (
        <div 
          className="card border-0 shadow-2xl rounded-4 overflow-hidden d-flex flex-column animate-fade-in"
          style={{ 
            width: '400px', 
            maxWidth: 'calc(100vw - 32px)', 
            height: '620px', 
            maxHeight: 'calc(100vh - 48px)',
            background: '#ffffff'
          }}
        >
          {/* Header */}
          <div className="card-header bg-primary text-white p-3 d-flex align-items-center justify-content-between border-0">
            <div className="d-flex align-items-center gap-2">
              <div className="bg-white text-primary p-1.5 rounded-3 d-flex align-items-center justify-content-center shadow-sm">
                <Sparkles size={18} />
              </div>
              <div>
                <h6 className="mb-0 fw-bold fs-6">KCT AI Smart Library Assistant</h6>
                <div className="d-flex align-items-center gap-1">
                  <span className="d-inline-block rounded-circle bg-success" style={{ width: '7px', height: '7px' }}></span>
                  <small className="opacity-75" style={{ fontSize: '0.72rem' }}>
                    Grounded in Live MySQL
                  </small>
                </div>
              </div>
            </div>

            <div className="d-flex align-items-center gap-1">
              <button
                type="button"
                className="btn btn-sm btn-link text-white opacity-75 p-1 hover-opacity"
                onClick={handleClearChat}
                title="Clear Conversation"
              >
                <Trash2 size={16} />
              </button>
              <button
                type="button"
                className="btn btn-sm btn-link text-white opacity-75 p-1 hover-opacity"
                onClick={() => setIsOpen(false)}
                title="Minimize Chat"
              >
                <ChevronDown size={20} />
              </button>
            </div>
          </div>

          {/* User Identity Banner */}
          <div className="bg-light px-3 py-1.5 border-bottom d-flex align-items-center justify-content-between small text-muted">
            <span>
              Student: <strong className="text-dark">{user?.name}</strong>
            </span>
            <span className="badge bg-secondary-subtle text-secondary px-2 py-0.5 rounded-pill" style={{ fontSize: '0.68rem' }}>
              {user?.student_id ? `ID: ${user.student_id}` : 'Staff'}
            </span>
          </div>

          {/* Messages Body */}
          <div className="card-body p-3 overflow-y-auto flex-grow-1" style={{ background: '#f8fafc' }}>
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div 
                  key={msg.id} 
                  className={`d-flex gap-2 mb-3 ${isUser ? 'justify-content-end' : 'justify-content-start'}`}
                >
                  {!isUser && (
                    <div 
                      className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center flex-shrink-0 shadow-sm"
                      style={{ width: '32px', height: '32px', marginTop: '2px' }}
                    >
                      <Bot size={18} />
                    </div>
                  )}

                  <div style={{ maxWidth: '82%' }}>
                    <div 
                      className={`p-3 rounded-4 shadow-sm ${
                        isUser 
                          ? 'bg-primary text-white' 
                          : msg.isError 
                            ? 'bg-danger-subtle text-danger border border-danger-subtle' 
                            : 'bg-white text-dark border'
                      }`}
                      style={{ 
                        borderBottomRightRadius: isUser ? '4px' : undefined,
                        borderBottomLeftRadius: !isUser ? '4px' : undefined,
                        fontSize: '0.92rem',
                        whiteSpace: 'pre-wrap',
                        lineHeight: '1.5'
                      }}
                    >
                      {msg.text}

                      {/* Display matched books cards inside chat if relevant */}
                      {!isUser && msg.verifiedBooks && msg.verifiedBooks.length > 0 && (
                        <div className="mt-2 pt-2 border-top">
                          <small className="fw-bold text-muted d-block mb-1">Matching Catalogue Titles:</small>
                          {msg.verifiedBooks.slice(0, 2).map(b => (
                            <div key={b.id} className="p-2 bg-light rounded-3 mb-1 small border">
                              <div className="fw-semibold text-dark">{b.title}</div>
                              <div className="text-muted d-flex justify-content-between" style={{ fontSize: '0.75rem' }}>
                                <span>{b.author}</span>
                                <span className={b.available_copies > 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}>
                                  {b.available_copies > 0 ? `${b.available_copies} available` : 'Out of Stock'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className={`small text-muted mt-1 px-1 d-flex gap-1 ${isUser ? 'justify-content-end' : 'justify-content-start'}`} style={{ fontSize: '0.7rem' }}>
                      <span>{msg.timestamp}</span>
                      {!isUser && msg.source && (
                        <span className="text-secondary opacity-75">
                          • {msg.source === 'ai_gemini' ? 'Gemini AI' : 'Verified Logic'}
                        </span>
                      )}
                    </div>
                  </div>

                  {isUser && (
                    <div 
                      className="rounded-circle bg-secondary bg-opacity-25 text-dark d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: '32px', height: '32px', marginTop: '2px' }}
                    >
                      <User size={18} />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="d-flex gap-2 mb-3 justify-content-start">
                <div 
                  className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: '32px', height: '32px' }}
                >
                  <Bot size={18} />
                </div>
                <div className="bg-white p-3 rounded-4 border shadow-sm d-flex align-items-center gap-1.5">
                  <span className="spinner-grow spinner-grow-sm text-primary" role="status" style={{ width: '8px', height: '8px' }}></span>
                  <span className="spinner-grow spinner-grow-sm text-primary" role="status" style={{ width: '8px', height: '8px', animationDelay: '0.15s' }}></span>
                  <span className="spinner-grow spinner-grow-sm text-primary" role="status" style={{ width: '8px', height: '8px', animationDelay: '0.3s' }}></span>
                  <span className="small text-muted ms-1">Assistant is verifying data...</span>
                </div>
              </div>
            )}

            {/* Retry Button if last message failed */}
            {lastFailedMessage && !isTyping && (
              <div className="text-center my-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger rounded-pill px-3 py-1 small d-inline-flex align-items-center gap-1"
                  onClick={() => handleSendMessage(lastFailedMessage)}
                >
                  <RefreshCw size={12} />
                  Retry Question
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions Carousel */}
          <div className="px-3 py-2 bg-light border-top border-bottom overflow-x-auto whitespace-nowrap d-flex gap-1.5 scrollbar-thin">
            {SUGGESTED_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                type="button"
                className="btn btn-sm btn-outline-secondary rounded-pill py-0.5 px-2.5 text-nowrap bg-white text-dark border-secondary-subtle"
                style={{ fontSize: '0.74rem' }}
                onClick={() => handleSendMessage(q)}
                disabled={isTyping}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <div className="p-2.5 bg-white border-0">
            <div className="input-group rounded-pill border overflow-hidden p-1 bg-light">
              <input
                ref={inputRef}
                type="text"
                className="form-control border-0 bg-transparent px-3 py-1.5"
                placeholder="Ask about books, due dates, returns..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isTyping}
                style={{ boxShadow: 'none', fontSize: '0.9rem' }}
              />
              <button
                type="button"
                className="btn btn-primary rounded-circle p-2 d-flex align-items-center justify-content-center"
                style={{ width: '36px', height: '36px' }}
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || isTyping}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

