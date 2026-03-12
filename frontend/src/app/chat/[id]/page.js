'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import { getChat, sendMessage, resolveChat } from '@/lib/api';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

export default function ChatPage() {
    return (
        <ProtectedRoute>
            <ChatLayout />
        </ProtectedRoute>
    );
}

function ChatLayout() {
    const { id } = useParams();
    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#09090f' }}>
            <Sidebar activeChatId={id} />
            <Chat id={id} />
        </div>
    );
}

// ── Severity badge ────────────────────────────────────────────────────────────
function parseSeverity(content) {
    const lower = content.toLowerCase();
    if (lower.includes('urgency: high')   || lower.includes('**high**'))   return 'high';
    if (lower.includes('urgency: medium') || lower.includes('**medium**')) return 'medium';
    if (lower.includes('urgency: low')    || lower.includes('**low**'))    return 'low';
    return null;
}

const SEV = {
    high:   { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  color: '#ef4444', label: '🔴 High Urgency'   },
    medium: { bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.3)',  color: '#eab308', label: '🟡 Medium Urgency' },
    low:    { bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)',  color: '#22c55e', label: '🟢 Low Urgency'    },
};

// ── Image helper ──────────────────────────────────────────────────────────────
function toBase64(file) {
    return new Promise((res, rej) => {
        const r = new FileReader();
        r.onload  = () => res(r.result);
        r.onerror = rej;
        r.readAsDataURL(file);
    });
}

