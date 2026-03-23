'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import AdBanner from '@/components/AdBanner';
import { createChat } from '@/lib/api';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import s from '@/styles/Dashboard.module.css';

export default function DashboardPage() {
    return <ProtectedRoute><Dashboard /></ProtectedRoute>;
}

function Dashboard() {
    const router             = useRouter();
    const [chats,    setChats]    = useState([]);
    const [creating, setCreating] = useState(false);

    const handleNewChat = async () => {
        setCreating(true);
        try {
            const res = await createChat();
            router.push(`/chat/${res.data.chat.id}`);
        } catch (err) {
            const code = err.response?.data?.code;
            if (code === 'CHAT_LIMIT_REACHED') {
                toast.error('Free plan limit reached — upgrade to continue!');
                setTimeout(() => router.push('/pricing'), 1500);
            } else {
                toast.error('Failed to create new chat');
            }
            setCreating(false);
        }
    };

    const formatDate = (dateStr) => {
        const d    = new Date(dateStr);
        const now  = new Date();
        const diff = now - d;
        if (diff < 60000)    return 'Just now';
        if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        /* app-shell = full-viewport flex row */
        <div className={s.shell}>
            <Sidebar onChatsLoaded={setChats} />

            <main className={s.main}>
                <header className={s.header}>
                    <div>
                        <h1 className={s.headerTitle}>My Diagnostics</h1>
                        <p className={s.headerSub}>{chats.length} chat{chats.length !== 1 ? 's' : ''}</p>
                    </div>
                    <button className={s.newBtn} onClick={handleNewChat} disabled={creating}>
                        {creating ? <><span className={s.spinner} /> Creating...</> : '+ New Diagnostic'}
                    </button>
                </header>

                <div className={s.content}>
                    {chats.length === 0 ? (
                        <EmptyState onNew={handleNewChat} />
                    ) : (
                        <>
                            <div className={s.statsGrid}>
                                {[
                                    { label: 'Total',    value: chats.length,                                    icon: '💬' },
                                    { label: 'Active',   value: chats.filter(c => c.status !== 'resolved').length, icon: '🔴' },
                                    { label: 'Resolved', value: chats.filter(c => c.status === 'resolved').length, icon: '✅' },
                                ].map(stat => (
                                    <div key={stat.label} className={s.statCard}>
                                        <span className={s.statIcon}>{stat.icon}</span>
                                        <div>
                                            <div className={s.statValue}>{stat.value}</div>
                                            <div className={s.statLabel}>{stat.label}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className={s.chatGrid}>
                                {chats.map(chat => (
                                    <ChatCard key={chat.id} chat={chat} formatDate={formatDate}
                                              onClick={() => router.push(`/chat/${chat.id}`)} />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </main>

            {/* Ad panel — only renders for free/pro users */}
            <AdBanner slot="vertical" />
        </div>
    );
}

function ChatCard({ chat, formatDate, onClick }) {
    const vehicleLabel = chat.vehicle_brand
        ? `${chat.vehicle_year || ''} ${chat.vehicle_brand} ${chat.vehicle_model || ''}`.trim()
        : null;

    return (
        <div className={s.card} onClick={onClick}>
            <div className={s.cardTop}>
                <div className={s.cardIcon}>🚗</div>
                <span className={`${s.cardBadge} ${chat.status === 'resolved' ? s.badgeResolved : s.badgeActive}`}>
                    {chat.status === 'resolved' ? '✓ Resolved' : '● Active'}
                </span>
            </div>
            <div className={s.cardTitle}>{vehicleLabel || chat.title || 'New Vehicle Chat'}</div>
            <div className={s.cardDate}>{formatDate(chat.created_at)}</div>
        </div>
    );
}

function EmptyState({ onNew }) {
    return (
        <div className={s.empty}>
            <div className={s.emptyIcon}>🔧</div>
            <h3 className={s.emptyTitle}>No diagnostics yet</h3>
            <p className={s.emptyDesc}>Start a new session and our AI will guide you through diagnosing your vehicle.</p>
            <button className={s.emptyBtn} onClick={onNew}>+ Start First Diagnostic</button>
        </div>
    );
}