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
        const d    = new Date(dateStr);
        const now  = new Date();
        const diff = now - d;
        if (diff < 60000)    return 'Just now';
        if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        /* app-shell = full-viewport flex row, overflow:hidden */
        <div className="app-shell">

            <Sidebar onChatsLoaded={setChats} />

            {/* page-main = flex column, height:100vh, overflow:hidden */}
            <main className="page-main">

                {/* page-header = sticky, flex-shrink:0 */}
                <header className="page-header">
                    <div>
                        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '17px', fontWeight: 800, color: '#f0f0f8' }}>
                            My Diagnostics
                        </h1>
                        <p style={{ color: '#4a4a6a', fontSize: '11px', marginTop: '1px' }}>
                            {chats.length} chat{chats.length !== 1 ? 's' : ''}
                        </p>
                    </div>

                    <button onClick={handleNewChat} disabled={creating} style={{
                        padding: '9px 18px', borderRadius: '10px', border: 'none',
                        background: creating
                            ? 'rgba(108,99,255,0.35)'
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
                            <>
                                <span style={{
                                    width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.3)',
                                    borderTopColor: 'white', borderRadius: '50%', display: 'inline-block',
                                    animation: 'spin 0.6s linear infinite',
                                }} />
                                Creating...
                            </>
                        ) : '+ New Diagnostic'}
                    </button>
                </header>

                {/* page-content = flex:1, overflow-y:auto — ONLY this scrolls */}
                <div className="page-content">
                    {chats.length === 0 ? (
                        <EmptyState onNew={handleNewChat} />
                    ) : (
                        <>
                            {/* Stats */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                                gap: '12px', marginBottom: '28px',
                            }}>
                                {[
                                    { label: 'Total',    value: chats.length,                                    icon: '💬' },
                                    { label: 'Active',   value: chats.filter(c => c.status !== 'resolved').length, icon: '🔴' },
                                    { label: 'Resolved', value: chats.filter(c => c.status === 'resolved').length, icon: '✅' },
                                ].map(s => (
                                    <div key={s.label} style={{
                                        background: '#0e0e17',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        borderRadius: '12px', padding: '14px 18px',
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                    }}>
                                        <span style={{ fontSize: '20px' }}>{s.icon}</span>
                                        <div>
                                            <div style={{ fontSize: '22px', fontWeight: 800, color: '#f0f0f8', fontFamily: 'Syne, sans-serif' }}>{s.value}</div>
                                            <div style={{ fontSize: '11px', color: '#4a4a6a', fontWeight: 500 }}>{s.label}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Chat grid */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                                gap: '12px',
                            }}>
                                {chats.map(chat => (
                                    <ChatCard
                                        key={chat.id}
                                        chat={chat}
                                        formatDate={formatDate}
                                        onClick={() => router.push(`/chat/${chat.id}`)}
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
                 border: `1px solid ${hovered ? 'rgba(108,99,255,0.22)' : 'rgba(255,255,255,0.06)'}`,
                 borderRadius: '14px', padding: '16px', cursor: 'pointer',
                 transition: 'all 0.2s ease',
                 transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
                 boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.25)' : 'none',
             }}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{
                    width: '38px', height: '38px', borderRadius: '10px', fontSize: '17px',
                    background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>🚗</div>
                <span style={{
                    padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600,
                    background: chat.status === 'resolved' ? 'rgba(34,197,94,0.1)' : 'rgba(108,99,255,0.1)',
                    color:      chat.status === 'resolved' ? '#22c55e' : '#a89fff',
                    border: `1px solid ${chat.status === 'resolved' ? 'rgba(34,197,94,0.2)' : 'rgba(108,99,255,0.2)'}`,
                }}>
                    {chat.status === 'resolved' ? '✓ Resolved' : '● Active'}
                </span>
            </div>
            <div style={{
                fontFamily: 'Syne, sans-serif', fontSize: '13px', fontWeight: 700,
                color: '#f0f0f8', marginBottom: '4px',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
                {vehicleLabel || chat.title || 'New Vehicle Chat'}
            </div>
            <div style={{ fontSize: '11px', color: '#4a4a6a' }}>{formatDate(chat.created_at)}</div>
        </div>
    );
}

function EmptyState({ onNew }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '80px', textAlign: 'center' }}>
            <div style={{
                width: '72px', height: '72px', borderRadius: '18px',
                background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '32px', marginBottom: '18px',
            }}>🔧</div>
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, color: '#f0f0f8', marginBottom: '8px' }}>
                No diagnostics yet
            </h3>
            <p style={{ color: '#7a7a9a', marginBottom: '24px', maxWidth: '280px', fontSize: '13px', lineHeight: 1.6 }}>
                Start a new session and our AI will guide you through diagnosing your vehicle.
            </p>
            <button onClick={onNew} style={{
                padding: '10px 22px', borderRadius: '10px', border: 'none',
                background: 'linear-gradient(135deg, #6c63ff, #a855f7)',
                color: '#fff', fontSize: '13px', fontWeight: 600,
                fontFamily: 'Syne, sans-serif', cursor: 'pointer',
            }}>+ Start First Diagnostic</button>
        </div>
    );
}