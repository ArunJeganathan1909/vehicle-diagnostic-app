'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { getChat, sendMessage, resolveChat } from '@/src/lib/api';
import toast from 'react-hot-toast';

export default function ChatPage() {
    return (
        <ProtectedRoute>
            <Chat />
        </ProtectedRoute>
    );
}

function Chat() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const [chat, setChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        loadChat();
    }, [id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    const loadChat = async () => {
        try {
            const res = await getChat(id);
            setChat(res.data.chat);
            setMessages(res.data.messages);
        } catch (err) {
            toast.error('Failed to load chat');
            router.push('/dashboard');
        } finally {
            setLoading(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    const handleSend = async () => {
        const trimmed = input.trim();
        if (!trimmed || sending) return;

        setInput('');
        setSending(true);

        // Optimistically add user message
        const tempUserMsg = {
            id: `temp-${Date.now()}`,
            role: 'user',
            content: trimmed,
            created_at: new Date().toISOString(),
            isTemp: true,
        };
        setMessages((prev) => [...prev, tempUserMsg]);

        // Add typing indicator
        const typingMsg = { id: 'typing', role: 'bot', content: '__typing__', created_at: new Date().toISOString() };
        setMessages((prev) => [...prev, typingMsg]);

        try {
            const res = await sendMessage(parseInt(id), trimmed);
            const { userMessage, botMessage } = res.data;

            setMessages((prev) =>
                prev
                    .filter((m) => m.id !== 'typing' && !m.isTemp)
                    .concat([userMessage, botMessage])
            );

            // Refresh chat to get updated vehicle info
            const chatRes = await getChat(id);
            setChat(chatRes.data.chat);
        } catch (err) {
            setMessages((prev) => prev.filter((m) => m.id !== 'typing' && !m.isTemp));
            toast.error('Failed to send message');
        } finally {
            setSending(false);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleResolve = async () => {
        try {
            const res = await resolveChat(id);
            setChat(res.data.chat);
            toast.success('Chat marked as resolved!');
        } catch (err) {
            toast.error('Failed to resolve chat');
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090f' }}>
                <div className="loader" />
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#09090f', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <header style={{
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                padding: '0 24px',
                height: '64px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                position: 'sticky', top: 0, zIndex: 10,
                background: 'rgba(9,9,15,0.9)',
                backdropFilter: 'blur(12px)',
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        onClick={() => router.push('/dashboard')}
                        style={{
                            width: '36px', height: '36px', borderRadius: '10px',
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: 'transparent', color: '#7a7a9a',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '16px', transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#f0f0f8'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#7a7a9a'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                    >
                        ←
                    </button>

                    <div>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: 700, color: '#f0f0f8' }}>
                            {chat?.title || 'New Vehicle Chat'}
                        </div>
                        {chat?.vehicle_brand && (
                            <div style={{ fontSize: '12px', color: '#7a7a9a' }}>
                                {chat.vehicle_year} {chat.vehicle_brand} {chat.vehicle_model}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Status badge */}
                    <span style={{
                        padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
                        background: chat?.status === 'resolved' ? 'rgba(34,197,94,0.12)' : 'rgba(108,99,255,0.12)',
                        color: chat?.status === 'resolved' ? '#22c55e' : '#a89fff',
                        border: `1px solid ${chat?.status === 'resolved' ? 'rgba(34,197,94,0.2)' : 'rgba(108,99,255,0.2)'}`,
                    }}>
            {chat?.status === 'resolved' ? '✓ Resolved' : '● Active'}
          </span>

                    {chat?.status !== 'resolved' && chat?.vehicle_brand && (
                        <button
                            onClick={handleResolve}
                            style={{
                                padding: '7px 14px', borderRadius: '8px',
                                border: '1px solid rgba(34,197,94,0.25)',
                                background: 'rgba(34,197,94,0.08)',
                                color: '#22c55e', fontSize: '12px', fontWeight: 500,
                                fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(34,197,94,0.15)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(34,197,94,0.08)'; }}
                        >
                            Mark Resolved
                        </button>
                    )}
                </div>
            </header>

            {/* Messages area */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '32px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                maxWidth: '800px',
                width: '100%',
                margin: '0 auto',
                alignSelf: 'center',
                boxSizing: 'border-box',
            }}>
                {messages.map((msg, i) => (
                    <MessageBubble key={msg.id} msg={msg} prevMsg={messages[i - 1]} />
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div style={{
                borderTop: '1px solid rgba(255,255,255,0.06)',
                padding: '20px 24px',
                background: 'rgba(9,9,15,0.9)',
                backdropFilter: 'blur(12px)',
                flexShrink: 0,
            }}>
                <div style={{
                    maxWidth: '800px',
                    margin: '0 auto',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-end',
                }}>
                    <div style={{
                        flex: 1,
                        background: '#111119',
                        border: `1px solid ${input ? 'rgba(108,99,255,0.35)' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: '16px',
                        transition: 'border-color 0.2s',
                        overflow: 'hidden',
                    }}>
            <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending || chat?.status === 'resolved'}
                placeholder={
                    chat?.status === 'resolved'
                        ? 'This chat is resolved'
                        : 'Type your message... (Enter to send, Shift+Enter for new line)'
                }
                rows={1}
                style={{
                    width: '100%',
                    padding: '14px 18px',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#f0f0f8',
                    fontSize: '14px',
                    fontFamily: 'DM Sans, sans-serif',
                    resize: 'none',
                    lineHeight: 1.6,
                    maxHeight: '120px',
                    overflowY: 'auto',
                    opacity: chat?.status === 'resolved' ? 0.5 : 1,
                }}
                onInput={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
            />
                    </div>

                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || sending || chat?.status === 'resolved'}
                        style={{
                            width: '48px', height: '48px',
                            borderRadius: '14px',
                            border: 'none',
                            background: (!input.trim() || sending || chat?.status === 'resolved')
                                ? 'rgba(108,99,255,0.25)'
                                : 'linear-gradient(135deg, #6c63ff, #a855f7)',
                            color: 'white',
                            fontSize: '18px',
                            cursor: (!input.trim() || sending || chat?.status === 'resolved') ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s',
                            flexShrink: 0,
                            boxShadow: (!input.trim() || sending) ? 'none' : '0 0 20px rgba(108,99,255,0.3)',
                        }}
                    >
                        {sending ? (
                            <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.6s linear infinite' }} />
                        ) : '↑'}
                    </button>
                </div>

                <p style={{ textAlign: 'center', color: '#4a4a6a', fontSize: '11px', marginTop: '10px' }}>
                    Powered by Gemini AI · For informational purposes only
                </p>
            </div>
        </div>
    );
}

function MessageBubble({ msg, prevMsg }) {
    const isBot = msg.role === 'bot';
    const isTyping = msg.content === '__typing__';
    const showAvatar = !prevMsg || prevMsg.role !== msg.role;

    return (
        <div
            className="bubble-in"
            style={{
                display: 'flex',
                flexDirection: isBot ? 'row' : 'row-reverse',
                gap: '10px',
                alignItems: 'flex-end',
                marginTop: showAvatar ? '16px' : '2px',
                paddingLeft: isBot ? 0 : '48px',
                paddingRight: isBot ? '48px' : 0,
            }}
        >
            {/* Avatar */}
            {isBot && (
                <div style={{
                    width: '32px', height: '32px', flexShrink: 0,
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #6c63ff, #a855f7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '15px',
                    opacity: showAvatar ? 1 : 0,
                    boxShadow: '0 0 16px rgba(108,99,255,0.25)',
                    alignSelf: 'flex-start',
                    marginTop: '2px',
                }}>
                    🔧
                </div>
            )}

            {/* Bubble */}
            <div style={{
                maxWidth: '75%',
                padding: isTyping ? '14px 18px' : '13px 18px',
                borderRadius: isBot
                    ? showAvatar ? '4px 18px 18px 18px' : '18px'
                    : showAvatar ? '18px 4px 18px 18px' : '18px',
                background: isBot ? '#111119' : 'rgba(108,99,255,0.15)',
                border: isBot
                    ? '1px solid rgba(255,255,255,0.06)'
                    : '1px solid rgba(108,99,255,0.25)',
                color: '#f0f0f8',
                fontSize: '14px',
                lineHeight: 1.65,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
            }}>
                {isTyping ? (
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                        <div className="typing-dot" />
                        <div className="typing-dot" />
                        <div className="typing-dot" />
                    </div>
                ) : (
                    msg.content
                )}
            </div>
        </div>
    );
}