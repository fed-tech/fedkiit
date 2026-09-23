"use client";

/**
 * @fileoverview FED Chatbot Component
 * @module components/Chatbot
 * @description AI-powered chatbot for FED KIIT website with dynamic flows, glassmorphic teaser, and background navigation.
 */

import { useState, useRef, useEffect, useContext } from 'react';
import ReactMarkdown from 'react-markdown';
import DOMPurify from 'dompurify';
import styles from './Chatbot.module.scss';
import { IoCloseOutline, IoSend, IoMic, IoMicOff, IoRefreshOutline, IoSparkles } from 'react-icons/io5';
import { BiSolidMessageSquareDetail } from 'react-icons/bi';
import { FiLogIn } from 'react-icons/fi';
import { chatbotService } from '../../services/chatbot';
import AuthContext from '../../context/AuthContext';
import FedLogo from '../../assets/images/FedLogo.png';
import Lottie from 'lottie-react';
import foxAnimation from '@/public/lottie/fox_head_tilt.json';
import { useRouter, usePathname } from "next/navigation";

const MascotFoxAvatar = ({ size = 36 }) => (
    <div style={{ width: size, height: size, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Lottie animationData={foxAnimation} loop={true} style={{ width: '100%', height: '100%' }} />
    </div>
);

const Chatbot = () => {
    const [chatbotName, setChatbotName] = useState(process.env.NEXT_PUBLIC_CHATBOT_NAME || 'AskFED');
    const router = useRouter();
    const location = { pathname: usePathname() };
    const authCtx = useContext(AuthContext);

    // Get user's first name for personalized greeting
    const userName = authCtx.isLoggedIn ? authCtx.user?.name?.split(' ')[0] : null;

    // Generate personalized greeting message
    const getGreetingMessage = () => {
        if (userName) {
            return `Hi **${userName}**! I'm **${chatbotName}**, your assistant for FED KIIT. 🚀 How can I help you today?`;
        }
        return `Hello! I'm **${chatbotName}**, your assistant for FED KIIT. 🚀 How can I help you today?`;
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
    const [isWaitingForEmailContent, setIsWaitingForEmailContent] = useState(false);
    const [isAwaitingEmailConfirmation, setIsAwaitingEmailConfirmation] = useState(false);

    // Engagement & Flow Management States
    const [featuredPrompts, setFeaturedPrompts] = useState([]);
    const [teaserMessage, setTeaserMessage] = useState(`Explore FED & its Events! Ask ${process.env.NEXT_PUBLIC_CHATBOT_NAME || 'FEDI'}`);
    const [showTeaser, setShowTeaser] = useState(true);

    const chatboxRef = useRef(null);
    const messagesEndRef = useRef(null);
    const lastMessageRef = useRef(null);
    const recognitionRef = useRef(null);

    // Fetch dynamic flows & chatbot config on load
    useEffect(() => {
        const fetchFlows = async () => {
            try {
                const data = await chatbotService.getFlows();
                if (data && data.success) {
                    if (data.chatbotName) {
                        setChatbotName(data.chatbotName);
                    }
                    if (Array.isArray(data.featuredPrompts) && data.featuredPrompts.length > 0) {
                        setFeaturedPrompts(data.featuredPrompts.filter(p => p.isActive));
                    }
                    if (data.teaserMessage) {
                        setTeaserMessage(data.teaserMessage);
                    }
                }
            } catch (err) {
                console.error('[Chatbot UI] Error loading flows:', err);
            }
        };

        fetchFlows();
    }, []);

    // Update greeting when user logs in/out or chatbotName changes
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
    }, [authCtx.isLoggedIn, userName, chatbotName]);

    // Navigation patterns - Mapping AI navigation hints to valid router paths
    const NAVIGATION_PATTERNS = {
        '[NAV:/Team]': '/Team',
        '[NAV:/Events]': '/Events',
        '[NAV:/Blog]': '/Blog',
        '[NAV:/Blogs]': '/Blog',
        '[NAV:/Events/pastEvents]': '/Events/pastEvents',
        '[NAV:/Alumni]': '/Alumni',
        '[NAV:/#Contact]': '/#Contact',
        '[NAV:/Contact]': '/#Contact',
        '[NAV:/profile/certificates]': '/profile/certificates',
        '[NAV:/verify/certificate]': '/verify/certificate',
    };

    // Smart Scroll: User messages & typing indicator scroll to bottom; bot responses scroll to top of new message
    useEffect(() => {
        if (!isOpen) return;

        const lastMsg = messages[messages.length - 1];

        if (isTyping) {
            // When bot is typing, scroll to bottom so typing dots are visible
            if (chatboxRef.current) {
                chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight;
            }
        } else if (lastMsg) {
            if (lastMsg.isUser) {
                // User sent a message -> scroll to bottom
                if (chatboxRef.current) {
                    chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight;
                }
            } else if (lastMsg.id !== 1 && lastMessageRef.current && chatboxRef.current) {
                // Bot responded -> scroll to TOP of the new bot message so user can read from beginning!
                setTimeout(() => {
                    if (lastMessageRef.current && chatboxRef.current) {
                        const containerTop = chatboxRef.current.getBoundingClientRect().top;
                        const messageTop = lastMessageRef.current.getBoundingClientRect().top;
                        const offset = messageTop - containerTop + chatboxRef.current.scrollTop - 10;

                        chatboxRef.current.scrollTo({
                            top: Math.max(0, offset),
                            behavior: 'smooth'
                        });
                    }
                }, 50);
            }
        }
    }, [messages, isTyping, isOpen]);

    // Toggle chatbot window
    const toggleChatbot = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            setShowTeaser(false);
        }
    };

    // Reset conversation
    const handleResetChat = () => {
        setMessages([
            {
                id: 1,
                text: getGreetingMessage(),
                isUser: false,
                timestamp: new Date(),
            }
        ]);
        setIsWaitingForEmailContent(false);
        setIsAwaitingEmailConfirmation(false);
        setShowAuthPrompt(false);
    };

    /**
     * Process navigation hints & route intents from AI response
     * Automatically redirects the user to the target page in the background
     */
    const processNavigation = (responseText) => {
        let cleanedText = responseText;
        let navigationPath = null;

        // 1. Check explicit [NAV:/path] tags from model
        const navMatch = responseText.match(/\[NAV:(\/[^\]]+)\]/i);
        if (navMatch) {
            let target = navMatch[1].trim();
            cleanedText = responseText.replace(/\[NAV:(\/[^\]]+)\]/gi, '').trim();

            if (target === '/events') target = '/Events';
            if (target === '/events/past' || target === '/pastEvents') target = '/Events/pastEvents';
            if (target === '/team') target = '/Team';
            if (target === '/blog' || target === '/blogs') target = '/Blog';
            if (target === '/alumni') target = '/Alumni';
            if (target.toLowerCase() === '/#contact' || target.toLowerCase() === '/contact') target = '/#Contact';
            if (target.toLowerCase() === '/profile/certificates' || target.toLowerCase() === '/certificates') target = '/profile/certificates';

            navigationPath = target;
        } else {
            // 2. Auto-detect page route intents from response content if tag absent
            if (/\b(past events|past event|previous events)\b/i.test(responseText) || responseText.includes('/Events/pastEvents') || responseText.includes('/events/past')) {
                navigationPath = '/Events/pastEvents';
            } else if (/\b(upcoming events|events list|explore events)\b/i.test(responseText) || responseText.includes('/Events') || responseText.includes('/events')) {
                navigationPath = '/Events';
            } else if (/\b(our team|executive team|members|team members)\b/i.test(responseText) || responseText.includes('/Team') || responseText.includes('/team')) {
                navigationPath = '/Team';
            } else if (/\b(blogs|blog posts|articles|read blogs)\b/i.test(responseText) || responseText.includes('/Blog') || responseText.includes('/blog')) {
                navigationPath = '/Blog';
            } else if (/\b(alumni|alumnus)\b/i.test(responseText) || responseText.includes('/Alumni') || responseText.includes('/alumni')) {
                navigationPath = '/Alumni';
            } else if (/\b(certificate|certificates|my certificate|download certificate)\b/i.test(responseText) || responseText.includes('/profile/certificates')) {
                navigationPath = '/profile/certificates';
            } else if (/\b(contact us|contact team|reach out|contact form|send message)\b/i.test(responseText) || responseText.includes('/#Contact') || responseText.includes('/#contact')) {
                navigationPath = '/#Contact';
            }
        }

        // Automatically redirect page if target found and user is not already on that path
        if (navigationPath && typeof window !== 'undefined') {
            const [targetPathWithoutHash, hash] = navigationPath.split('#');
            const targetPath = targetPathWithoutHash || '/';
            const currentPath = window.location.pathname;

            if (hash && (currentPath === targetPath || (currentPath === '/' && !targetPathWithoutHash))) {
                // Already on the target page: scroll smoothly directly to the section
                setTimeout(() => {
                    const el = document.getElementById(hash);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth' });
                    }
                }, 300);
            } else if (currentPath !== navigationPath) {
                setTimeout(() => {
                    router.push(navigationPath);
                    if (hash) {
                        setTimeout(() => {
                            const el = document.getElementById(hash);
                            if (el) {
                                el.scrollIntoView({ behavior: 'smooth' });
                            }
                        }, 700);
                    }
                }, 500);
            }
        }

        return { cleanedText, navigationPath };
    };

    // Handle login button click with target return destination
    const handleLoginClick = (targetPath = null) => {
        if (typeof window !== 'undefined') {
            const dest = (typeof targetPath === 'string' && targetPath.startsWith('/'))
                ? targetPath
                : window.location.pathname;
            sessionStorage.setItem('prevPage', dest);
            setIsOpen(false);
            router.push(`/Login?next=${encodeURIComponent(dest)}`);
        } else {
            setIsOpen(false);
            router.push('/Login');
        }
    };

    // Build conversation history for context
    const buildConversationHistory = () => {
        // Exclude initial greeting and auth prompt cards
        const userAndModelTurns = messages.filter(msg => msg.id !== 1 && !msg.isAuthPrompt);
        // Find first user message index to ensure history begins with 'user'
        const firstUserIdx = userAndModelTurns.findIndex(m => m.isUser);
        if (firstUserIdx === -1) return [];

        const validHistory = userAndModelTurns.slice(firstUserIdx).slice(-6);
        return validHistory.map(msg => ({
            role: msg.isUser ? 'user' : 'model',
            text: msg.text
        }));
    };

    // Send message handler
    const sendMessage = async (messageText = null) => {
        const textToSend = messageText || userInput;
        if (!textToSend?.trim()) return;

        const displayText = messageText || userInput;

        const userMessage = {
            id: messages.length + 1,
            text: displayText,
            isUser: true,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setUserInput('');
        setIsTyping(true);
        setShowAuthPrompt(false);

        try {
            if (isWaitingForEmailContent) {
                const emailResult = await chatbotService.sendEmail(
                    textToSend,
                    userName || 'Anonymous',
                    authCtx.user?.email
                );

                setIsWaitingForEmailContent(false);

                const emailResponse = {
                    id: messages.length + 2,
                    text: emailResult.success
                        ? '✅ Your message has been sent to FED! The event team will get back to you soon. 📧'
                        : '❌ Sorry, there was an error sending your email. Please try again later.',
                    isUser: false,
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, emailResponse]);
                setIsTyping(false);
                return;
            }

            if (isAwaitingEmailConfirmation) {
                setIsAwaitingEmailConfirmation(false);
                const lowerText = textToSend.toLowerCase();
                const isYes = /\b(yes|yeah|yep|sure|ok|okay|send|id like to|y)\b/i.test(lowerText) || lowerText.includes('yes') || lowerText.includes('sure');
                const isNo = /\b(no|nope|nah|not now|no thanks|n)\b/i.test(lowerText) || lowerText.includes('no');

                if (isYes) {
                    setIsWaitingForEmailContent(true);
                    const promptMessage = {
                        id: messages.length + 2,
                        text: '📧 Sure! Please type your message in the next chat. I will send it directly to the event team at fedkiit@gmail.com.',
                        isUser: false,
                        timestamp: new Date(),
                    };
                    setMessages(prev => [...prev, promptMessage]);
                    setIsTyping(false);
                    return;
                } else if (isNo) {
                    const noMessage = {
                        id: messages.length + 2,
                        text: 'No problem! You are redirected to our contact form on the page.',
                        isUser: false,
                        timestamp: new Date(),
                    };
                    setMessages(prev => [...prev, noMessage]);
                    setIsTyping(false);
                    return;
                }
            }

            const emailIntentKeywords = ['send email', 'send mail', 'email fed', 'send an email', 'write an email', 'email team'];
            const lowerText = textToSend.toLowerCase();
            const wantsToSendEmail = emailIntentKeywords.some(keyword => lowerText.includes(keyword));

            if (wantsToSendEmail) {
                setIsWaitingForEmailContent(true);
                const promptMessage = {
                    id: messages.length + 2,
                    text: '📧 Sure! Please type your message in the next chat. I will send it directly to the event team at fedkiit@gmail.com.',
                    isUser: false,
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, promptMessage]);
                setIsTyping(false);
                return;
            }

            const history = buildConversationHistory();
            const response = await chatbotService.sendMessage(textToSend, history);

            if (response.requiresAuth) {
                setShowAuthPrompt(true);
                const authMessage = {
                    id: messages.length + 2,
                    text: response.message || '🔐 Please sign in to access event details or certificate downloads.',
                    isUser: false,
                    timestamp: new Date(),
                    isAuthPrompt: true
                };
                setMessages(prev => [...prev, authMessage]);
            } else {
                let rawResponse = response.success ? response.response : 'Sorry, I encountered an error. Please try again.';

                const emailTriggerPattern = /\[EMAIL_TRIGGER\]/gi;
                if (emailTriggerPattern.test(rawResponse)) {
                    rawResponse = rawResponse.replace(/\[EMAIL_TRIGGER\]/gi, '').trim();
                    setIsWaitingForEmailContent(true);
                }

                let { cleanedText, navigationPath } = processNavigation(rawResponse);

                let finalBotText = cleanedText;
                if (navigationPath === '/#Contact') {
                    setIsAwaitingEmailConfirmation(true);
                    finalBotText = finalBotText
                        ? `${finalBotText}\n\nWould you like to send email to FED?`
                        : `Would you like to send email to FED?`;
                }

                const botResponse = {
                    id: messages.length + 2,
                    text: finalBotText,
                    isUser: false,
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, botResponse]);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setIsWaitingForEmailContent(false);
            const errorResponse = {
                id: messages.length + 2,
                text: 'Sorry, I encountered an error. Please try again.',
                isUser: false,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorResponse]);
        } finally {
            setIsTyping(false);
        }
    };

    // Voice Input Handler (Requests native browser microphone permission popup)
    const toggleVoiceInput = async () => {
        if (typeof window === 'undefined') return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            alert('Voice input is not supported in this browser. Please use Chrome, Edge, or Safari.');
            return;
        }

        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            const recognition = new SpeechRecognition();
            recognitionRef.current = recognition;

            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.lang = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';

            recognition.onstart = () => {
                setIsListening(true);
            };

            recognition.onresult = (event) => {
                let liveTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const text = event.results[i][0].transcript;
                    liveTranscript += text;
                }
                if (liveTranscript) {
                    setUserInput(liveTranscript);
                }
            };

            recognition.onerror = (event) => {
                setIsListening(false);
                console.warn('[Speech Recognition Error]', event.error);
                if (event.error === 'not-allowed') {
                    alert('Microphone access was denied. If allowed in the browser address bar, ensure Windows Settings > Privacy & security > Microphone > "Let desktop apps access your microphone" is turned ON.');
                } else if (event.error === 'service-not-allowed' || event.error === 'network') {
                    alert('Speech service unavailable. If using Brave Browser, enable "Use Google services for speech recognition" in brave://settings/privacy.');
                } else if (event.error === 'audio-capture') {
                    alert('No microphone was detected, or another application is using it in exclusive mode.');
                }
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            try {
                recognition.start();
            } catch (err) {
                console.error('[Speech Start Error]', err);
                setIsListening(false);
            }
        }
    };

    // Clean message text by processing Markdown links & mailto tags
    const cleanMessage = (text) => {
        if (!text) return '';

        const cleanText = text
            .replace(/<a\s+href="[^"]*"\s*>([^<]*)<\/a>/gi, '$1')
            .replace(/<a\s+href='[^']*'\s*>([^<]*)<\/a>/gi, '$1')
            .replace(/<a>([^<]*)<\/a>/gi, '$1')
            .replace(/<\/a>/gi, '')
            .replace(/"\s*target="_blank"\s*rel="noopener\s*noreferrer"\s*style="[^"]*">/gi, '')
            .replace(/"\s*target="_blank"\s*rel="noopener\s*noreferrer">/gi, '')
            .replace(/"\s*target="_blank">/gi, '')
            .replace(/style="[^"]*">/gi, '')
            .replace(/rel="[^"]*">/gi, '')
            .replace(/"\s*>/g, '')
            .replace(/\[([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\]\(mailto:[^)]+\)/gi, '$1')
            .replace(/\[([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\]\(https:\/\/mail\.google\.com[^)]+\)/gi, '$1')
            .replace(/(?<!\/)@fedkiit(?!\/)/gi, '[@fedkiit](https://www.instagram.com/fedkiit/)')
            .replace(/(?<!\[)([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?!\])/g, '[$1](https://mail.google.com/mail/?view=cm&to=$1)');

        if (typeof window !== 'undefined' && DOMPurify && typeof DOMPurify.sanitize === 'function') {
            return DOMPurify.sanitize(cleanText);
        }
        return cleanText;
    };

    /**
     * Active Link Renderer Component
     * Handles both internal App Router navigation and external hyperlinks cleanly
     */
    const LinkRenderer = ({ href, children }) => {
        let normalizedHref = href || '';
        if (normalizedHref === '/events') normalizedHref = '/Events';
        if (normalizedHref === '/events/past' || normalizedHref === '/events/pastEvents') normalizedHref = '/Events/pastEvents';
        if (normalizedHref === '/team') normalizedHref = '/Team';
        if (normalizedHref === '/blog' || normalizedHref === '/blogs') normalizedHref = '/Blog';
        if (normalizedHref === '/alumni') normalizedHref = '/Alumni';
        if (normalizedHref === '/certificates' || normalizedHref === '/profile/certificates') normalizedHref = '/profile/certificates';

        const isInternal = normalizedHref.startsWith('/') || normalizedHref.startsWith('#');

        const handleClick = (e) => {
            if (isInternal) {
                e.preventDefault();
                if (normalizedHref.startsWith('#')) {
                    const hashTarget = normalizedHref.replace('/', '');
                    const el = document.querySelector(hashTarget) || document.querySelector('#contact');
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth' });
                    } else if (location.pathname !== '/') {
                        router.push(normalizedHref);
                    }
                } else {
                    router.push(normalizedHref);
                }
            }
        };

        if (isInternal) {
            return (
                <a href={normalizedHref} onClick={handleClick} className={styles.chatLink}>
                    {children}
                </a>
            );
        }

        return (
            <a href={href} target="_blank" rel="noopener noreferrer" className={styles.chatLink}>
                {children}
            </a>
        );
    };

    return (
        <div className={styles.chatbotWrapper}>
            {/* Glassmorphic Teaser Bubble */}
            {!isOpen && showTeaser && (
                <div className={styles.teaserBubble} onClick={toggleChatbot}>
                    <span>{teaserMessage}</span>
                    <button
                        className={styles.teaserClose}
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowTeaser(false);
                        }}
                        aria-label="Close Teaser"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Toggle Floating Action Button */}
            {!isOpen && (
                <button
                    className={styles.chatbotToggle}
                    onClick={toggleChatbot}
                    aria-label="Open Chat"
                >
                    <MascotFoxAvatar size={48} />
                    <div className={styles.pulseRing}></div>
                </button>
            )}

            {/* Backdrop Overlay */}
            {isOpen && (
                <div className={styles.backdrop} onClick={toggleChatbot}></div>
            )}

            {/* Chatbot Window */}
            {isOpen && (
                <div className={styles.chatbotContainer}>
                    {/* Header */}
                    <header className={styles.chatbotHeader}>
                        <div className={styles.headerContent}>
                            <div className={styles.avatarContainer}>
                                <MascotFoxAvatar size={38} />
                                <div className={styles.statusIndicator}></div>
                            </div>
                            <div className={styles.headerText}>
                                <h2 className={styles.title}>{chatbotName}</h2>
                                <p className={styles.subtitle}>
                                    <IoSparkles size={12} /> AI Assistant
                                </p>
                            </div>
                        </div>
                        <div className={styles.headerActions}>
                            <button
                                className={styles.iconHeaderBtn}
                                onClick={handleResetChat}
                                title="Reset Conversation"
                                aria-label="Reset Conversation"
                            >
                                <IoRefreshOutline size={18} />
                            </button>
                            <button
                                className={styles.closeButton}
                                onClick={toggleChatbot}
                                aria-label="Close Chat"
                            >
                                <IoCloseOutline size={20} />
                            </button>
                        </div>
                    </header>

                    {/* Messages Body */}
                    <div className={styles.chatbotMessages} ref={chatboxRef}>
                        {messages.map((message, idx) => (
                            <div
                                key={message.id}
                                ref={idx === messages.length - 1 ? lastMessageRef : null}
                                className={`${styles.messageWrapper} ${message.isUser ? styles.userWrapper : styles.botWrapper}`}
                            >
                                {!message.isUser && (
                                    <div className={styles.messageAvatar}>
                                        <MascotFoxAvatar size={28} />
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

                                        {message.isAuthPrompt && !authCtx.isLoggedIn && (
                                            <button className={styles.loginButton} onClick={() => handleLoginClick(message.targetPath)}>
                                                <FiLogIn size={16} /> Sign In
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
                                    <MascotFoxAvatar size={28} />
                                </div>
                                <div className={styles.typingIndicator}>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Footer Input Area */}
                    <div className={styles.chatbotFooter}>
                        {/* Compact Horizontal Prompts Rail */}
                        {featuredPrompts.length > 0 && (
                            <div className={styles.compactPromptsRail}>
                                {featuredPrompts.map((prompt) => (
                                    <button
                                        key={prompt.id}
                                        className={styles.compactPromptPill}
                                        onClick={() => sendMessage(prompt.query)}
                                    >
                                        {prompt.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                sendMessage();
                            }}
                            className={styles.inputForm}
                        >
                            <input
                                type="text"
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                placeholder={
                                    isWaitingForEmailContent
                                        ? "Type message to email FED..."
                                        : "Ask about FED events, certificates..."
                                }
                                className={styles.inputField}
                                disabled={isTyping}
                            />
                            <button
                                type="button"
                                onClick={toggleVoiceInput}
                                className={`${styles.micButton} ${isListening ? styles.listening : ''}`}
                                title={isListening ? "Stop listening" : "Start voice input"}
                                aria-label={isListening ? "Stop listening" : "Start voice input"}
                            >
                                {isListening ? <IoMicOff size={18} /> : <IoMic size={18} />}
                            </button>
                            <button
                                type="submit"
                                className={styles.sendButton}
                                disabled={!userInput.trim() || isTyping}
                                aria-label="Send Message"
                            >
                                <IoSend size={16} />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chatbot;
