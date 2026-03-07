import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types/chat';
import { suggestedQuestions, generateAIResponse, formatTime } from '../data/chatData';
import { 
  MessageSquare, 
  X, 
  Send, 
  Bot, 
  User,
  Loader2
} from 'lucide-react';

export const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm your Crypto Copilot.\n\nAsk me about:\n• Prices\n• News\n• Exchange updates\n• Market analysis",
      timestamp: new Date().toISOString(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = async (content: string = inputValue) => {
    if (!content.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateAIResponse(content.trim()),
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    handleSend(question);
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-[70] flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-300 ${
          isOpen 
            ? 'bg-okx-bg-tertiary text-white border border-okx-border' 
            : 'bg-black text-white'
        }`}
        style={!isOpen ? {
          boxShadow: '0 0 0 2px rgba(255,255,255,0.4), 0 0 40px rgba(255,255,255,0.3), 0 0 80px rgba(255,255,255,0.15)',
          border: '2px solid rgba(255,255,255,0.3)'
        } : {}}
      >
        {isOpen ? (
          <X size={18} />
        ) : (
          <>
            <MessageSquare size={18} />
            <span className="font-semibold text-sm">Ask Copilot</span>
          </>
        )}
      </button>

      {/* Chat Panel */}
      <div
        className={`fixed right-6 bottom-24 z-[60] transition-all duration-300 ease-out ${
          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        style={{ width: '360px', maxWidth: 'calc(100vw - 48px)' }}
      >
        <div className="h-[500px] bg-okx-bg-secondary border border-okx-border rounded-lg flex flex-col shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-okx-border bg-black flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-white flex items-center justify-center">
                <Bot size={14} className="text-black" />
              </div>
              <div>
                <h3 className="font-medium text-white text-sm">Crypto Copilot</h3>
                <p className="text-[10px] text-okx-text-muted flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-white rounded-full" />
                  Online
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-okx-text-muted hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${
                  message.role === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${
                    message.role === 'user'
                      ? 'bg-okx-bg-tertiary'
                      : 'bg-white'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User size={12} className="text-white" />
                  ) : (
                    <Bot size={12} className="text-black" />
                  )}
                </div>

                <div
                  className={`max-w-[80%] rounded px-3 py-2 text-sm ${
                    message.role === 'user'
                      ? 'bg-okx-bg-tertiary text-white'
                      : 'bg-black border border-okx-border text-okx-text-secondary'
                  }`}
                >
                  <p className="whitespace-pre-line">{message.content}</p>
                  <p className="text-[10px] mt-1 text-okx-text-muted">
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded bg-white flex items-center justify-center">
                  <Bot size={12} className="text-black" />
                </div>
                <div className="bg-black border border-okx-border rounded px-3 py-2 flex items-center gap-2">
                  <Loader2 size={12} className="text-white animate-spin" />
                  <span className="text-xs text-okx-text-muted">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions */}
          {messages.length < 3 && !isTyping && (
            <div className="px-3 py-2 border-t border-okx-border flex-shrink-0">
              <p className="text-[10px] text-okx-text-muted mb-1.5">Suggested:</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestedQuestions.slice(0, 3).map((q) => (
                  <button
                    key={q.id}
                    onClick={() => handleSuggestedQuestion(q.text)}
                    className="text-[10px] bg-black border border-okx-border hover:border-white text-okx-text-secondary px-2 py-1 rounded transition-all"
                  >
                    {q.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-okx-border bg-black flex-shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask..."
                className="flex-1 bg-okx-bg-secondary border border-okx-border rounded px-3 py-2 text-white text-sm placeholder-okx-text-muted focus:outline-none focus:border-white transition-colors"
              />
              <button
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || isTyping}
                className="p-2 bg-white text-black rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};
