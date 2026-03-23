'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import UpgradePrompt from '@/components/UpgradePrompt';
import { getChat, sendMessage, resolveChat } from '@/lib/api';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import s from '@/styles/Chat.module.css';

export default function ChatPage() {
    return <ProtectedRoute><ChatLayout /></ProtectedRoute>;
}

function ChatLayout() {
    const { id } = useParams();
    return (
        <div className={s.shell}>
            <Sidebar activeChatId={id} />
            <div className={s.chatShell}>
                <Chat id={id} />
            </div>
        </div>
    );
}

function parseSeverity(content) {
    const l = content.toLowerCase();
    if (l.includes('urgency: high')   || l.includes('**high**'))   return 'high';
    if (l.includes('urgency: medium') || l.includes('**medium**')) return 'medium';
    if (l.includes('urgency: low')    || l.includes('**low**'))    return 'low';
    return null;
}

const SEV_CLASS = { high: s.sevHigh, medium: s.sevMedium, low: s.sevLow };
const SEV_LABEL = { high: '🔴 High Urgency', medium: '🟡 Medium Urgency', low: '🟢 Low Urgency' };

function toBase64(file) {
    return new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = rej;
        r.readAsDataURL(file);
    });
}

function formatBotContent(content) {
    if (!content) return content;
    let formatted = content
        .replace(/(?<!\n)(\s)((\d+)\.\s+\*\*)/g, '\n$2')
        .replace(/(?<!\n)(\s)((\d+)\.\s+[A-Z])/g, '\n$2');
    formatted = formatted.replace(/\s(\d+\.\s)/g, '\n$1');
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    return formatted;
}

