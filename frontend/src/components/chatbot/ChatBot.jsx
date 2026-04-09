import React, { useState, useRef, useEffect } from 'react';
import api from '@/config/api';
import { MessageCircle, X, Send, ChevronRight } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const ChatBot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            text: "Hi there! I'm your assistant. How can I help you today?",
            sender: 'bot',
            actions: []
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

    // Auto-scroll to bottom of chat
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSendMessage = async (textOverride = null) => {
        const textToSend = textOverride || input;

        if (!textToSend.trim()) return;

        // Add user message
        const newMessages = [...messages, { text: textToSend, sender: 'user' }];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            const response = await api.post('/api/chatbot/message', {
                message: textToSend
            });

            if (response.data && response.data.success) {
                const botResponse = response.data.data;
                setMessages(prev => [...prev, {
                    text: botResponse.message,
                    sender: 'bot',
                    actions: botResponse.actions || []
                }]);
            }
        } catch (error) {
            console.error("Chatbot Error:", error);
            setMessages(prev => [...prev, {
                text: "I'm having trouble connecting right now. Please try again later.",
                sender: 'bot'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    };

    // Handle action button clicks (navigation)
    const handleActionClick = (url) => {
        if (url.startsWith('http')) {
            window.open(url, '_blank');
        } else {
            navigate(url);
            // Optional: Close chat on navigation or keep open? keeping open is usually better
        }
    };

    // Only show on certain pages or globally? Globally for now as per request.

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">

            {/* Chat Window */}
            <div
                className={`bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-80 sm:w-96 mb-4 flex flex-col transition-all duration-300 origin-bottom-right pointer-events-auto bg-card text-card-foreground border border-border
                ${isOpen ? 'scale-100 opacity-100 translate-y-0 h-[500px]' : 'scale-90 opacity-0 translate-y-10 h-0 w-0 overflow-hidden'}`}
            >
                {/* Header */}
                <div className="bg-primary p-4 rounded-t-2xl flex justify-between items-center text-primary-foreground shadow-md">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary/20 p-1.5 rounded-full">
                            <MessageCircle size={18} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm">Assistant</h3>
                            <span className="text-xs text-primary-foreground/80 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                                Online
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-1 hover:bg-primary/20 rounded-full transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background dark:bg-background/50">
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                        >
                            <div
                                className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${msg.sender === 'user'
                                    ? 'bg-primary text-primary-foreground rounded-br-none'
                                    : 'bg-card dark:bg-card text-card-foreground dark:text-card-foreground/80 rounded-bl-none border border-gray-100 dark:border-gray-700'
                                    }`}
                            >
                                {msg.text}
                            </div>

                            {/* Action Buttons */}
                            {msg.actions && msg.actions.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2 animate-fadeIn">
                                    {msg.actions.map((action, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleActionClick(action.url)}
                                            className="text-xs bg-card dark:bg-card text-primary
                                            border border-primary/30 px-3 py-1.5 rounded-full
                                            hover:bg-primary/10 transition-colors flex items-center gap-1"
                                        >
                                            {action.label}
                                            <ChevronRight size={12} />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-start">
                            <div className="bg-card dark:bg-card text-card-foreground dark:text-card-foreground/80 p-3 rounded-2xl rounded-bl-none border border-gray-100 dark:border-gray-700">
                                <div className="flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce delay-75"></span>
                                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce delay-150"></span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-3 bg-card dark:bg-card border-t border-border dark:border-border rounded-b-2xl">
                    <div className="flex gap-2 relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Type a message..."
                            className="w-full bg-muted dark:bg-muted text-foreground dark:text-foreground
                            text-sm px-4 py-2.5 rounded-full focus:outline-none
                            focus:ring-2 focus:ring-primary/40 pr-10"
                        />
                        <button
                            onClick={() => handleSendMessage()}
                            disabled={!input.trim() || isLoading}
                            className={`absolute right-1 top-1 p-1.5 rounded-full transition-all ${input.trim()
                                ? 'bg-primary text-white shadow-md hover:opacity-90'
                                : 'bg-muted text-muted-foreground cursor-not-allowed dark:bg-muted-foreground/20'
                                }`}
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Floating Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-4 rounded-full shadow-lg transition-all duration-300 pointer-events-auto group relative
                ${isOpen
                        ? 'bg-muted dark:bg-muted text-muted-foreground dark:text-muted-foreground rotate-90'
                        : 'bg-primary text-primary-foreground hover:opacity-90 hover:scale-105'
                    }`}
            >
                {isOpen ? <X size={24} /> : <MessageCircle size={24} />}

                {/* Notification Badge (Optional) */}
                {!isOpen && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-destructive rounded-full border-2 border-background dark:border-background animate-ping"></span>
                )}
            </button>
        </div>
    );
};

export default ChatBot;