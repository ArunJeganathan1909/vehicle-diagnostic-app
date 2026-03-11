'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function LoginPage() {
    const { user, loading, loginWithGoogle } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user) {
            router.push('/dashboard');
        }
    }, [user, loading, router]);

    const handleLogin = async () => {
        console.log('Button clicked'); // confirm click fires
        try {
            await loginWithGoogle();
        } catch (error) {
            console.error('Login error:', error.code, error.message);
            toast.error(`Login failed: ${error.code}`);
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090f' }}>
                <div className="loader" />
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: '#09090f',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Background orbs — pointerEvents none so they don't block clicks */}
            <div style={{
                position: 'absolute',
                width: '600px', height: '600px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(108,99,255,0.12) 0%, transparent 70%)',
                top: '-200px', right: '-200px',
                pointerEvents: 'none',   // ← IMPORTANT
                zIndex: 0,
            }} />
            <div style={{
                position: 'absolute',
                width: '400px', height: '400px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)',
                bottom: '-100px', left: '-100px',
                pointerEvents: 'none',   // ← IMPORTANT
                zIndex: 0,
            }} />
            <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
                backgroundSize: '60px 60px',
                pointerEvents: 'none',   // ← IMPORTANT
                zIndex: 0,
            }} />

            {/* Login card — zIndex above overlays */}
            <div className="fade-up" style={{
                background: 'rgba(17,17,25,0.85)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '24px',
                padding: '56px 48px',
                width: '100%', maxWidth: '440px',
                textAlign: 'center',
                position: 'relative',
                zIndex: 10,              // ← IMPORTANT
            }}>
                <div style={{
                    width: '72px', height: '72px',
                    borderRadius: '20px',
                    background: 'linear-gradient(135deg, #6c63ff, #a855f7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 32px',
                    fontSize: '32px',
                    boxShadow: '0 0 40px rgba(108,99,255,0.35)',
                }}>
                    🔧
                </div>

                <h1 style={{
                    fontFamily: 'Syne, sans-serif',
                    fontSize: '32px', fontWeight: 800,
                    color: '#f0f0f8', marginBottom: '8px',
                    letterSpacing: '-0.03em',
                }}>
                    AutoDiag
                </h1>

                <p style={{ color: '#7a7a9a', fontSize: '15px', marginBottom: '40px', lineHeight: 1.5 }}>
                    AI-powered vehicle diagnostics.<br />
                    Describe the issue, get the fix.
                </p>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '36px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {['Smart Diagnosis', 'Multi-Vehicle', 'Chat History'].map((f) => (
                        <span key={f} style={{
                            padding: '5px 12px', borderRadius: '20px',
                            background: 'rgba(108,99,255,0.12)',
                            border: '1px solid rgba(108,99,255,0.25)',
                            color: '#a89fff', fontSize: '12px', fontWeight: 500,
                        }}>{f}</span>
                    ))}
                </div>

                <button
                    onClick={handleLogin}
                    style={{
                        width: '100%', padding: '14px 24px',
                        borderRadius: '14px',
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: 'rgba(255,255,255,0.05)',
                        color: '#f0f0f8', fontSize: '15px', fontWeight: 500,
                        fontFamily: 'DM Sans, sans-serif',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                        transition: 'all 0.2s ease',
                        position: 'relative',
                        zIndex: 10,          // ← IMPORTANT
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.09)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    <GoogleIcon />
                    Continue with Google
                </button>

                <p style={{ color: '#4a4a6a', fontSize: '12px', marginTop: '24px' }}>
                    By continuing, you agree to our Terms of Service
                </p>
            </div>
        </div>
    );
}

function GoogleIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
    );
}