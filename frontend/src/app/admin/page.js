'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import s from '@/styles/Admin.module.css';

// Client-side gate — real security is enforced on the backend
const ADMIN_UIDS = (process.env.NEXT_PUBLIC_ADMIN_UIDS || '')
    .split(',')
    .map(u => u.trim())
    .filter(Boolean);

export default function AdminPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [tab, setTab] = useState('overview');

    useEffect(() => {
        if (loading) return;
        if (!user) { router.replace('/login'); return; }
        if (!ADMIN_UIDS.includes(user.uid)) { router.replace('/dashboard'); }
    }, [user, loading, router]);

    if (loading || !user) return <LoadingScreen />;

    return (
        <div className={s.shell}>
            <Sidebar tab={tab} setTab={setTab} router={router} />
            <main className={s.main}>
                {tab === 'overview' && <OverviewTab />}
                {tab === 'users'    && <UsersTab />}
            </main>
        </div>
    );
}

// ── Sidebar ───────────────────────────────────────────────────────────────
function Sidebar({ tab, setTab, router }) {
    const NAV = [
        { key: 'overview', icon: '▦', label: 'Overview' },
        { key: 'users',    icon: '◉', label: 'Users'    },
    ];
    return (
        <aside className={s.sidebar}>
            <div className={s.sidebarTop}>
                <div className={s.brand}>
                    <span className={s.brandIcon}>⚙</span>
                    <div>
                        <div className={s.brandName}>AutoDiag</div>
                        <div className={s.brandBadge}>ADMIN</div>
                    </div>
                </div>
                <nav className={s.nav}>
                    {NAV.map(n => (
                        <button
                            key={n.key}
                            className={`${s.navBtn} ${tab === n.key ? s.navBtnActive : ''}`}
                            onClick={() => setTab(n.key)}
                        >
                            <span className={s.navIcon}>{n.icon}</span>
                            <span>{n.label}</span>
                        </button>
                    ))}
                </nav>
            </div>
            <button className={s.backBtn} onClick={() => router.push('/dashboard')}>
                ← Back to App
            </button>
        </aside>
    );
}

