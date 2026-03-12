'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { createChat } from '@/lib/api';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function DashboardPage() {
    return (
        <ProtectedRoute>
            <Dashboard />
        </ProtectedRoute>
    );
}

function Dashboard() {
    const { user }          = useAuth();
    const router            = useRouter();
    const [chats, setChats] = useState([]);
    const [creating, setCreating] = useState(false);

    const handleNewChat = async () => {
        setCreating(true);
        try {
            const res = await createChat();
            router.push(`/chat/${res.data.chat.id}`);
        } catch {
            toast.error('Failed to create new chat');
            setCreating(false);
        }
    };

    const formatDate = (dateStr) => {
        const d   = new Date(dateStr);
        const now = new Date();
        const diff = now - d;
        if (diff < 60000)     return 'Just now';
        if (diff < 3600000)   return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000)  return `${Math.floor(diff / 3600000)}h ago`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#09090f' }}>

            {/* ── Sidebar ── */}
            <Sidebar onChatsLoaded={setChats} />

            {/* ── Main content ── */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

                {/* Header */}
                <header style={{
                    height: '64px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                    padding: '0 32px', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', flexShrink: 0,
                    background: 'rgba(9,9,15,0.9)', backdropFilter: 'blur(12px)',
                    position: 'sticky', top: 0, zIndex: 10,
                }}>
                    <div>
                        <h1 style={{
                            fontFamily: 'Syne, sans-serif', fontSize: '18px',
                            fontWeight: 800, color: '#f0f0f8', letterSpacing: '-0.02em',
                        }}>My Diagnostics</h1>
                        <p style={{ color: '#4a4a6a', fontSize: '12px' }}>
                            {chats.length} chat{chats.length !== 1 ? 's' : ''}
                        </p>
                    </div>

                    <button onClick={handleNewChat} disabled={creating} style={{
                        padding: '10px 20px', borderRadius: '10px', border: 'none',
                        background: creating
                            ? 'rgba(108,99,255,0.4)'
                            : 'linear-gradient(135deg, #6c63ff, #a855f7)',
                        color: '#fff', fontSize: '13px', fontWeight: 600,
                        fontFamily: 'Syne, sans-serif',
                        cursor: creating ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: '6px',
                        transition: 'all 0.2s',
                        boxShadow: creating ? 'none' : '0 0 20px rgba(108,99,255,0.25)',
                    }}
                            onMouseEnter={e => { if (!creating) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                        {creating ? (
                            <><span style={{ width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.6s linear infinite' }} /> Creating...</>
                        ) : '+ New Diagnostic'}
                    </button>
                </header>

                {/* Content */}
                <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
                    {chats.length === 0 ? (
                        <EmptyState onNew={handleNewChat} />
                    ) : (
                        <>
                            {/* Stats row */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '32px' }}>
                                {[
                                    { label: 'Total Chats',    value: chats.length,                                   icon: '💬' },
                                    { label: 'Active',         value: chats.filter(c => c.status !== 'resolved').length, icon: '🔴' },
                                    { label: 'Resolved',       value: chats.filter(c => c.status === 'resolved').length, icon: '✅' },
                                ].map(stat => (
                                    <div key={stat.label} style={{
                                        background: '#0e0e17', border: '1px solid rgba(255,255,255,0.06)',
                                        borderRadius: '12px', padding: '16px 20px',
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                    }}>
                                        <span style={{ fontSize: '22px' }}>{stat.icon}</span>
                                        <div>
                                            <div style={{ fontSize: '22px', fontWeight: 800, color: '#f0f0f8', fontFamily: 'Syne, sans-serif' }}>{stat.value}</div>
                                            <div style={{ fontSize: '11px', color: '#4a4a6a', fontWeight: 500 }}>{stat.label}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Chat grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                                {chats.map((chat, i) => (
                                    <ChatCard
                                        key={chat.id}
                                        chat={chat}
                                        formatDate={formatDate}
                                        onClick={() => router.push(`/chat/${chat.id}`)}
                                        style={{ animationDelay: `${i * 0.04}s` }}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}

function ChatCard({ chat, formatDate, onClick }) {
    const [hovered, setHovered] = useState(false);

    const vehicleLabel = chat.vehicle_brand
        ? `${chat.vehicle_year || ''} ${chat.vehicle_brand} ${chat.vehicle_model || ''}`.trim()
        : null;

    return (
        <div onClick={onClick}
             onMouseEnter={() => setHovered(true)}
             onMouseLeave={() => setHovered(false)}
             style={{
                 background: hovered ? '#111119' : '#0e0e17',
                 border: `1px solid ${hovered ? 'rgba(108,99,255,0.25)' : 'rgba(255,255,255,0.06)'}`,
                 borderRadius: '14px', padding: '18px', cursor: 'pointer',
                 transition: 'all 0.2s ease',
                 transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
                 boxShadow: hovered ? '0 8px 32px rgba(0,0,0,0.3)' : 'none',
             }}
        >
            {/* Icon + status */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{
                    width: '40px', height: '40px', borderRadius: '10px',
                    background: chat.vehicle_brand
                        ? 'linear-gradient(135deg, rgba(108,99,255,0.2), rgba(168,85,247,0.2))'
                        : 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(108,99,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
                }}>🚗</div>

                <span style={{
                    padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600,
                    background: chat.status === 'resolved' ? 'rgba(34,197,94,0.12)' : 'rgba(108,99,255,0.12)',
                    color: chat.status === 'resolved' ? '#22c55e' : '#a89fff',
                    border: `1px solid ${chat.status === 'resolved' ? 'rgba(34,197,94,0.2)' : 'rgba(108,99,255,0.2)'}`,
                }}>
                    {chat.status === 'resolved' ? '✓ Resolved' : '● Active'}
                </span>
            </div>

            {/* Title */}
            <div style={{
                fontFamily: 'Syne, sans-serif', fontSize: '14px', fontWeight: 700,
                color: '#f0f0f8', marginBottom: '4px',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
                {vehicleLabel || chat.title || 'New Vehicle Chat'}
            </div>

            <div style={{ fontSize: '11px', color: '#4a4a6a' }}>
                {formatDate(chat.created_at)}
            </div>
        </div>
    );
}

function EmptyState({ onNew }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '80px', textAlign: 'center' }}>
            <div style={{
                width: '80px', height: '80px', borderRadius: '20px',
                background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '36px', marginBottom: '20px',
            }}>🔧</div>
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 700, color: '#f0f0f8', marginBottom: '8px' }}>
                No diagnostics yet
            </h3>
            <p style={{ color: '#7a7a9a', marginBottom: '28px', maxWidth: '300px', fontSize: '13px', lineHeight: 1.6 }}>
                Start a new session and our AI will guide you through diagnosing your vehicle.
            </p>
            <button onClick={onNew} style={{
                padding: '11px 24px', borderRadius: '10px', border: 'none',
                background: 'linear-gradient(135deg, #6c63ff, #a855f7)',
                color: '#fff', fontSize: '13px', fontWeight: 600,
                fontFamily: 'Syne, sans-serif', cursor: 'pointer',
            }}>+ Start First Diagnostic</button>
        </div>
    );
}