// ── Chat component ────────────────────────────────────────────────────────────
function Chat({ id }) {
    const router            = useRouter();
    const [chat,     setChat]     = useState(null);
    const [messages, setMessages] = useState([]);
    const [input,    setInput]    = useState('');
    const [sending,  setSending]  = useState(false);
    const [loading,  setLoading]  = useState(true);
    const [imageFile,    setImageFile]    = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    const messagesEndRef = useRef(null);
    const inputRef       = useRef(null);
    const fileInputRef   = useRef(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => { loadChat(); }, [id]);
    useEffect(() => { scrollToBottom(); }, [messages]);

    const loadChat = async () => {
        try {
            const res = await getChat(id);
            setChat(res.data.chat);
            setMessages(res.data.messages);
        } catch {
            toast.error('Failed to load chat');
            router.push('/dashboard');
        } finally {
            setLoading(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    const handleImageSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { toast.error('Please select an image'); return; }
        if (file.size > 5 * 1024 * 1024)    { toast.error('Image must be under 5MB'); return; }
        setImageFile(file);
        setImagePreview(await toBase64(file));
    };

    const clearImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSend = async () => {
        const trimmed = input.trim();
        if ((!trimmed && !imageFile) || sending) return;

        let messageContent = trimmed;
        if (imageFile) {
            messageContent = trimmed
                ? `${trimmed}\n\n[User uploaded an image of their vehicle/dashboard warning light]`
                : '[User uploaded an image of their vehicle/dashboard warning light — please identify any warning lights or visible issues]';
        }

        const capturedPreview = imagePreview;
        const capturedFile    = imageFile;
        setInput('');
        clearImage();
        setSending(true);

        const tempUserMsg = {
            id: `temp-${Date.now()}`, role: 'user', content: messageContent,
            created_at: new Date().toISOString(), isTemp: true, imagePreview: capturedPreview,
        };
        setMessages(prev => [...prev, tempUserMsg]);

        const vehicleName = chat?.vehicle_brand
            ? `${chat.vehicle_brand}${chat.vehicle_model ? ' ' + chat.vehicle_model : ''}`
            : 'your vehicle';

        setMessages(prev => [...prev, {
            id: 'typing', role: 'bot',
            content: `__typing__::Analyzing ${vehicleName}...`,
            created_at: new Date().toISOString(),
        }]);

        try {
            // Extract base64 data (strip data URL prefix for backend)
            let imageBase64 = null;
            if (capturedFile && capturedPreview) {
                imageBase64 = capturedPreview.split(',')[1];
            }

            const res = await sendMessage(parseInt(id), messageContent, imageBase64, capturedFile?.type);
            const { userMessage, botMessage } = res.data;

            setMessages(prev =>
                prev.filter(m => m.id !== 'typing' && !m.isTemp)
                    .concat([{ ...userMessage, imagePreview: capturedPreview }, botMessage])
            );

            const chatRes = await getChat(id);
            setChat(chatRes.data.chat);
        } catch {
            setMessages(prev => prev.filter(m => m.id !== 'typing' && !m.isTemp));
            toast.error('Failed to send message');
        } finally {
            setSending(false);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const handleResolve = async () => {
        try {
            const res = await resolveChat(id);
            setChat(res.data.chat);
            toast.success('Marked as resolved!');
        } catch {
            toast.error('Failed to resolve');
        }
    };

    if (loading) return (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="loader" />
        </div>
    );

    const vehicleLabel = chat?.vehicle_brand
        ? `${chat.vehicle_year || ''} ${chat.vehicle_brand} ${chat.vehicle_model || ''}`.trim()
        : null;

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100vh' }}>

            {/* ── Chat header ── */}
            <header style={{
                height: '64px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                padding: '0 24px', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', flexShrink: 0,
                background: 'rgba(9,9,15,0.9)', backdropFilter: 'blur(12px)',
                position: 'sticky', top: 0, zIndex: 10,
            }}>
                <div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: 700, color: '#f0f0f8' }}>
                        {chat?.title || 'New Vehicle Chat'}
                    </div>
                    {vehicleLabel && (
                        <div style={{ fontSize: '12px', color: '#7a7a9a' }}>{vehicleLabel}</div>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                        padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
                        background: chat?.status === 'resolved' ? 'rgba(34,197,94,0.12)' : 'rgba(108,99,255,0.12)',
                        color:      chat?.status === 'resolved' ? '#22c55e' : '#a89fff',
                        border: `1px solid ${chat?.status === 'resolved' ? 'rgba(34,197,94,0.2)' : 'rgba(108,99,255,0.2)'}`,
                    }}>
                        {chat?.status === 'resolved' ? '✓ Resolved' : '● Active'}
                    </span>
                    {chat?.status !== 'resolved' && chat?.vehicle_brand && (
                        <button onClick={handleResolve} style={{
                            padding: '6px 12px', borderRadius: '8px',
                            border: '1px solid rgba(34,197,94,0.25)', background: 'rgba(34,197,94,0.08)',
                            color: '#22c55e', fontSize: '12px', fontWeight: 500,
                            cursor: 'pointer', transition: 'all 0.2s',
                        }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.15)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.08)'; }}
                        >Mark Resolved</button>
                    )}
                </div>
            </header>

            {/* ── Messages ── */}
            <div style={{
                flex: 1, overflowY: 'auto', padding: '24px',
                display: 'flex', flexDirection: 'column', gap: '4px',
                maxWidth: '760px', width: '100%', margin: '0 auto',
                alignSelf: 'center', boxSizing: 'border-box',
            }}>
                {messages.map((msg, i) => (
                    <MessageBubble key={msg.id} msg={msg} prevMsg={messages[i - 1]} />
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* ── Input ── */}
            <div style={{
                borderTop: '1px solid rgba(255,255,255,0.06)',
                padding: '16px 24px', background: 'rgba(9,9,15,0.9)',
                backdropFilter: 'blur(12px)', flexShrink: 0,
            }}>
                <div style={{ maxWidth: '760px', margin: '0 auto' }}>

                    {/* Image preview */}
                    {imagePreview && (
                        <div style={{
                            marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 14px', background: '#111119',
                            border: '1px solid rgba(108,99,255,0.25)', borderRadius: '12px',
                        }}>
                            <img src={imagePreview} alt="preview" style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover' }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ color: '#f0f0f8', fontSize: '12px', fontWeight: 500 }}>{imageFile?.name}</div>
                                <div style={{ color: '#7a7a9a', fontSize: '11px' }}>Ready to send</div>
                            </div>
                            <button onClick={clearImage} style={{
                                width: '26px', height: '26px', borderRadius: '6px',
                                border: '1px solid rgba(255,255,255,0.08)', background: 'transparent',
                                color: '#7a7a9a', cursor: 'pointer', fontSize: '11px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>✕</button>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                        {/* Image upload */}
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
                        <button onClick={() => fileInputRef.current?.click()}
                                disabled={chat?.status === 'resolved'}
                                title="Upload warning light image"
                                style={{
                                    width: '46px', height: '46px', borderRadius: '12px', flexShrink: 0,
                                    border: `1px solid ${imagePreview ? 'rgba(108,99,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                                    background: imagePreview ? 'rgba(108,99,255,0.15)' : 'transparent',
                                    color: imagePreview ? '#a89fff' : '#7a7a9a',
                                    cursor: chat?.status === 'resolved' ? 'not-allowed' : 'pointer',
                                    fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.2s',
                                }}
                        >📷</button>

                        {/* Text */}
                        <div style={{
                            flex: 1, background: '#111119',
                            border: `1px solid ${input ? 'rgba(108,99,255,0.35)' : 'rgba(255,255,255,0.08)'}`,
                            borderRadius: '14px', transition: 'border-color 0.2s', overflow: 'hidden',
                        }}>
                            <textarea ref={inputRef} value={input}
                                      onChange={e => setInput(e.target.value)}
                                      onKeyDown={handleKeyDown}
                                      disabled={sending || chat?.status === 'resolved'}
                                      placeholder={
                                          chat?.status === 'resolved' ? 'This chat is resolved' :
                                              imageFile ? 'Add a description (optional)...' :
                                                  'Describe your issue or upload a warning light image...'
                                      }
                                      rows={1}
                                      style={{
                                          width: '100%', padding: '12px 16px', background: 'transparent',
                                          border: 'none', outline: 'none', color: '#f0f0f8',
                                          fontSize: '14px', fontFamily: 'DM Sans, sans-serif',
                                          resize: 'none', lineHeight: 1.6, maxHeight: '120px',
                                          overflowY: 'auto', opacity: chat?.status === 'resolved' ? 0.5 : 1,
                                          boxSizing: 'border-box',
                                      }}
                                      onInput={e => {
                                          e.target.style.height = 'auto';
                                          e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                                      }}
                            />
                        </div>

                        {/* Send */}
                        <button onClick={handleSend}
                                disabled={(!input.trim() && !imageFile) || sending || chat?.status === 'resolved'}
                                style={{
                                    width: '46px', height: '46px', borderRadius: '12px', border: 'none',
                                    background: ((!input.trim() && !imageFile) || sending || chat?.status === 'resolved')
                                        ? 'rgba(108,99,255,0.25)'
                                        : 'linear-gradient(135deg, #6c63ff, #a855f7)',
                                    color: 'white', fontSize: '18px', flexShrink: 0,
                                    cursor: ((!input.trim() && !imageFile) || sending || chat?.status === 'resolved') ? 'not-allowed' : 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.2s',
                                    boxShadow: ((!input.trim() && !imageFile) || sending) ? 'none' : '0 0 16px rgba(108,99,255,0.3)',
                                }}
                        >
                            {sending
                                ? <span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.6s linear infinite' }} />
                                : '↑'}
                        </button>
                    </div>

                    <p style={{ textAlign: 'center', color: '#4a4a6a', fontSize: '11px', marginTop: '8px' }}>
                        Powered by Groq AI · For informational purposes only
                    </p>
                </div>
            </div>
        </div>
    );
}

// ── Message Bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, prevMsg }) {
    const isBot      = msg.role === 'bot';
    const isTyping   = msg.content?.startsWith('__typing__');
    const showAvatar = !prevMsg || prevMsg.role !== msg.role;
    const typingLabel = isTyping ? (msg.content.split('::')[1] || 'Analyzing...') : null;
    const severity    = isBot && !isTyping ? parseSeverity(msg.content) : null;
    const sevStyle    = severity ? SEV[severity] : null;

    return (
        <div style={{
            display: 'flex', flexDirection: isBot ? 'row' : 'row-reverse',
            gap: '10px', alignItems: 'flex-end',
            marginTop: showAvatar ? '16px' : '2px',
            paddingLeft: isBot ? 0 : '48px',
            paddingRight: isBot ? '48px' : 0,
        }}>
            {isBot && (
                <div style={{
                    width: '30px', height: '30px', flexShrink: 0, borderRadius: '9px',
                    background: 'linear-gradient(135deg, #6c63ff, #a855f7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', opacity: showAvatar ? 1 : 0,
                    boxShadow: '0 0 12px rgba(108,99,255,0.2)',
                    alignSelf: 'flex-start', marginTop: '2px',
                }}>🔧</div>
            )}

            <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', gap: '5px' }}>

                {/* Severity badge */}
                {sevStyle && (
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        padding: '3px 9px', borderRadius: '7px', fontSize: '11px', fontWeight: 600,
                        background: sevStyle.bg, border: `1px solid ${sevStyle.border}`,
                        color: sevStyle.color, alignSelf: 'flex-start',
                    }}>
                        {sevStyle.label}
                    </div>
                )}

                {/* Uploaded image */}
                {msg.imagePreview && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <img src={msg.imagePreview} alt="uploaded" style={{
                            maxWidth: '180px', maxHeight: '130px', borderRadius: '10px',
                            objectFit: 'cover', border: '1px solid rgba(108,99,255,0.25)',
                        }} />
                    </div>
                )}

                {/* Bubble */}
                <div style={{
                    padding: isTyping ? '12px 16px' : '11px 16px',
                    borderRadius: isBot
                        ? (showAvatar ? '4px 16px 16px 16px' : '16px')
                        : (showAvatar ? '16px 4px 16px 16px' : '16px'),
                    background: isBot ? '#111119' : 'rgba(108,99,255,0.15)',
                    border: isBot ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(108,99,255,0.25)',
                    color: '#f0f0f8', fontSize: '14px', lineHeight: 1.65, wordBreak: 'break-word',
                }}>
                    {isTyping ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <div className="typing-dot" />
                                <div className="typing-dot" />
                                <div className="typing-dot" />
                            </div>
                            <span style={{ color: '#7a7a9a', fontSize: '12px', fontStyle: 'italic' }}>{typingLabel}</span>
                        </div>
                    ) : isBot ? (
                        <div className="markdown-body">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                    ) : (
                        <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                    )}
                </div>
            </div>
        </div>
    );
}