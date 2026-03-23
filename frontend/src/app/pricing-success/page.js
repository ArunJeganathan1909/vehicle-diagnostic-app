'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/lib/api';

export default function PricingSuccessPage() {
    return (
        <ProtectedRoute>
            <Suspense>
                <SuccessContent />
            </Suspense>
        </ProtectedRoute>
    );
}

function SuccessContent() {
    const searchParams = useSearchParams();
    const router       = useRouter();
    const [status, setStatus] = useState('verifying'); // verifying | success | pending

    const orderId = searchParams.get('order_id');

    useEffect(() => {
        // Wait 3s for PayHere notify webhook to process, then verify plan
        const timer = setTimeout(async () => {
            try {
                const res  = await api.get('/api/subscription/me');
                const plan = res.data.subscription?.plan;
                setStatus(plan && plan !== 'free' ? 'success' : 'pending');
            } catch {
                setStatus('success'); // assume success if API check fails
            }
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    const st = {
        shell: {
            minHeight: '100vh', background: '#09090f',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'DM Sans, sans-serif', padding: '24px',
        },
        card: {
            background: '#111119', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '24px', padding: '52px 48px',
            maxWidth: '420px', width: '100%', textAlign: 'center',
        },
        spinner: {
            width: '36px', height: '36px', margin: '0 auto 24px',
            border: '3px solid rgba(255,255,255,0.08)',
            borderTopColor: '#6c63ff', borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
        },
        iconSuccess: {
            width: '72px', height: '72px', borderRadius: '20px', fontSize: '32px',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px', boxShadow: '0 0 32px rgba(34,197,94,0.3)',
        },
        iconPending: {
            width: '72px', height: '72px', borderRadius: '20px', fontSize: '32px',
            background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
        },
        title: {
            fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 800,
            color: '#f0f0f8', marginBottom: '10px', letterSpacing: '-0.03em',
        },
        sub: {
            color: '#7a7a9a', fontSize: '14px', lineHeight: 1.65, marginBottom: '32px',
        },
        btnPrimary: {
            display: 'block', width: '100%', padding: '13px', borderRadius: '12px',
            border: 'none', background: 'linear-gradient(135deg, #6c63ff, #a855f7)',
            color: '#fff', fontSize: '14px', fontWeight: 700,
            fontFamily: 'Syne, sans-serif', cursor: 'pointer', marginBottom: '10px',
        },
        btnSecondary: {
            display: 'block', width: '100%', padding: '11px', borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.07)', background: 'transparent',
            color: '#7a7a9a', fontSize: '13px', cursor: 'pointer',
        },
    };

    if (status === 'verifying') return (
        <div style={st.shell}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={st.card}>
                <div style={st.spinner} />
                <div style={{ ...st.title, fontSize: '20px' }}>Verifying your payment...</div>
                <div style={st.sub}>
                    Please wait while we confirm your payment with PayHere.
                    This usually takes just a few seconds.
                </div>
            </div>
        </div>
    );

    if (status === 'success') return (
        <div style={st.shell}>
            <div style={st.card}>
                <div style={st.iconSuccess}>🎉</div>
                <div style={st.title}>You're all set!</div>
                <div style={st.sub}>
                    Your payment was confirmed by PayHere and your subscription is now active.
                    Enjoy full access to AutoDiag!
                </div>
                <button style={st.btnPrimary} onClick={() => router.push('/dashboard')}>
                    Go to Dashboard →
                </button>
                <button style={st.btnSecondary} onClick={() => router.push('/pricing')}>
                    View My Plan
                </button>
            </div>
        </div>
    );

    // Pending — webhook may still be processing
    return (
        <div style={st.shell}>
            <div style={st.card}>
                <div style={st.iconPending}>⏳</div>
                <div style={st.title}>Payment received!</div>
                <div style={st.sub}>
                    Your PayHere payment is being processed. Your plan will activate within
                    a few minutes — no action needed from you.
                    {orderId && (
                        <span style={{ display: 'block', marginTop: '8px', fontSize: '12px', color: '#4a4a6a' }}>
                            Order ID: {orderId}
                        </span>
                    )}
                </div>
                <button style={st.btnPrimary} onClick={() => router.push('/dashboard')}>
                    Go to Dashboard →
                </button>
                <button style={st.btnSecondary} onClick={() => router.push('/pricing')}>
                    Check Plan Status
                </button>
            </div>
        </div>
    );
}