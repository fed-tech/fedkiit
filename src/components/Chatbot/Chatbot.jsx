"use client";

/**
 * @fileoverview FED Chatbot Component
 * @module components/Chatbot
 * @description AI-powered chatbot for FED KIIT website with seamless navigation
 */

import { useState, useRef, useEffect, useContext } from 'react';

import ReactMarkdown from 'react-markdown';
import DOMPurify from 'dompurify';
import styles from './Chatbot.module.scss';
import { IoCloseOutline, IoSend, IoMic, IoMicOff } from 'react-icons/io5';
import { BiSolidMessageSquareDetail } from 'react-icons/bi';
import { IoSparkles } from 'react-icons/io5';
import { FiLogIn } from 'react-icons/fi';
import { chatbotService } from '../../services/chatbot';
import AuthContext from '../../context/AuthContext';
import FedLogo from '../../assets/images/FedLogo.png';
import { useRouter, usePathname } from "next/navigation";

const Chatbot = () => {
    const chatbotName = process.env.NEXT_PUBLIC_CHATBOT_NAME || 'AskFED';
    const router = useRouter();
    const location = { pathname: usePathname() };
    const authCtx = useContext(AuthContext);

    // Get user's first name for personalized greeting
    const userName = authCtx.isLoggedIn ? authCtx.user?.name?.split(' ')[0] : null;

    // Generate personalized greeting message
    const getGreetingMessage = () => {
        if (userName) {
            return `Hi **${userName}**! I'm **${chatbotName}**, your personal assistant for FED KIIT. 🚀 I'm here to help you with anything related to FED!`;
        }
        return `Hello! I'm **${chatbotName}**, your personal assistant for FED KIIT. 🚀 I'm here to help you with anything related to FED!`;
    };

    const [messages, setMessages] = useState([
        {
            id: 1,
            text: getGreetingMessage(),
            isUser: false,
            timestamp: new Date(),
        }
    ]);
    const [userInput, setUserInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [showAuthPrompt, setShowAuthPrompt] = useState(false);
    const [conversationHistory, setConversationHistory] = useState([]); // Track conversation for context
    const [isWaitingForEmailContent, setIsWaitingForEmailContent] = useState(false); // Email flow state
    const messagesEndRef = useRef(null);
    const chatboxRef = useRef(null);
    const recognitionRef = useRef(null);

    // Update greeting when user logs in/out
    useEffect(() => {
        setMessages(prev => {
            if (prev.length === 1 && !prev[0].isUser) {
                return [{
                    ...prev[0],
                    text: getGreetingMessage()
                }];
            }
            return prev;
        });
    }, [authCtx.isLoggedIn, userName]);

    // Suggested prompts
    const suggestedPrompts = [
        "What is FED?",
        "Who is the President of FED?",
        "Show me the Upcoming Events",
        "Show me FED Insights"
    ];

    // Navigation patterns - FIXED: /Blog not /Blogs
    const NAVIGATION_PATTERNS = {
        '[NAV:/Team]': '/Team',
        '[NAV:/Events]': '/Events',
        '[NAV:/Blog]': '/Blog',
        '[NAV:/Blogs]': '/Blog', // Handle both for backwards compatibility
        '[NAV:/pastEvents]': '/pastEvents',
        '[NAV:/alumni]': '/Alumni',
    };

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        if (chatboxRef.current) {
            chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping, isOpen]); // Added isOpen to scroll to bottom when chatbot opens

    // Toggle chatbot
    const toggleChatbot = () => {
        setIsOpen(!isOpen);
    };

    /**
     * Process navigation hints from AI response
     * Navigates the page seamlessly without closing chatbot
     */
    const processNavigation = (responseText) => {
        let cleanedText = responseText;
        let navigationPath = null;

        // Check for navigation patterns
        for (const [pattern, path] of Object.entries(NAVIGATION_PATTERNS)) {
            if (responseText.includes(pattern)) {
                cleanedText = responseText.replace(pattern, '').trim();
                navigationPath = path;
                break;
            }
        }

        // Perform navigation if path found and not already on that page
        if (navigationPath && location.pathname !== navigationPath) {
            setTimeout(() => {
                router.push(navigationPath);
            }, 500);
        }

        return cleanedText;
    };

    // Handle login button click - FIXED: Minimize chatbot when clicking sign in
    const handleLoginClick = () => {
        sessionStorage.setItem('prevPage', window.location.pathname);
        setIsOpen(false); // Minimize chatbot
        router.push('/login');
    };

    // Build conversation history for context
    const buildConversationHistory = () => {
        // Get last 6 messages (3 exchanges) for context
        const recentMessages = messages.slice(-6);
        return recentMessages.map(msg => ({
            role: msg.isUser ? 'user' : 'model',
            content: msg.text
        }));
    };

    // Send message handler
    const sendMessage = async (messageText = null) => {
        const textToSend = messageText || userInput;
        if (!textToSend?.trim()) return;

        // Add user message
        const userMessage = {
            id: messages.length + 1,
            text: textToSend,
            isUser: true,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setUserInput('');
        setIsTyping(true);
        setShowAuthPrompt(false);

        try {
            // Check if we're waiting for email content
            if (isWaitingForEmailContent) {
                // Send the email with user's content UNCHANGED
                const emailResult = await chatbotService.sendEmail(
                    textToSend,  // Send exactly what user typed - no modifications
                    userName || 'Anonymous',
                    authCtx.user?.email
                );

                setIsWaitingForEmailContent(false);

                const emailResponse = {
                    id: messages.length + 2,
                    text: emailResult.success
                        ? '✅ Your message has been sent to FED! The team will get back to you soon. 📧'
                        : '❌ Sorry, there was an error sending your email. Please try again later.',
                    isUser: false,
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, emailResponse]);
                setIsTyping(false);
                return;
            }

            // Check if user wants to send an email
            const emailIntentKeywords = ['send email', 'send mail', 'email fed', 'contact fed', 'message fed', 'reach out', 'send a message'];
            const lowerText = textToSend.toLowerCase();
            const wantsToSendEmail = emailIntentKeywords.some(keyword => lowerText.includes(keyword));

            if (wantsToSendEmail) {
                setIsWaitingForEmailContent(true);
                const promptMessage = {
                    id: messages.length + 2,
                    text: '📧 Sure! Please type your message in the next chat. I will send it exactly as you write it to fedkiit@gmail.com.\n\n**Note:** Your message will be sent exactly as you type it - no changes will be made.',
                    isUser: false,
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, promptMessage]);
                setIsTyping(false);
                return;
            }

            // Normal chatbot flow - Build conversation history for context
            const history = buildConversationHistory();

            // Call backend chatbot API with conversation history
            const response = await chatbotService.sendMessage(textToSend, history);

            // Handle auth required response
            if (response.requiresAuth) {
                setShowAuthPrompt(true);
                const authMessage = {
                    id: messages.length + 2,
                    text: response.message || '🔐 Please sign in to access this feature.',
                    isUser: false,
                    timestamp: new Date(),
                    isAuthPrompt: true
                };
                setMessages(prev => [...prev, authMessage]);
            } else {
                // Get the raw response
                let rawResponse = response.success ? response.response : 'Sorry, I encountered an error. Please try again.';

                // Check for EMAIL_TRIGGER tag in AI response
                const emailTriggerPattern = /\[EMAIL_TRIGGER\]/gi;
                const hasEmailTrigger = emailTriggerPattern.test(rawResponse);

                if (hasEmailTrigger) {
                    // Remove the trigger tag from displayed message
                    rawResponse = rawResponse.replace(/\[EMAIL_TRIGGER\]/gi, '').trim();
                    // Set email mode - next user message goes directly to email
                    setIsWaitingForEmailContent(true);
                    console.log('[Chatbot] Email trigger detected - next message will be sent as email');
                }

                // Process navigation hints and clean the response
                const cleanedResponse = processNavigation(rawResponse);

                const botResponse = {
                    id: messages.length + 2,
                    text: cleanedResponse,
                    isUser: false,
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, botResponse]);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setIsWaitingForEmailContent(false); // Reset email state on error
            const errorResponse = {
                id: messages.length + 2,
                text: 'Sorry, I\'m having trouble connecting. Please try again later.',
                isUser: false,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorResponse]);
        } finally {
            setIsTyping(false);
        }
    };

    // Handle Enter key
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Voice recognition
    const startVoiceRecognition = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Voice recognition is not supported in your browser. Please use Chrome or Edge.');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setUserInput(transcript);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    const stopVoiceRecognition = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    };

    const toggleVoiceRecognition = () => {
        if (isListening) {
            stopVoiceRecognition();
        } else {
            startVoiceRecognition();
        }
    };

    // Clean and sanitize message text - remove broken HTML from AI
    const cleanMessage = (text) => {
        // Remove any broken HTML the AI might have generated
        let cleanText = text
            // Remove HTML anchor tags completely
            .replace(/<a\s[^>]*>/gi, '')
            .replace(/<\/a>/gi, '')
            // Remove broken HTML attribute fragments
            .replace(/"\s*target="_blank"\s*rel="noopener\s*noreferrer"\s*style="[^"]*">/gi, '')
            .replace(/"\s*target="_blank"\s*rel="noopener\s*noreferrer">/gi, '')
            .replace(/"\s*target="_blank">/gi, '')
            .replace(/style="[^"]*">/gi, '')
            .replace(/rel="[^"]*">/gi, '')
            .replace(/"\s*>/g, '')
            // Remove AI-generated mailto markdown links: [email](mailto:email) -> just email
            .replace(/\[([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\]\(mailto:[^)]+\)/gi, '$1')
            // Remove AI-generated Gmail compose links: [email](https://mail.google.com/...) -> just email
            .replace(/\[([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\]\(https:\/\/mail\.google\.com[^)]+\)/gi, '$1')
            // Convert standalone @fedkiit to Instagram link (NOT inside URLs like medium.com/@fedkiit)
            .replace(/(?<!\/)@fedkiit(?!\/)/gi, '[@fedkiit](https://www.instagram.com/fedkiit/)')
            // Convert plain email addresses to Gmail compose links
            .replace(/(?<!\[)([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?!\])/g, '[$1](https://mail.google.com/mail/?view=cm&to=$1)');

        return DOMPurify.sanitize(cleanText);
    };

    // Custom link component for react-markdown
    const LinkRenderer = ({ href, children }) => {
        return (
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    color: '#ffffff',
                    textDecoration: 'underline',
                    fontWeight: 600
                }}
            >
                {children}
            </a>
        );
    };

    return (
        <>
            {/* Toggle Button */}
            {!isOpen && (
                <button
                    className={styles.chatbotToggle}
                    onClick={toggleChatbot}
                    aria-label="Open Chat"
                >
                    <BiSolidMessageSquareDetail size={38} />
                </button>
            )}

            {/* Backdrop Overlay */}
            {isOpen && (
                <div className={styles.backdrop} onClick={toggleChatbot}></div>
            )}

            {/* Chatbot Container */}
            {isOpen && (
                <div className={styles.chatbotContainer}>
                    {/* Header - FIXED: Removed username from here */}
                    <header className={styles.chatbotHeader}>
                        <div className={styles.headerContent}>
                            <div className={styles.avatarContainer}>
                                <img
                                    src={FedLogo.src}
                                    alt="FED Logo"
                                    className={styles.avatar}
                                />
                                <div className={styles.statusIndicator}></div>
                            </div>
                            <div className={styles.headerText}>
                                <h2 className={styles.title}>{chatbotName}</h2>
                                <p className={styles.subtitle}>
                                    <IoSparkles size={12} /> AI Assistant
                                </p>
                            </div>
                        </div>
                        <button
                            className={styles.closeButton}
                            onClick={toggleChatbot}
                            aria-label="Close Chat"
                        >
                            <IoCloseOutline size={26} />
                        </button>
                    </header>

                    {/* Messages Area */}
                    <div className={styles.messagesArea} ref={chatboxRef}>
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`${styles.messageWrapper} ${message.isUser ? styles.userWrapper : styles.botWrapper}`}
                            >
                                {!message.isUser && (
                                    <div className={styles.messageAvatar}>
                                        <img src={FedLogo.src} alt="Bot" />
                                    </div>
                                )}
                                <div className={styles.messageContent}>
                                    <div
                                        className={`${styles.message} ${message.isUser ? styles.userMessage : styles.botMessage}`}
                                    >
                                        <ReactMarkdown
                                            components={{
                                                a: LinkRenderer,
                                                p: ({ children }) => <span>{children}</span>
                                            }}
                                        >
                                            {cleanMessage(message.text)}
                                        </ReactMarkdown>
                                        {/* Show login button for auth prompts */}
                                        {message.isAuthPrompt && !authCtx.isLoggedIn && (
                                            <button
                                                className={styles.loginButton}
                                                onClick={handleLoginClick}
                                            >
                                                <FiLogIn size={16} />
                                                Sign In
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Typing Indicator */}
                        {isTyping && (
                            <div className={`${styles.messageWrapper} ${styles.botWrapper}`}>
                                <div className={styles.messageAvatar}>
                                    <img src={FedLogo.src} alt="Bot" />
                                </div>
                                <div className={styles.typingIndicator}>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        )}

                        {/* Show suggested prompts only for first message */}
                        {messages.length === 1 && !isTyping && (
                            <div className={styles.suggestedPrompts}>
                                <p className={styles.promptsLabel}>Quick actions:</p>
                                <div className={styles.promptsGrid}>
                                    {suggestedPrompts.map((prompt, index) => (
                                        <button
                                            key={index}
                                            className={styles.promptButton}
                                            onClick={() => sendMessage(prompt)}
                                        >
                                            {prompt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className={styles.inputArea}>
                        <input
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder={authCtx.isLoggedIn ? "Ask about your events, certificates..." : "Ask me anything about FED..."}
                            className={styles.messageInput}
                        />
                        <button
                            className={`${styles.voiceButton} ${isListening ? styles.listening : ''}`}
                            onClick={toggleVoiceRecognition}
                            aria-label={isListening ? "Stop Recording" : "Start Voice Input"}
                            type="button"
                        >
                            {isListening ? <IoMicOff size={20} /> : <IoMic size={20} />}
                        </button>
                        <button
                            className={styles.sendButton}
                            onClick={() => sendMessage()}
                            disabled={!userInput.trim()}
                            aria-label="Send Message"
                        >
                            <IoSend size={20} />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default Chatbot;
