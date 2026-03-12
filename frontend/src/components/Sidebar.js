'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getChats, createChat, deleteChat } from '@/lib/api';
import Image from 'next/image';
import toast from 'react-hot-toast';

const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000)    return 'Just now';
    if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000)return `${Math.floor(diff / 86400000)}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function Sidebar({ activeChatId, onChatsLoaded }) {
    const { user, logout }  = useAuth();
    const router            = useRouter();
    const pathname          = usePathname();
    const [chats,    setChats]    = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [creating, setCreating] = useState(false);
    const [collapsed,setCollapsed]= useState(false);

    useEffect(() => { loadChats(); }, []);

    const loadChats = async () => {
        try {
            const res = await getChats();
            setChats(res.data.chats);
            onChatsLoaded?.(res.data.chats);
        } catch {
            toast.error('Failed to load chats');
        } finally {
            setLoading(false);
        }
    };

    const handleNewChat = async () => {
        setCreating(true);
        try {
            const res = await createChat();
            const newChat = res.data.chat;
            setChats(prev => [newChat, ...prev]);
            router.push(`/chat/${newChat.id}`);
        } catch {
            toast.error('Failed to create chat');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (e, chatId) => {
        e.stopPropagation();
        if (!confirm('Delete this chat?')) return;
        try {
            await deleteChat(chatId);
            setChats(prev => prev.filter(c => c.id !== chatId));
            toast.success('Chat deleted');
            if (String(activeChatId) === String(chatId)) {
                router.push('/dashboard');
            }
        } catch {
            toast.error('Failed to delete');
        }
    };

    const groupChats = (chats) => {
        const today    = [];
        const week     = [];
        const older    = [];
        const now      = new Date();

        chats.forEach(chat => {
            const diff = now - new Date(chat.created_at);
            if (diff < 86400000)   today.push(chat);
            else if (diff < 604800000) week.push(chat);
            else older.push(chat);
        });

        return { today, week, older };
    };

    const groups = groupChats(chats);

    return (
        <aside style={{
            width: collapsed ? '64px' : '260px',
            minHeight: '100vh',
            background: '#0a0a12',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
            flexShrink: 0,
            position: 'relative',
            zIndex: 20,
        }}>

            {/* ── Logo + collapse ── */}
            <div style={{
                height: '64px', display: 'flex', alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'space-between',
                padding: collapsed ? '0' : '0 16px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                flexShrink: 0,
            }}>
                {!collapsed && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '10px',
                            background: 'linear-gradient(135deg, #6c63ff, #a855f7)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '16px', boxShadow: '0 0 16px rgba(108,99,255,0.3)',
                        }}>🔧</div>
                        <span style={{
                            fontFamily: 'Syne, sans-serif', fontSize: '16px',
                            fontWeight: 800, color: '#f0f0f8', letterSpacing: '-0.02em',
                        }}>AutoDiag</span>
                    </div>
                )}
                <button onClick={() => setCollapsed(p => !p)} style={{
                    width: '28px', height: '28px', borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.08)', background: 'transparent',
                    color: '#7a7a9a', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: '12px',
                    transition: 'all 0.2s', flexShrink: 0,
                }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#f0f0f8'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#7a7a9a'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {collapsed ? '→' : '←'}
                </button>
            </div>

            {/* ── New Chat button ── */}
            <div style={{ padding: collapsed ? '12px 8px' : '12px', flexShrink: 0 }}>
                <button onClick={handleNewChat} disabled={creating} style={{
                    width: '100%', padding: collapsed ? '10px' : '10px 14px',
                    borderRadius: '10px', border: '1px solid rgba(108,99,255,0.3)',
                    background: 'rgba(108,99,255,0.1)', color: '#a89fff',
                    fontSize: '13px', fontWeight: 600, fontFamily: 'Syne, sans-serif',
                    cursor: creating ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    gap: '8px', transition: 'all 0.2s',
                    opacity: creating ? 0.6 : 1,
                }}
                        onMouseEnter={e => { if (!creating) { e.currentTarget.style.background = 'rgba(108,99,255,0.18)'; e.currentTarget.style.borderColor = 'rgba(108,99,255,0.5)'; }}}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(108,99,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(108,99,255,0.3)'; }}
                        title="New Diagnostic"
                >
                    <span style={{ fontSize: '16px', lineHeight: 1 }}>
                        {creating ? '⏳' : '＋'}
                    </span>
                    {!collapsed && <span>{creating ? 'Creating...' : 'New Diagnostic'}</span>}
                </button>
            </div>

            {/* ── Chat list ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: collapsed ? '0 8px' : '0 8px 8px' }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                        <div className="loader" style={{ width: '20px', height: '20px' }} />
                    </div>
                ) : chats.length === 0 ? (
                    !collapsed && (
                        <div style={{ textAlign: 'center', padding: '32px 16px', color: '#4a4a6a', fontSize: '12px' }}>
                            No chats yet.<br />Start a new diagnostic!
                        </div>
                    )
                ) : (
                    <>
                        {[
                            { label: 'Today',        items: groups.today },
                            { label: 'This Week',    items: groups.week  },
                            { label: 'Older',        items: groups.older },
                        ].map(({ label, items }) =>
                                items.length > 0 && (
                                    <div key={label} style={{ marginBottom: '8px' }}>
                                        {!collapsed && (
                                            <div style={{
                                                fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
                                                color: '#4a4a6a', textTransform: 'uppercase',
                                                padding: '8px 8px 4px',
                                            }}>{label}</div>
                                        )}
                                        {items.map(chat => (
                                            <ChatItem
                                                key={chat.id}
                                                chat={chat}
                                                isActive={String(activeChatId) === String(chat.id)}
                                                collapsed={collapsed}
                                                onDelete={handleDelete}
                                                onClick={() => router.push(`/chat/${chat.id}`)}
                                            />
                                        ))}
                                    </div>
                                )
                        )}
                    </>
                )}
            </div>

            {/* ── User profile at bottom ── */}
            <div style={{
                borderTop: '1px solid rgba(255,255,255,0.06)',
                padding: collapsed ? '12px 8px' : '12px',
                flexShrink: 0,
            }}>
                {/* Dashboard link */}
                <button onClick={() => router.push('/dashboard')} style={{
                    width: '100%', padding: collapsed ? '8px' : '8px 10px',
                    borderRadius: '8px', border: 'none',
                    background: pathname === '/dashboard' ? 'rgba(108,99,255,0.12)' : 'transparent',
                    color: pathname === '/dashboard' ? '#a89fff' : '#7a7a9a',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    gap: '8px', fontSize: '13px', marginBottom: '4px',
                    transition: 'all 0.2s',
                }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(108,99,255,0.1)'; e.currentTarget.style.color = '#a89fff'; }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = pathname === '/dashboard' ? 'rgba(108,99,255,0.12)' : 'transparent';
                            e.currentTarget.style.color = pathname === '/dashboard' ? '#a89fff' : '#7a7a9a';
                        }}
                        title="Dashboard"
                >
                    <span style={{ fontSize: '15px' }}>⊞</span>
                    {!collapsed && <span style={{ fontWeight: 500 }}>Dashboard</span>}
                </button>

                {/* User info + logout */}
                <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'space-between',
                    padding: collapsed ? '8px 0 0' : '8px 4px 0',
                    gap: '8px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        {user?.photoURL ? (
                            <Image src={user.photoURL} alt="avatar" width={28} height={28}
                                   style={{ borderRadius: '50%', border: '2px solid rgba(108,99,255,0.3)', flexShrink: 0 }} />
                        ) : (
                            <div style={{
                                width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                                background: 'linear-gradient(135deg, #6c63ff, #a855f7)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '11px', fontWeight: 700, color: 'white',
                            }}>
                                {user?.displayName?.[0] || user?.email?.[0] || 'U'}
                            </div>
                        )}
                        {!collapsed && (
                            <span style={{
                                color: '#7a7a9a', fontSize: '12px',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                                {user?.displayName || user?.email}
                            </span>
                        )}
                    </div>
                    {!collapsed && (
                        <button onClick={logout} title="Sign out" style={{
                            padding: '4px 8px', borderRadius: '6px',
                            border: '1px solid rgba(255,255,255,0.06)',
                            background: 'transparent', color: '#4a4a6a',
                            fontSize: '11px', cursor: 'pointer', flexShrink: 0,
                            transition: 'all 0.2s',
                        }}
                                onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = '#4a4a6a'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                        >Sign out</button>
                    )}
                </div>
            </div>
        </aside>
    );
}

function ChatItem({ chat, isActive, collapsed, onDelete, onClick }) {
    const [hovered, setHovered] = useState(false);

    const vehicleLabel = chat.vehicle_brand
        ? `${chat.vehicle_year || ''} ${chat.vehicle_brand} ${chat.vehicle_model || ''}`.trim()
        : null;

    return (
        <div onClick={onClick}
             onMouseEnter={() => setHovered(true)}
             onMouseLeave={() => setHovered(false)}
             title={collapsed ? (vehicleLabel || chat.title || 'New Vehicle Chat') : undefined}
             style={{
                 padding: collapsed ? '10px' : '9px 10px',
                 borderRadius: '8px', cursor: 'pointer',
                 background: isActive
                     ? 'rgba(108,99,255,0.15)'
                     : hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
                 border: `1px solid ${isActive ? 'rgba(108,99,255,0.3)' : 'transparent'}`,
                 transition: 'all 0.15s',
                 display: 'flex', alignItems: 'center',
                 justifyContent: collapsed ? 'center' : 'space-between',
                 gap: '8px', marginBottom: '2px',
             }}
        >
            {collapsed ? (
                /* Collapsed — just show icon */
                <span style={{ fontSize: '16px' }}>
                    {chat.vehicle_brand ? '🚗' : '💬'}
                </span>
            ) : (
                <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: '14px', flexShrink: 0 }}>
                            {chat.vehicle_brand ? '🚗' : '💬'}
                        </span>
                        <div style={{ minWidth: 0 }}>
                            <div style={{
                                fontSize: '13px', fontWeight: isActive ? 600 : 400,
                                color: isActive ? '#f0f0f8' : '#c0c0d8',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                                {vehicleLabel || chat.title || 'New Vehicle Chat'}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                <span style={{
                                    fontSize: '10px', fontWeight: 500,
                                    color: chat.status === 'resolved' ? '#22c55e' : '#6c63ff',
                                }}>
                                    {chat.status === 'resolved' ? '✓' : '●'}
                                </span>
                                <span style={{ fontSize: '10px', color: '#4a4a6a' }}>
                                    {formatDate(chat.created_at)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Delete button — only on hover */}
                    <button onClick={e => onDelete(e, chat.id)} style={{
                        width: '24px', height: '24px', borderRadius: '6px', flexShrink: 0,
                        border: '1px solid transparent', background: 'transparent',
                        color: '#4a4a6a', cursor: 'pointer', fontSize: '11px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: hovered ? 1 : 0, transition: 'all 0.15s',
                    }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#4a4a6a'; e.currentTarget.style.borderColor = 'transparent'; }}
                    >✕</button>
                </>
            )}
        </div>
    );
}