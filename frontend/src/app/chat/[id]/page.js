'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
        <div className="app-shell">
            <Sidebar activeChatId={id} />
            <div className="chat-shell">
                <Chat id={id} />
            </div>
        </div>
    );
}

/* ── helpers ─────────────────────────────────────────────────── */
function parseSeverity(content) {
    const l = content.toLowerCase();
    if (l.includes('urgency: high')   || l.includes('**high**'))   return 'high';
    if (l.includes('urgency: medium') || l.includes('**medium**')) return 'medium';
    if (l.includes('urgency: low')    || l.includes('**low**'))    return 'low';
    return null;
}
const SEV = {
    high:   { bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.28)',  color: '#ef4444', label: '🔴 High Urgency'   },
    medium: { bg: 'rgba(234,179,8,0.1)',  border: 'rgba(234,179,8,0.28)',  color: '#eab308', label: '🟡 Medium Urgency' },
    low:    { bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.28)',  color: '#22c55e', label: '🟢 Low Urgency'    },
};
function toBase64(file) {
    return new Promise((res, rej) => {
        const r = new FileReader();
        r.onload  = () => res(r.result);
        r.onerror = rej;
        r.readAsDataURL(file);
    });
}

/* ── Chat ─────────────────────────────────────────────────────── */
function Chat({ id }) {
    const router             = useRouter();
    const [chat,         setChat]         = useState(null);
    const [messages,     setMessages]     = useState([]);
    const [input,        setInput]        = useState('');
    const [sending,      setSending]      = useState(false);
    const [loading,      setLoading]      = useState(true);
    const [imageFile,    setImageFile]    = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    const messagesEndRef = useRef(null);
    const inputRef       = useRef(null);
    const fileInputRef   = useRef(null);
    const textareaRef    = useRef(null);

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
        if (file.size > 5 * 1024 * 1024)    { toast.error('Image must be under 5 MB'); return; }
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

        let content = trimmed;
        if (imageFile) {
            content = trimmed
                ? `${trimmed}\n\n[User uploaded an image of their vehicle/dashboard warning light]`
                : '[User uploaded an image of their vehicle/dashboard warning light — please identify any warning lights or visible issues]';
        }

        const capturedPreview = imagePreview;
        const capturedFile    = imageFile;
        setInput('');
        clearImage();
        setSending(true);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';

        const vehicleName = chat?.vehicle_brand
            ? `${chat.vehicle_brand}${chat.vehicle_model ? ' ' + chat.vehicle_model : ''}`
            : 'your vehicle';

        setMessages(prev => [
            ...prev,
            { id: `temp-${Date.now()}`, role: 'user', content, created_at: new Date().toISOString(), isTemp: true, imagePreview: capturedPreview },
            { id: 'typing', role: 'bot', content: `__typing__::Analyzing ${vehicleName}...`, created_at: new Date().toISOString() },
        ]);

        try {
            let imageBase64 = null;
            if (capturedFile && capturedPreview) imageBase64 = capturedPreview.split(',')[1];

            const res = await sendMessage(parseInt(id), content, imageBase64, capturedFile?.type);
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
        } catch { toast.error('Failed to resolve'); }
    };

    if (loading) return (
        <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#09090f',
        }}>
            <div className="loader" />
        </div>
    );

    const vehicleLabel = chat?.vehicle_brand
        ? `${chat.vehicle_year || ''} ${chat.vehicle_brand} ${chat.vehicle_model || ''}`.trim()
        : null;
    const resolved = chat?.status === 'resolved';

    return (
        <>
            {/* ── HEADER — flex-shrink:0 (via page-header) ── */}
            <header className="page-header">
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                        fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: 700,
                        color: '#f0f0f8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                        {vehicleLabel || chat?.title || 'New Vehicle Chat'}
                    </div>
                    {vehicleLabel && (
                        <div style={{ fontSize: '11px', color: '#7a7a9a', marginTop: '1px' }}>
                            {vehicleLabel}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{
                        padding: '3px 9px', borderRadius: '7px', fontSize: '11px', fontWeight: 600,
                        background: resolved ? 'rgba(34,197,94,0.1)' : 'rgba(108,99,255,0.1)',
                        color:      resolved ? '#22c55e' : '#a89fff',
                        border: `1px solid ${resolved ? 'rgba(34,197,94,0.2)' : 'rgba(108,99,255,0.2)'}`,
                    }}>
                        {resolved ? '✓ Resolved' : '● Active'}
                    </span>
                    {!resolved && chat?.vehicle_brand && (
                        <button onClick={handleResolve} style={{
                            padding: '5px 11px', borderRadius: '8px',
                            border: '1px solid rgba(34,197,94,0.25)',
                            background: 'rgba(34,197,94,0.07)',
                            color: '#22c55e', fontSize: '12px', fontWeight: 500,
                            cursor: 'pointer', transition: 'background 0.2s',
                        }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.14)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.07)'; }}
                        >Mark Resolved</button>
                    )}
                </div>
            </header>

            {/* ── MESSAGES — flex:1 min-height:0 overflow-y:auto ── */}
            <div className="chat-messages">
                <div style={{ maxWidth: '720px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {messages.map((msg, i) => (
                        <MessageBubble key={msg.id} msg={msg} prevMsg={messages[i - 1]} />
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* ── INPUT BAR — flex-shrink:0 ── */}
            <div className="chat-input-bar">
                <div style={{ maxWidth: '720px', margin: '0 auto' }}>

                    {/* Image preview strip */}
                    {imagePreview && (
                        <div style={{
                            marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '9px 13px', background: '#111119',
                            border: '1px solid rgba(108,99,255,0.22)', borderRadius: '11px',
                        }}>
                            <img src={imagePreview} alt="preview" style={{
                                width: '40px', height: '40px', borderRadius: '7px', objectFit: 'cover',
                            }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ color: '#f0f0f8', fontSize: '12px', fontWeight: 500 }}>{imageFile?.name}</div>
                                <div style={{ color: '#7a7a9a', fontSize: '11px' }}>Ready to send</div>
                            </div>
                            <button onClick={clearImage} style={{
                                width: '24px', height: '24px', borderRadius: '6px',
                                border: '1px solid rgba(255,255,255,0.08)', background: 'transparent',
                                color: '#7a7a9a', cursor: 'pointer', fontSize: '10px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>✕</button>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                        {/* Camera button */}
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={resolved}
                            title="Upload dashboard / warning light image"
                            style={{
                                width: '44px', height: '44px', flexShrink: 0, borderRadius: '11px',
                                border: `1px solid ${imagePreview ? 'rgba(108,99,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                                background: imagePreview ? 'rgba(108,99,255,0.12)' : 'transparent',
                                color: imagePreview ? '#a89fff' : '#7a7a9a',
                                cursor: resolved ? 'not-allowed' : 'pointer',
                                fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s',
                            }}
                        >📷</button>

                        {/* Textarea */}
                        <div style={{
                            flex: 1, background: '#111119', borderRadius: '12px', overflow: 'hidden',
                            border: `1px solid ${input ? 'rgba(108,99,255,0.32)' : 'rgba(255,255,255,0.08)'}`,
                            transition: 'border-color 0.2s',
                        }}>
                            <textarea
                                ref={el => { inputRef.current = el; textareaRef.current = el; }}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={sending || resolved}
                                placeholder={
                                    resolved  ? 'This chat is resolved' :
                                        imageFile ? 'Add a description (optional)...' :
                                            'Describe your issue or upload a warning light image...'
                                }
                                rows={1}
                                style={{
                                    width: '100%', padding: '11px 14px',
                                    background: 'transparent', border: 'none', outline: 'none',
                                    color: '#f0f0f8', fontSize: '14px',
                                    fontFamily: 'DM Sans, sans-serif',
                                    resize: 'none', lineHeight: 1.55,
                                    maxHeight: '120px', overflowY: 'auto',
                                    boxSizing: 'border-box',
                                    opacity: resolved ? 0.5 : 1,
                                }}
                                onInput={e => {
                                    e.target.style.height = 'auto';
                                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                                }}
                            />
                        </div>

                        {/* Send button */}
                        <button
                            onClick={handleSend}
                            disabled={(!input.trim() && !imageFile) || sending || resolved}
                            style={{
                                width: '44px', height: '44px', flexShrink: 0, borderRadius: '11px',
                                border: 'none',
                                background: ((!input.trim() && !imageFile) || sending || resolved)
                                    ? 'rgba(108,99,255,0.22)'
                                    : 'linear-gradient(135deg, #6c63ff, #a855f7)',
                                color: 'white', fontSize: '18px',
                                cursor: ((!input.trim() && !imageFile) || sending || resolved)
                                    ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s',
                                boxShadow: (input.trim() || imageFile) && !sending && !resolved
                                    ? '0 0 14px rgba(108,99,255,0.3)' : 'none',
                            }}
                        >
                            {sending
                                ? <span style={{
                                    width: '14px', height: '14px',
                                    border: '2px solid rgba(255,255,255,0.3)',
                                    borderTopColor: 'white', borderRadius: '50%', display: 'inline-block',
                                    animation: 'spin 0.6s linear infinite',
                                }} />
                                : '↑'}
                        </button>
                    </div>

                    {/*<p style={{ textAlign: 'center', color: '#4a4a6a', fontSize: '11px', marginTop: '8px' }}>*/}
                    {/*    Powered by Groq AI · For informational purposes only*/}
                    {/*</p>*/}
                </div>
            </div>
        </>
    );
}

/* ── MessageBubble ──────────────────────────────────────────────── */
function MessageBubble({ msg, prevMsg }) {
    const isBot       = msg.role === 'bot';
    const isTyping    = msg.content?.startsWith('__typing__');
    const showAvatar  = !prevMsg || prevMsg.role !== msg.role;
    const typingLabel = isTyping ? (msg.content.split('::')[1] || 'Analyzing...') : null;
    const severity    = isBot && !isTyping ? parseSeverity(msg.content) : null;
    const sev         = severity ? SEV[severity] : null;

    return (
        <div style={{
            display: 'flex',
            flexDirection: isBot ? 'row' : 'row-reverse',
            gap: '8px',
            alignItems: 'flex-end',
            marginTop: showAvatar ? '14px' : '2px',
            paddingLeft:  isBot ? 0 : '52px',
            paddingRight: isBot ? '52px' : 0,
        }}>
            {/* Bot avatar dot */}
            {isBot && (
                <div style={{
                    width: '28px', height: '28px', flexShrink: 0, borderRadius: '8px',
                    background: 'linear-gradient(135deg, #6c63ff, #a855f7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', opacity: showAvatar ? 1 : 0,
                    alignSelf: 'flex-start', marginTop: '2px',
                }}>🔧</div>
            )}

            <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', gap: '4px' }}>

                {/* Severity badge */}
                {sev && (
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '3px 8px', borderRadius: '7px', fontSize: '11px', fontWeight: 600,
                        background: sev.bg, border: `1px solid ${sev.border}`, color: sev.color,
                        alignSelf: 'flex-start',
                    }}>{sev.label}</div>
                )}

                {/* Uploaded image thumbnail */}
                {msg.imagePreview && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <img src={msg.imagePreview} alt="uploaded" style={{
                            maxWidth: '160px', maxHeight: '120px', borderRadius: '10px',
                            objectFit: 'cover', border: '1px solid rgba(108,99,255,0.22)',
                        }} />
                    </div>
                )}

                {/* Bubble */}
                <div style={{
                    padding: '10px 14px',
                    borderRadius: isBot
                        ? (showAvatar ? '4px 14px 14px 14px' : '14px')
                        : (showAvatar ? '14px 4px 14px 14px' : '14px'),
                    background: isBot ? '#111119' : 'rgba(108,99,255,0.14)',
                    border: `1px solid ${isBot ? 'rgba(255,255,255,0.06)' : 'rgba(108,99,255,0.22)'}`,
                    color: '#f0f0f8', fontSize: '14px', lineHeight: 1.65,
                    wordBreak: 'break-word',
                }}>
                    {isTyping ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                            <div style={{ display: 'flex', gap: '3px' }}>
                                <div className="typing-dot" />
                                <div className="typing-dot" />
                                <div className="typing-dot" />
                            </div>
                            <span style={{ color: '#7a7a9a', fontSize: '12px', fontStyle: 'italic' }}>
                                {typingLabel}
                            </span>
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