// ── Overview Tab ──────────────────────────────────────────────────────────
function OverviewTab() {
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(false);

    const fetchStats = useCallback(async () => {
        setLoading(true); setError(false);
        try {
            const res = await api.get('/api/admin/stats');
            setData(res.data);
        } catch { setError(true); }
        finally  { setLoading(false); }
    }, []);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    if (loading) return <LoadingScreen />;
    if (error)   return <ErrorScreen onRetry={fetchStats} />;

    const { stats, recentUsers, dailySignups, dailyChats } = data;
    const total = stats.planBreakdown.free + stats.planBreakdown.pro + stats.planBreakdown.ultra || 1;

    const STAT_CARDS = [
        { icon: '◈', label: 'Total Users',      value: stats.totalUsers,      sub: `+${stats.newUsers30d} this month`,  accent: '#7c6aff' },
        { icon: '◎', label: 'Total Chats',      value: stats.totalChats,      sub: `+${stats.newChats30d} this month`,  accent: '#3ecf8e' },
        { icon: '◉', label: 'Active Chats',     value: stats.activeChats,     sub: `${stats.resolvedChats} resolved`,   accent: '#f59e0b' },
        { icon: '◈', label: 'Total Messages',   value: stats.totalMessages,   sub: 'All time',                          accent: '#22d3ee' },
        { icon: '★', label: 'Subscribed Users', value: stats.subscribedUsers, sub: 'Pro + Ultra',                       accent: '#a78bfa' },
        { icon: '₨', label: 'Revenue (LKR)',    value: fmtLKR(stats.totalRevenueLKR), sub: 'Completed payments',        accent: '#fb7185', isStr: true },
    ];

    return (
        <div className={s.content}>
            <PageHeader title="Dashboard Overview" onRefresh={fetchStats} />

            {/* Stat cards */}
            <div className={s.statsGrid}>
                {STAT_CARDS.map((c, i) => (
                    <div key={i} className={s.statCard} style={{ '--accent': c.accent }}>
                        <div className={s.statCardAccent} />
                        <div className={s.statIcon}>{c.icon}</div>
                        <div className={s.statValue}>{c.isStr ? c.value : c.value.toLocaleString()}</div>
                        <div className={s.statLabel}>{c.label}</div>
                        <div className={s.statSub}>{c.sub}</div>
                    </div>
                ))}
            </div>

            {/* Charts row */}
            <div className={s.chartsRow}>
                <div className={s.chartCard}>
                    <div className={s.chartTitle}>New Users — Last 14 Days</div>
                    <BarChart data={dailySignups} color="#7c6aff" />
                </div>
                <div className={s.chartCard}>
                    <div className={s.chartTitle}>New Chats — Last 14 Days</div>
                    <BarChart data={dailyChats} color="#3ecf8e" />
                </div>
            </div>

            {/* Plan breakdown + Recent users */}
            <div className={s.bottomRow}>
                <div className={s.planCard}>
                    <div className={s.chartTitle}>Plan Distribution</div>
                    <div className={s.planList}>
                        {[
                            { key: 'free',  label: 'Free',  color: '#4a4a6a', icon: '🚗' },
                            { key: 'pro',   label: 'Pro',   color: '#7c6aff', icon: '⚡' },
                            { key: 'ultra', label: 'Ultra', color: '#f59e0b', icon: '🔥' },
                        ].map(p => {
                            const count = stats.planBreakdown[p.key] || 0;
                            const pct   = Math.round((count / total) * 100);
                            return (
                                <div key={p.key} className={s.planRow}>
                                    <div className={s.planRowLabel}>
                                        <span>{p.icon}</span>
                                        <span>{p.label}</span>
                                        <span className={s.planCount}>{count}</span>
                                    </div>
                                    <div className={s.planBarTrack}>
                                        <div
                                            className={s.planBarFill}
                                            style={{ width: `${pct}%`, background: p.color }}
                                        />
                                    </div>
                                    <span className={s.planPct}>{pct}%</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className={s.recentCard}>
                    <div className={s.chartTitle}>Recent Signups</div>
                    <div className={s.recentList}>
                        {recentUsers.map(u => (
                            <div key={u.id} className={s.recentRow}>
                                <div className={s.recentAvatar} style={{ background: planColor(u.plan) }}>
                                    {(u.display_name || u.email)[0].toUpperCase()}
                                </div>
                                <div className={s.recentInfo}>
                                    <div className={s.recentName}>{u.display_name || '—'}</div>
                                    <div className={s.recentEmail}>{u.email}</div>
                                </div>
                                <span className={s.planBadge} style={{ '--pc': planColor(u.plan) }}>
                                    {u.plan}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Users Tab ─────────────────────────────────────────────────────────────
function UsersTab() {
    const [users,   setUsers]   = useState([]);
    const [total,   setTotal]   = useState(0);
    const [page,    setPage]    = useState(1);
    const [search,  setSearch]  = useState('');
    const [loading, setLoading] = useState(true);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/admin/users', { params: { page, limit: 20, search } });
            setUsers(res.data.users);
            setTotal(res.data.total);
        } catch {}
        finally  { setLoading(false); }
    }, [page, search]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const totalPages = Math.ceil(total / 20);

    return (
        <div className={s.content}>
            <PageHeader title="User Management" onRefresh={fetchUsers} />

            <div className={s.tableToolbar}>
                <input
                    className={s.searchInput}
                    placeholder="Search by name or email…"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
                <span className={s.totalLabel}>{total.toLocaleString()} users total</span>
            </div>

            {loading ? <LoadingScreen /> : (
                <>
                    <div className={s.tableWrap}>
                        <table className={s.table}>
                            <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Plan</th>
                                <th>Status</th>
                                <th>Joined</th>
                            </tr>
                            </thead>
                            <tbody>
                            {users.map(u => (
                                <tr key={u.id}>
                                    <td className={s.tdMuted}>#{u.id}</td>
                                    <td>
                                        <div className={s.nameCell}>
                                            <div className={s.tableAvatar} style={{ background: planColor(u.plan) }}>
                                                {(u.display_name || u.email)[0].toUpperCase()}
                                            </div>
                                            {u.display_name || '—'}
                                        </div>
                                    </td>
                                    <td className={s.tdMuted}>{u.email}</td>
                                    <td>
                                            <span className={s.planBadge} style={{ '--pc': planColor(u.plan) }}>
                                                {u.plan}
                                            </span>
                                    </td>
                                    <td>
                                            <span className={`${s.statusBadge} ${u.plan_status === 'active' ? s.statusActive : s.statusInactive}`}>
                                                {u.plan_status || 'active'}
                                            </span>
                                    </td>
                                    <td className={s.tdMuted}>{fmtDate(u.created_at)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className={s.pagination}>
                            <button className={s.pageBtn} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                            <span className={s.pageInfo}>{page} / {totalPages}</span>
                            <button className={s.pageBtn} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ── Bar Chart ─────────────────────────────────────────────────────────────
function BarChart({ data, color }) {
    if (!data || data.length === 0) return <div className={s.noData}>No data yet</div>;
    const max = Math.max(...data.map(d => Number(d.count)), 1);
    return (
        <div className={s.barChart}>
            {data.map((d, i) => {
                const pct   = Math.round((Number(d.count) / max) * 100);
                const label = new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                return (
                    <div key={i} className={s.barCol}>
                        <div className={s.barTooltip}>{d.count}</div>
                        <div className={s.barTrack}>
                            <div className={s.barFill} style={{ height: `${pct}%`, background: color }} />
                        </div>
                        <div className={s.barLabel}>{label}</div>
                    </div>
                );
            })}
        </div>
    );
}

// ── Shared components ─────────────────────────────────────────────────────
function PageHeader({ title, onRefresh }) {
    return (
        <div className={s.pageHeader}>
            <h1 className={s.pageTitle}>{title}</h1>
            <button className={s.refreshBtn} onClick={onRefresh}>↻ Refresh</button>
        </div>
    );
}

function LoadingScreen() {
    return (
        <div className={s.loadingScreen}>
            <div className={s.spinner} />
            <p className={s.loadingText}>Loading…</p>
        </div>
    );
}

function ErrorScreen({ onRetry }) {
    return (
        <div className={s.loadingScreen}>
            <p style={{ color: '#fb7185', marginBottom: '12px' }}>Failed to load data.</p>
            <button className={s.refreshBtn} onClick={onRetry}>Try Again</button>
        </div>
    );
}

// ── Utilities ─────────────────────────────────────────────────────────────
function planColor(plan) {
    return plan === 'ultra' ? '#f59e0b' : plan === 'pro' ? '#7c6aff' : '#4a4a6a';
}

function fmtDate(d) {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtLKR(n) {
    return `LKR ${Number(n).toLocaleString('en-LK', { maximumFractionDigits: 0 })}`;
}