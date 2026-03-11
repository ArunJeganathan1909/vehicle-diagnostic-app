'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { getChats, createChat, deleteChat } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import toast from 'react-hot-toast';

export default function DashboardPage() {
    return (
        <ProtectedRoute>
            <Dashboard />
        </ProtectedRoute>
    );
}

function Dashboard() {
    const { user, logout } = useAuth();
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const router = useRouter();

    useEffect(() => {
        loadChats();
    }, []);

    const loadChats = async () => {
        try {
            const res = await getChats();
            setChats(res.data.chats);
        } catch (err) {
            toast.error('Failed to load chats');
        } finally {
            setLoading(false);
        }
    };

    const handleNewChat = async () => {
        setCreating(true);
        try {
            const res = await createChat();
            router.push(`/chat/${res.data.chat.id}`);
        } catch (err) {
            toast.error('Failed to create new chat');
            setCreating(false);
        }
    };

    const handleDeleteChat = async (e, chatId) => {
        e.stopPropagation();
        if (!confirm('Delete this chat?')) return;
        try {
            await deleteChat(chatId);
            setChats((prev) => prev.filter((c) => c.id !== chatId));
            toast.success('Chat deleted');
        } catch (err) {
            toast.error('Failed to delete chat');
        }
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = now - d;
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div style={{ minHeight: '100vh', background: '#09090f', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <header style={{
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                padding: '0 32px',
                height: '64px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'sticky', top: 0, zIndex: 10,
                background: 'rgba(9,9,15,0.9)',
                backdropFilter: 'blur(12px)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '22px' }}>🔧</span>
                    <span style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, color: '#f0f0f8' }}>
            AutoDiag
          </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {user?.photoURL ? (
                            <Image
                                src={user.photoURL}
                                alt="avatar"
                                width={32}
                                height={32}
                                style={{ borderRadius: '50%', border: '2px solid rgba(108,99,255,0.4)' }}
                            />
                        ) : (
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, #6c63ff, #a855f7)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '13px', fontWeight: 700,
                            }}>
                                {user?.displayName?.[0] || user?.email?.[0] || 'U'}
                            </div>
                        )}
                        <span style={{ color: '#7a7a9a', fontSize: '14px' }}>
              {user?.displayName || user?.email}
            </span>
                    </div>

                    <button
                        onClick={logout}
                        style={{
                            padding: '7px 16px', borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: 'transparent', color: '#7a7a9a',
                            fontSize: '13px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; e.currentTarget.style.color = '#f0f0f8'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#7a7a9a'; }}
                    >
                        Sign out
                    </button>
                </div>
            </header>

            {/* Main */}
            <main style={{ flex: 1, padding: '48px 32px', maxWidth: '900px', width: '100%', margin: '0 auto' }}>
                {/* Page title + New Chat button */}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '40px' }}>
                    <div>
                        <h1 style={{
                            fontFamily: 'Syne, sans-serif',
                            fontSize: '36px', fontWeight: 800,
                            color: '#f0f0f8',
                            letterSpacing: '-0.03em',
                            marginBottom: '6px',
                        }}>
                            My Diagnostics
                        </h1>
                        <p style={{ color: '#7a7a9a', fontSize: '14px' }}>
                            {chats.length} chat{chats.length !== 1 ? 's' : ''} · each chat is one vehicle
                        </p>
                    </div>

                    <button
                        onClick={handleNewChat}
                        disabled={creating}
                        style={{
                            padding: '12px 24px',
                            borderRadius: '12px',
                            border: 'none',
                            background: creating
                                ? 'rgba(108,99,255,0.4)'
                                : 'linear-gradient(135deg, #6c63ff, #a855f7)',
                            color: '#fff',
                            fontSize: '14px', fontWeight: 600,
                            fontFamily: 'Syne, sans-serif',
                            cursor: creating ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            transition: 'all 0.2s',
                            boxShadow: creating ? 'none' : '0 0 24px rgba(108,99,255,0.3)',
                        }}
                        onMouseEnter={(e) => { if (!creating) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                        {creating ? (
                            <>
                                <span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.6s linear infinite' }} />
                                Creating...
                            </>
                        ) : (
                            <>+ New Diagnostic</>
                        )}
                    </button>
                </div>

                {/* Chat list */}
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '80px' }}>
                        <div className="loader" />
                    </div>
                ) : chats.length === 0 ? (
                    <EmptyState onNew={handleNewChat} />
                ) : (
                    <div style={{ display: 'grid', gap: '12px' }}>
                        {chats.map((chat, i) => (
                            <div
                                key={chat.id}
                                className="fade-up"
                                style={{ animationDelay: `${i * 0.05}s`, opacity: 0 }}
                                onClick={() => router.push(`/chat/${chat.id}`)}
                            >
                                <ChatCard chat={chat} onDelete={handleDeleteChat} formatDate={formatDate} />
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

function ChatCard({ chat, onDelete, formatDate }) {
    const [hovered, setHovered] = useState(false);

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                background: hovered ? '#111119' : '#0e0e17',
                border: `1px solid ${hovered ? 'rgba(108,99,255,0.25)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: '16px',
                padding: '20px 24px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
                {/* Vehicle icon */}
                <div style={{
                    width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0,
                    background: chat.vehicle_brand
                        ? 'linear-gradient(135deg, rgba(108,99,255,0.2), rgba(168,85,247,0.2))'
                        : 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(108,99,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '22px',
                }}>
                    🚗
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                    <h3 style={{
                        fontFamily: 'Syne, sans-serif',
                        fontSize: '16px', fontWeight: 700,
                        color: '#f0f0f8',
                        marginBottom: '4px',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                        {chat.title || 'New Vehicle Chat'}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
                padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 500,
                background: chat.status === 'resolved' ? 'rgba(34,197,94,0.12)' : 'rgba(108,99,255,0.12)',
                color: chat.status === 'resolved' ? '#22c55e' : '#a89fff',
                border: `1px solid ${chat.status === 'resolved' ? 'rgba(34,197,94,0.2)' : 'rgba(108,99,255,0.2)'}`,
            }}>
              {chat.status === 'resolved' ? '✓ Resolved' : '● Active'}
            </span>
                        <span style={{ color: '#4a4a6a', fontSize: '12px' }}>
              {formatDate(chat.created_at)}
            </span>
                    </div>
                </div>
            </div>

            {/* Delete button */}
            <button
                onClick={(e) => onDelete(e, chat.id)}
                style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    background: 'transparent', color: '#4a4a6a',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s', flexShrink: 0,
                    opacity: hovered ? 1 : 0,
                    fontSize: '14px',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239,68,68,0.12)';
                    e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)';
                    e.currentTarget.style.color = '#ef4444';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.color = '#4a4a6a';
                }}
            >
                ✕
            </button>
        </div>
    );
}

function EmptyState({ onNew }) {
    return (
        <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            paddingTop: '80px', textAlign: 'center',
        }}>
            <div style={{
                width: '96px', height: '96px', borderRadius: '24px',
                background: 'rgba(108,99,255,0.08)',
                border: '1px solid rgba(108,99,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '40px', marginBottom: '24px',
            }}>
                🔧
            </div>
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: '#f0f0f8', marginBottom: '10px' }}>
                No diagnostics yet
            </h3>
            <p style={{ color: '#7a7a9a', marginBottom: '32px', maxWidth: '320px', fontSize: '14px', lineHeight: 1.6 }}>
                Start a new diagnostic session for your vehicle. Our AI will guide you through the process.
            </p>
            <button
                onClick={onNew}
                style={{
                    padding: '12px 28px', borderRadius: '12px', border: 'none',
                    background: 'linear-gradient(135deg, #6c63ff, #a855f7)',
                    color: '#fff', fontSize: '14px', fontWeight: 600,
                    fontFamily: 'Syne, sans-serif', cursor: 'pointer',
                }}
            >
                + Start First Diagnostic
            </button>
        </div>
    );
}