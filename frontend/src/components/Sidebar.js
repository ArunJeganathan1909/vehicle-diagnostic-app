'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getChats, createChat, deleteChat } from '@/lib/api';
import Image from 'next/image';
import LogoImg from '@/app/AutoDiag.png';
import toast from 'react-hot-toast';
import s from '@/styles/Sidebar.module.css';

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
        const now = new Date();
        list.forEach(c => {
            const d = now - new Date(c.created_at);
            if (d < 86400000)       today.push(c);
            else if (d < 604800000) week.push(c);
            else                    older.push(c);
        });
        return { today, week, older };
    };

    const g = groupChats(chats);
    const W = collapsed ? 64 : 260;

    return (
        <aside className={s.sidebar} style={{ width: W }}>

            {/* Header */}
            <div className={`${s.header} ${collapsed ? s.headerCollapsed : ''}`}>
                {!collapsed && (
                    <div className={s.logo}>
                        <Image
                            src={LogoImg}
                            alt="AutoDiag Logo"
                            width={32}
                            height={32}
                            className={s.logoImg}
                            priority
                        />
                        <span className={s.logoText}>AutoDiag</span>
                    </div>
                )}
                {collapsed && (
                    <Image
                        src={LogoImg}
                        alt="AutoDiag"
                        width={28}
                        height={28}
                        className={s.logoImg}
                        priority
                    />
                )}
                <button className={s.collapseBtn} onClick={() => setCollapsed(p => !p)}
                        title={collapsed ? 'Expand' : 'Collapse'}>
                    {collapsed ? '→' : '←'}
                </button>
            </div>

            {/* New Chat */}
            <div className={`${s.newChatWrap} ${collapsed ? s.newChatWrapCollapsed : ''}`}>
                <button
                    className={`${s.newChatBtn} ${collapsed ? s.newChatBtnCollapsed : ''}`}
                    onClick={handleNewChat}
                    disabled={creating}
                    title="New Diagnostic"
                >
                    <span className={s.newChatIcon}>{creating ? '⏳' : '＋'}</span>
                    {!collapsed && <span>{creating ? 'Creating...' : 'New Diagnostic'}</span>}
                </button>
            </div>

            {/* Chat list — scrolls independently */}
            <div className={s.chatList}>
                {loading ? (
                    <div className={s.loaderWrap}>
                        <div className="loader" style={{ width: 18, height: 18, borderWidth: 2 }} />
                    </div>
                ) : chats.length === 0 ? (
                    !collapsed && <p className={s.emptyMsg}>No chats yet.<br />Start a new diagnostic!</p>
                ) : (
                    [
                        { label: 'Today',     items: g.today },
                        { label: 'This Week', items: g.week  },
                        { label: 'Older',     items: g.older },
                    ].map(({ label, items }) =>
                            items.length > 0 && (
                                <div key={label} className={s.group}>
                                    {!collapsed && <p className={s.groupLabel}>{label}</p>}
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
                    )
                )}
            </div>

            {/* Footer */}
            <div className={`${s.footer} ${collapsed ? s.footerCollapsed : ''}`}>
                <button
                    className={`${s.dashboardBtn} ${collapsed ? s.dashboardBtnCollapsed : ''} ${pathname === '/dashboard' ? s.dashboardBtnActive : ''}`}
                    onClick={() => router.push('/dashboard')}
                    title="Dashboard"
                >
                    <span>⊞</span>
                    {!collapsed && <span className={s.dashboardBtnLabel}>Dashboard</span>}
                </button>

                <div className={`${s.userRow} ${collapsed ? s.userRowCollapsed : ''}`}>
                    <div className={s.userInfo}>
                        {user?.photoURL
                            ? <Image src={user.photoURL} alt="avatar" width={26} height={26} className={s.avatar} />
                            : <div className={s.avatarFallback}>{user?.displayName?.[0] || user?.email?.[0] || 'U'}</div>
                        }
                        {!collapsed && <span className={s.userName}>{user?.displayName || user?.email}</span>}
                    </div>
                    {!collapsed && (
                        <button className={s.signOutBtn} onClick={logout}>Sign out</button>
                    )}
                </div>
            </div>
        </aside>
    );
}

function ChatItem({ chat, isActive, collapsed, onDelete, onClick }) {
    const vehicleLabel = chat.vehicle_brand
        ? `${chat.vehicle_year || ''} ${chat.vehicle_brand} ${chat.vehicle_model || ''}`.trim()
        : null;

    return (
        <div
            className={`${s.chatItem} ${collapsed ? s.chatItemCollapsed : ''} ${isActive ? s.chatItemActive : ''}`}
            onClick={onClick}
            title={collapsed ? (vehicleLabel || chat.title || 'New Vehicle Chat') : undefined}
        >
            {collapsed ? (
                <span style={{ fontSize: 14 }}>{chat.vehicle_brand ? '🚗' : '💬'}</span>
            ) : (
                <>
                    <div className={s.chatItemInner}>
                        <span className={s.chatItemEmoji}>{chat.vehicle_brand ? '🚗' : '💬'}</span>
                        <div className={s.chatItemText}>
                            <div className={`${s.chatItemTitle} ${isActive ? s.chatItemTitleActive : ''}`}>
                                {vehicleLabel || chat.title || 'New Vehicle Chat'}
                            </div>
                            <div className={s.chatItemMeta}>
                                <span className={`${s.chatItemDot} ${chat.status === 'resolved' ? s.chatItemDotResolved : ''}`}>
                                    {chat.status === 'resolved' ? '✓' : '●'}
                                </span>
                                <span className={s.chatItemDate}>{formatDate(chat.created_at)}</span>
                            </div>
                        </div>
                    </div>
                    <button className={s.deleteBtn} onClick={e => onDelete(e, chat.id)}>✕</button>
                </>
            )}
        </div>
    );
}