/* ── Chat ── */
function Chat({ id }) {
    const router = useRouter();
    const [chat,          setChat]          = useState(null);
    const [messages,      setMessages]      = useState([]);
    const [input,         setInput]         = useState('');
    const [sending,       setSending]       = useState(false);
    const [loading,       setLoading]       = useState(true);
    const [imageFile,     setImageFile]     = useState(null);
    const [imagePreview,  setImagePreview]  = useState(null);
    const [focused,       setFocused]       = useState(false);
    const [upgradePrompt, setUpgradePrompt] = useState(null);

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
            const imageBase64 = capturedFile && capturedPreview ? capturedPreview.split(',')[1] : null;
            const res = await sendMessage(parseInt(id), content, imageBase64, capturedFile?.type);
            const { userMessage, botMessage } = res.data;

            setMessages(prev =>
                prev.filter(m => m.id !== 'typing' && !m.isTemp)
                    .concat([
                        { ...userMessage, imagePreview: capturedPreview },
                        botMessage,   // includes resource_links from backend
                    ])
            );
            const chatRes = await getChat(id);
            setChat(chatRes.data.chat);

        } catch (err) {
            setMessages(prev => prev.filter(m => m.id !== 'typing' && !m.isTemp));
            const code = err.response?.data?.code;
            if (code === 'IMAGE_ANALYSIS_NOT_AVAILABLE' || code === 'CHAT_LIMIT_REACHED') {
                setUpgradePrompt(code);
            } else {
                toast.error('Failed to send message');
            }
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
        <div className={s.loadingScreen}><div className="loader" /></div>
    );

    const vehicleLabel = chat?.vehicle_brand
        ? `${chat.vehicle_year || ''} ${chat.vehicle_brand} ${chat.vehicle_model || ''}`.trim()
        : null;
    const resolved = chat?.status === 'resolved';
    const canSend  = (input.trim() || imageFile) && !sending && !resolved;

    return (
        <>
            <header className={s.header}>
                <div className={s.headerLeft}>
                    <div className={s.headerTitle}>{chat?.title || 'New Vehicle Chat'}</div>
                    {vehicleLabel && <div className={s.headerSub}>{vehicleLabel}</div>}
                </div>
                <div className={s.headerRight}>
                    <span className={`${s.statusBadge} ${resolved ? s.statusResolved : s.statusActive}`}>
                        {resolved ? '✓ Resolved' : '● Active'}
                    </span>
                    {!resolved && chat?.vehicle_brand && (
                        <button className={s.resolveBtn} onClick={handleResolve}>Mark Resolved</button>
                    )}
                </div>
            </header>

            <div className={s.messages}>
                <div className={s.messagesInner}>
                    {messages.map((msg, i) => (
                        <MessageBubble key={msg.id} msg={msg} prevMsg={messages[i - 1]} />
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            <div className={s.inputBar}>
                <div className={s.inputInner}>
                    {imagePreview && (
                        <div className={s.imagePreviewStrip}>
                            <img src={imagePreview} alt="preview" className={s.imagePreviewThumb} />
                            <div className={s.imagePreviewInfo}>
                                <div className={s.imagePreviewName}>{imageFile?.name}</div>
                                <div className={s.imagePreviewSub}>Ready to send</div>
                            </div>
                            <button className={s.clearImageBtn} onClick={clearImage}>✕</button>
                        </div>
                    )}

                    <div className={s.inputRow}>
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
                        <button
                            className={`${s.cameraBtn} ${imagePreview ? s.cameraBtnActive : ''}`}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={resolved}
                            title="Upload dashboard image"
                        >📷</button>

                        <div className={`${s.textareaWrap} ${focused ? s.textareaWrapFocused : ''}`}>
                            <textarea
                                ref={el => { inputRef.current = el; textareaRef.current = el; }}
                                className={s.textarea}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onFocus={() => setFocused(true)}
                                onBlur={() => setFocused(false)}
                                disabled={sending || resolved}
                                placeholder={
                                    resolved  ? 'This chat is resolved' :
                                        imageFile ? 'Add a description (optional)...' :
                                            'Describe your issue or upload a warning light image...'
                                }
                                rows={1}
                                onInput={e => {
                                    e.target.style.height = 'auto';
                                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                                }}
                            />
                        </div>

                        <button
                            className={`${s.sendBtn} ${canSend ? s.sendBtnActive : ''}`}
                            onClick={handleSend}
                            disabled={!canSend}
                        >
                            {sending ? <span className={s.sendSpinner} /> : '↑'}
                        </button>
                    </div>

                    <p className={s.footer}>Powered by Groq AI · For informational purposes only</p>
                </div>
            </div>

            {upgradePrompt && (
                <UpgradePrompt type={upgradePrompt} onClose={() => setUpgradePrompt(null)} />
            )}
        </>
    );
}

/* ── Resource Links component ── */
function ResourceLinks({ links }) {
    if (!links || links.length === 0) return null;

    const youtubeLinks = links.filter(l => l.type === 'youtube');
    const partsLinks   = links.filter(l => l.type === 'parts');

    return (
        <div className={s.resourceLinks}>
            {youtubeLinks.length > 0 && (
                <div className={s.resourceSection}>
                    <div className={s.resourceSectionTitle}>📹 Repair Videos</div>
                    <div className={s.resourceList}>
                        {youtubeLinks.map((link, i) => (
                            <a
                                key={i}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={s.resourceLink}
                                data-type="youtube"
                            >
                                <span className={s.resourceLinkIcon}>▶</span>
                                <span className={s.resourceLinkLabel}>
                                    {link.label.replace('🎥 ', '')}
                                </span>
                                <span className={s.resourceLinkArrow}>↗</span>
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {partsLinks.length > 0 && (
                <div className={s.resourceSection}>
                    <div className={s.resourceSectionTitle}>🛒 Find Parts</div>
                    <div className={s.resourceList}>
                        {partsLinks.map((link, i) => (
                            <a
                                key={i}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={s.resourceLink}
                                data-type="parts"
                            >
                                <span className={s.resourceLinkIcon}>🔩</span>
                                <span className={s.resourceLinkLabel}>
                                    {link.label.replace('🛒 Buy: ', '')}
                                </span>
                                <span className={s.resourceLinkArrow}>↗</span>
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── MessageBubble ── */
function MessageBubble({ msg, prevMsg }) {
    const isBot      = msg.role === 'bot';
    const isTyping   = msg.content?.startsWith('__typing__');
    const showAvatar = !prevMsg || prevMsg.role !== msg.role;
    const severity   = isBot && !isTyping ? parseSeverity(msg.content) : null;

    const rowClass = [
        s.bubbleRow,
        isBot ? s.bubbleRowBot : s.bubbleRowUser,
        showAvatar ? s.bubbleRowSpaced : s.bubbleRowClose,
    ].join(' ');

    const bubbleClass = [
        s.bubble,
        isBot ? s.bubbleBot : s.bubbleUser,
        isBot
            ? (showAvatar ? s.radiusBotFirst  : s.radiusBotOther)
            : (showAvatar ? s.radiusUserFirst : s.radiusUserOther),
    ].join(' ');

    return (
        <div className={rowClass}>
            {isBot && (
                <div className={`${s.botAvatar} ${showAvatar ? '' : s.botAvatarHidden}`}>🔧</div>
            )}
            <div className={s.bubbleContainer}>

                {severity && (
                    <span className={`${s.severityBadge} ${SEV_CLASS[severity]}`}>
                        {SEV_LABEL[severity]}
                    </span>
                )}

                {msg.imagePreview && (
                    <div className={s.uploadedImage}>
                        <img src={msg.imagePreview} alt="uploaded" />
                    </div>
                )}

                <div className={bubbleClass}>
                    {isTyping ? (
                        <div className={s.typingInner}>
                            <div className={s.typingDots}>
                                <div className="typing-dot" />
                                <div className="typing-dot" />
                                <div className="typing-dot" />
                            </div>
                            <span className={s.typingLabel}>
                                {msg.content.split('::')[1] || 'Analyzing...'}
                            </span>
                        </div>
                    ) : isBot ? (
                        <div className="markdown-body">
                            <ReactMarkdown>{formatBotContent(msg.content)}</ReactMarkdown>
                        </div>
                    ) : (
                        <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                    )}
                </div>

                {/* Resource links — only for bot messages with links */}
                {isBot && !isTyping && msg.resource_links?.length > 0 && (
                    <ResourceLinks links={msg.resource_links} />
                )}
            </div>
        </div>
    );
}