'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Logo from '@/app/AutoDiag.png'
import toast from 'react-hot-toast';
import s from '@/styles/Login.module.css';

const STEPS = [
    {
        icon: '🚗',
        title: 'Tell us your vehicle',
        desc: 'Share your brand, model and year. AutoDiag tailors every answer to your exact vehicle.',
    },
    {
        icon: '💬',
        title: 'Describe the problem',
        desc: 'Type the symptoms in plain English — or upload a photo of any dashboard warning light.',
    },
    {
        icon: '🔧',
        title: 'Get a full diagnosis',
        desc: 'Receive root causes, OBD2 codes, repair steps, cost estimates and an urgency rating.',
    },
];

const PILLS = [
    'AI Diagnosis', 'OBD2 Codes', 'Cost Estimates',
    'Multi-Vehicle', 'Chat History', 'Image Analysis', 'Urgency Rating',
];

const VALUE_CARDS = [
    { icon: '⚡', bold: 'Instant results', text: ' — no waiting, no booking needed' },
    { icon: '💰', bold: 'Save on repairs',  text: " — know what's wrong before the mechanic" },
    { icon: '🔒', bold: 'Private & secure', text: ' — your chats and data stay yours' },
];

export default function LoginPage() {
    const { user, loading, loginWithGoogle } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user) router.push('/dashboard');
    }, [user, loading, router]);

    const handleLogin = async () => {
        try {
            await loginWithGoogle();
        } catch (error) {
            console.error('Login error:', error.code, error.message);
            toast.error(`Login failed: ${error.code}`);
        }
    };

    if (loading) {
        return (
            <div className={s.loadingScreen}>
                <div className="loader" />
            </div>
        );
    }

    return (
        <div className={s.shell}>
            <div className={s.bgGrid} />
            <div className={s.bgOrbTopLeft} />
            <div className={s.bgOrbBottomRight} />
            <div className={s.divider} />

            {/* ══ LEFT — product showcase ══ */}
            <section className={s.left}>

                {/* Logo */}
                <div className={s.logoRow}>
                    <div className={s.logoImgWrap}>
                        <Image
                            src={Logo}
                            alt="AutoDiag"
                            width={52}
                            height={52}
                            className={s.logoImg}
                            priority
                        />
                    </div>
                    <div className={s.logoMeta}>
                        <span className={s.logoName}>AutoDiag</span>
                        <span className={s.logoBadge}>
                            <span className={s.logoBadgeDot} />
                            AI Powered
                        </span>
                    </div>
                </div>

                {/* Headline */}
                <h1 className={s.headline}>
                    Diagnose any<br />
                    car problem<br />
                    <span className={s.headlineAccent}>in seconds.</span>
                </h1>

                <p className={s.subtext}>
                    AutoDiag uses advanced AI to identify vehicle faults, decode warning lights,
                    and give you mechanic-grade repair guidance — right from your browser, for free.
                </p>

                {/* How it works */}
                <p className={s.sectionLabel}>How it works</p>
                <div className={s.steps}>
                    {STEPS.map((step, i) => (
                        <div key={i} className={s.step}>
                            <div className={s.stepIconWrap}>{step.icon}</div>
                            <div className={s.stepContent}>
                                <div className={s.stepTitle}>{step.title}</div>
                                <div className={s.stepDesc}>{step.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pills */}
                <div className={s.pills}>
                    {PILLS.map(p => (
                        <span key={p} className={s.pill}>
                            <span className={s.pillDot} />
                            {p}
                        </span>
                    ))}
                </div>

            </section>

            {/* ══ RIGHT — login card ══ */}
            <section className={s.right}>
                <div className={s.card}>

                    <p className={s.cardEyebrow}>Free · No credit card needed</p>
                    <h2 className={s.cardTitle}>Sign in to<br />AutoDiag</h2>
                    <p className={s.cardSub}>
                        Access your diagnostic history, saved vehicles
                        and AI-powered chat in one click.
                    </p>

                    <button className={s.googleBtn} onClick={handleLogin}>
                        <GoogleIcon />
                        Continue with Google
                    </button>

                    <div className={s.orRow}>
                        <div className={s.orLine} />
                        <span className={s.orText}>why AutoDiag?</span>
                        <div className={s.orLine} />
                    </div>

                    <div className={s.valueCards}>
                        {VALUE_CARDS.map((c, i) => (
                            <div key={i} className={s.valueCard}>
                                <div className={s.valueIcon}>{c.icon}</div>
                                <div className={s.valueText}>
                                    <span className={s.valueBold}>{c.bold}</span>
                                    {c.text}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className={s.trustRow}>
                        <div className={s.trustDot} />
                        <span className={s.trustText}>Trusted by vehicle owners worldwide</span>
                    </div>

                    <p className={s.terms}>
                        By continuing, you agree to our<br />
                        Terms of Service and Privacy Policy.
                    </p>

                </div>
            </section>

        </div>
    );
}

function GoogleIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
    );
}