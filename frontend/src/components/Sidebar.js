'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getChats, createChat, deleteChat } from '@/lib/api';
import Image from 'next/image';
import toast from 'react-hot-toast';

const formatDate = (dateStr) => {
    const d    = new Date(dateStr);
    const now  = new Date();
    const diff = now - d;
    if (diff < 60000)     return 'Just now';
    if (diff < 3600000)   return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000)  return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function Sidebar({ activeChatId, onChatsLoaded }) {
    const { user, logout } = useAuth();
    const router           = useRouter();
    const pathname         = usePathname();
    const [chats,     setChats]     = useState([]);
    const [loading,   setLoading]   = useState(true);
    const [creating,  setCreating]  = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => { loadChats(); }, []);

    const loadChats = async () => {
        try {
            const res = await getChats();
            setChats(res.data.chats);
            onChatsLoaded?.(res.data.chats);
        } catch { toast.error('Failed to load chats'); }
        finally  { setLoading(false); }
    };

    const handleNewChat = async () => {
        setCreating(true);
        try {
            const res = await createChat();
            const c   = res.data.chat;
            setChats(prev => [c, ...prev]);
            router.push(`/chat/${c.id}`);
        } catch { toast.error('Failed to create chat'); }
        finally  { setCreating(false); }
    };

    const handleDelete = async (e, chatId) => {
        e.stopPropagation();
        if (!confirm('Delete this chat?')) return;
        try {
            await deleteChat(chatId);
            setChats(prev => prev.filter(c => c.id !== chatId));
            toast.success('Chat deleted');
            if (String(activeChatId) === String(chatId)) router.push('/dashboard');
        } catch { toast.error('Failed to delete'); }
    };

    const groupChats = (list) => {
        const today = [], week = [], older = [];
        const now   = new Date();
        list.forEach(c => {
            const d = now - new Date(c.created_at);
            if (d < 86400000)    today.push(c);
            else if (d < 604800000) week.push(c);
            else older.push(c);
        });
        return { today, week, older };
    };

    const g = groupChats(chats);
    const W = collapsed ? 64 : 260;

    return (
        <aside className="sidebar" style={{ width: W }}>

            {/* Logo + collapse */}
            <div style={{
                height: '64px', flexShrink: 0, display: 'flex', alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'space-between',
                padding: collapsed ? '0 16px' : '0 14px 0 16px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
                {!collapsed && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                        <div style={{
                            width: '30px', height: '30px', borderRadius: '9px',
                            background: 'linear-gradient(135deg, #6c63ff, #a855f7)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '15px', boxShadow: '0 0 14px rgba(108,99,255,0.3)',
                        }}>🔧</div>
                        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: 800, color: '#f0f0f8', letterSpacing: '-0.02em' }}>AutoDiag</span>
                    </div>
                )}
                <button onClick={() => setCollapsed(p => !p)} style={{
                    width: '26px', height: '26px', borderRadius: '7px',
                    border: '1px solid rgba(255,255,255,0.08)', background: 'transparent',
                    color: '#7a7a9a', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: '11px', transition: 'all 0.2s',
                }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#f0f0f8'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#7a7a9a'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                >{collapsed ? '→' : '←'}</button>
            </div>

            {/* New Chat */}
            <div style={{ padding: collapsed ? '10px 8px' : '10px', flexShrink: 0 }}>
                <button onClick={handleNewChat} disabled={creating} style={{
                    width: '100%', padding: collapsed ? '9px' : '9px 12px',
                    borderRadius: '9px', border: '1px solid rgba(108,99,255,0.28)',
                    background: 'rgba(108,99,255,0.09)', color: '#a89fff',
                    fontSize: '12px', fontWeight: 600, fontFamily: 'Syne, sans-serif',
                    cursor: creating ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    gap: '7px', transition: 'all 0.2s', opacity: creating ? 0.6 : 1,
                }}
                        onMouseEnter={e => { if (!creating) { e.currentTarget.style.background = 'rgba(108,99,255,0.16)'; e.currentTarget.style.borderColor = 'rgba(108,99,255,0.45)'; }}}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(108,99,255,0.09)'; e.currentTarget.style.borderColor = 'rgba(108,99,255,0.28)'; }}
                >
                    <span style={{ fontSize: '15px', lineHeight: 1 }}>{creating ? '⏳' : '＋'}</span>
                    {!collapsed && <span>{creating ? 'Creating...' : 'New Diagnostic'}</span>}
                </button>
            </div>

            {/* Chat list — scrollable */}
            <div className="sidebar-chat-list">
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                        <div className="loader" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                    </div>
                ) : chats.length === 0 ? (
                    !collapsed && (
                        <div style={{ textAlign: 'center', padding: '28px 16px', color: '#4a4a6a', fontSize: '12px', lineHeight: 1.6 }}>
                            No chats yet.<br />Start a new diagnostic!
                        </div>
                    )
                ) : (
                    [
                        { label: 'Today',     items: g.today },
                        { label: 'This Week', items: g.week  },
                        { label: 'Older',     items: g.older },
                    ].map(({ label, items }) =>
                            items.length > 0 && (
                                <div key={label} style={{ marginBottom: '6px' }}>
                                    {!collapsed && (
                                        <div style={{
                                            fontSize: '10px', fontWeight: 700, letterSpacing: '0.07em',
                                            color: '#4a4a6a', textTransform: 'uppercase',
                                            padding: '8px 8px 3px',
                                        }}>{label}</div>
                                    )}
                                    {items.map(chat => (
                                        <ChatItem key={chat.id} chat={chat}
                                                  isActive={String(activeChatId) === String(chat.id)}
                                                  collapsed={collapsed}
                                                  onDelete={handleDelete}
                                                  onClick={() => router.push(`/chat/${chat.id}`)}
                                        />
                                    ))}
                                </div>
                            )
                    )
                )}
            </div>

            {/* Bottom: nav + user */}
            <div style={{ flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.06)', padding: collapsed ? '10px 8px' : '10px' }}>
                <button onClick={() => router.push('/dashboard')} style={{
                    width: '100%', padding: collapsed ? '8px' : '7px 10px',
                    borderRadius: '8px', border: 'none',
                    background: pathname === '/dashboard' ? 'rgba(108,99,255,0.1)' : 'transparent',
                    color: pathname === '/dashboard' ? '#a89fff' : '#7a7a9a',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    gap: '8px', fontSize: '12px', marginBottom: '6px', transition: 'all 0.2s',
                }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(108,99,255,0.1)'; e.currentTarget.style.color = '#a89fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = pathname === '/dashboard' ? 'rgba(108,99,255,0.1)' : 'transparent'; e.currentTarget.style.color = pathname === '/dashboard' ? '#a89fff' : '#7a7a9a'; }}
                >
                    <span style={{ fontSize: '14px' }}>⊞</span>
                    {!collapsed && <span style={{ fontWeight: 500 }}>Dashboard</span>}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                        {user?.photoURL ? (
                            <Image src={user.photoURL} alt="avatar" width={26} height={26}
                                   style={{ borderRadius: '50%', border: '1.5px solid rgba(108,99,255,0.3)', flexShrink: 0 }} />
                        ) : (
                            <div style={{
                                width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                                background: 'linear-gradient(135deg, #6c63ff, #a855f7)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '10px', fontWeight: 700, color: 'white',
                            }}>{user?.displayName?.[0] || user?.email?.[0] || 'U'}</div>
                        )}
                        {!collapsed && (
                            <span style={{ color: '#7a7a9a', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {user?.displayName || user?.email}
                            </span>
                        )}
                    </div>
                    {!collapsed && (
                        <button onClick={logout} style={{
                            padding: '3px 8px', borderRadius: '6px', flexShrink: 0,
                            border: '1px solid rgba(255,255,255,0.06)', background: 'transparent',
                            color: '#4a4a6a', fontSize: '11px', cursor: 'pointer', transition: 'all 0.2s',
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
                 padding: collapsed ? '9px' : '8px 9px', borderRadius: '8px', cursor: 'pointer',
                 background: isActive ? 'rgba(108,99,255,0.13)' : hovered ? 'rgba(255,255,255,0.035)' : 'transparent',
                 border: `1px solid ${isActive ? 'rgba(108,99,255,0.28)' : 'transparent'}`,
                 transition: 'all 0.15s', display: 'flex', alignItems: 'center',
                 justifyContent: collapsed ? 'center' : 'space-between',
                 gap: '7px', marginBottom: '1px',
             }}
        >
            {collapsed ? (
                <span style={{ fontSize: '14px' }}>{chat.vehicle_brand ? '🚗' : '💬'}</span>
            ) : (
                <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: '13px', flexShrink: 0 }}>{chat.vehicle_brand ? '🚗' : '💬'}</span>
                        <div style={{ minWidth: 0 }}>
                            <div style={{
                                fontSize: '12px', fontWeight: isActive ? 600 : 400,
                                color: isActive ? '#f0f0f8' : '#b0b0c8',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>{vehicleLabel || chat.title || 'New Vehicle Chat'}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '1px' }}>
                                <span style={{ fontSize: '9px', color: chat.status === 'resolved' ? '#22c55e' : '#6c63ff' }}>
                                    {chat.status === 'resolved' ? '✓' : '●'}
                                </span>
                                <span style={{ fontSize: '10px', color: '#4a4a6a' }}>{formatDate(chat.created_at)}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={e => onDelete(e, chat.id)} style={{
                        width: '22px', height: '22px', borderRadius: '5px', flexShrink: 0,
                        border: '1px solid transparent', background: 'transparent',
                        color: '#4a4a6a', cursor: 'pointer', fontSize: '10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: hovered ? 1 : 0, transition: 'all 0.15s',
                    }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.22)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#4a4a6a'; e.currentTarget.style.borderColor = 'transparent'; }}
                    >✕</button>
                </>
            )}
        </div>
    );
}