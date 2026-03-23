'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import s from '@/styles/Pricing.module.css';

// ── Plan definitions ──────────────────────────────────────────────────────
const PLANS = [
    {
        key:       'free',
        name:      'Free',
        icon:      '🚗',
        desc:      'Get started with basic diagnostics',
        monthlyLKR: 0,
        annualLKR:  0,
        features: [
            { text: '3 vehicle diagnostic chats (lifetime)', included: true  },
            { text: 'Unlimited messages per chat',           included: true  },
            { text: 'Basic AI diagnosis',                    included: true  },
            { text: 'OBD2 fault code lookup',                included: true  },
            { text: 'Image / warning light analysis',        included: false },
            { text: 'More than 3 chats',                     included: false },
            { text: 'Priority AI responses',                 included: false },
            { text: 'Export diagnosis as PDF',               included: false },
        ],
    },
    {
        key:       'pro',
        name:      'Pro',
        icon:      '⚡',
        desc:      'For drivers who need full diagnostics',
        monthlyLKR: 3200,
        annualLKR:  31900,
        popular:    true,
        features: [
            { text: '50 diagnostic chats / month',           included: true  },
            { text: 'Unlimited messages per chat',           included: true  },
            { text: 'Advanced AI diagnosis',                 included: true  },
            { text: 'Image / warning light analysis',        included: true  },
            { text: 'Full chat history',                     included: true  },
            { text: 'OBD2 code deep-dive',                   included: true  },
            { text: 'Unlimited chats',                       included: false },
            { text: 'Export diagnosis as PDF',               included: false },
        ],
    },
    {
        key:       'ultra',
        name:      'Ultra',
        icon:      '🔥',
        desc:      'Unlimited everything for power users',
        monthlyLKR: 6400,
        annualLKR:  63900,
        features: [
            { text: 'Unlimited diagnostic chats',            included: true },
            { text: 'Unlimited messages per chat',           included: true },
            { text: 'Advanced AI diagnosis',                 included: true },
            { text: 'Image / warning light analysis',        included: true },
            { text: 'Full chat history forever',             included: true },
            { text: 'OBD2 code deep-dive',                   included: true },
            { text: 'Priority AI responses',                 included: true },
            { text: 'Export diagnosis as PDF',               included: true },
        ],
    },
];

const FAQ = [
    { q: 'Can I cancel anytime?',               a: 'Yes — cancel anytime from your account settings. You keep access until the end of your billing period.' },
    { q: 'Which payment methods are accepted?', a: 'PayHere supports Visa, Mastercard, Amex, bank transfers, and cash deposits — all major Sri Lankan payment methods accepted.' },
    { q: 'Is there a free plan?',               a: 'Yes! The Free plan lets you create 3 full diagnostic chats with unlimited messages. No credit card needed.' },
    { q: 'What currency is used?',              a: 'All payments are in Sri Lankan Rupees (LKR) via PayHere.' },
    { q: 'Can I upgrade or downgrade?',         a: 'Yes. Upgrades take effect immediately. Downgrades take effect at the end of your current billing cycle.' },
    { q: 'What counts as one chat?',            a: 'Each new vehicle diagnostic session is one chat. You can send unlimited messages within that chat.' },
];

export default function PricingPage() {
    return (
        <ProtectedRoute>
            <Suspense>
                <PricingLayout />
            </Suspense>
        </ProtectedRoute>
    );
}

function PricingLayout() {
    const router       = useRouter();
    const searchParams = useSearchParams();

    const [annual,      setAnnual]      = useState(false);
    const [currentPlan, setCurrentPlan] = useState('free');
    const [loadingPlan, setLoadingPlan] = useState(null);

    useEffect(() => {
        fetchCurrentPlan();
        if (searchParams.get('cancelled') === 'true') {
            toast.error('Payment was cancelled.');
        }
    }, []);

    const fetchCurrentPlan = async () => {
        try {
            const res   = await api.get('/api/subscription/me');
            setCurrentPlan(res.data.subscription?.plan || 'free');
        } catch { /* default stays free */ }
    };

    // Build PayHere form and auto-submit — no redirect to a third-party page picker
    const handleSelectPlan = async (planKey) => {
        if (planKey === 'free' || planKey === currentPlan) return;
        setLoadingPlan(planKey);

        try {
            const billing = annual ? 'annual' : 'monthly';
            const res     = await api.post('/api/subscription/payhere/initiate', {
                plan: planKey,
                billing,
            });

            const { action, params } = res.data;

            // Dynamically create and submit the PayHere form
            const form    = document.createElement('form');
            form.method   = 'POST';
            form.action   = action;
            form.style.display = 'none';

            Object.entries(params).forEach(([key, val]) => {
                const input   = document.createElement('input');
                input.type    = 'hidden';
                input.name    = key;
                input.value   = String(val);
                form.appendChild(input);
            });

            document.body.appendChild(form);
            form.submit();

        } catch (err) {
            console.error('Payment initiation error:', err);
            toast.error('Failed to start payment. Please try again.');
            setLoadingPlan(null);
        }
    };

    const CARD_CLASS  = { free: s.planCardFree,     pro: s.planCardPro,     ultra: s.planCardUltra     };
    const ICON_CLASS  = { free: s.planIconFree,     pro: s.planIconPro,     ultra: s.planIconUltra     };
    const CHECK_CLASS = { free: s.featureCheckFree, pro: s.featureCheckPro, ultra: s.featureCheckUltra };
    const BTN_CLASS   = { free: s.ctaBtnFree,       pro: s.ctaBtnPro,       ultra: s.ctaBtnUltra       };

    return (
        <div className={s.shell}>
            <Sidebar />

            <main className={s.main}>
                <div className={s.content}>

                    {/* ── Hero ── */}
                    <div className={s.hero}>
                        <div className={s.heroEyebrow}>
                            <span className={s.heroEyebrowDot} />
                            Simple pricing
                        </div>
                        <h1 className={s.heroTitle}>
                            Choose your<br />
                            <span className={s.heroTitleAccent}>diagnostic plan</span>
                        </h1>
                        <p className={s.heroSub}>
                            Start free — 3 full vehicle diagnostic sessions, unlimited messages.
                            Upgrade when you need more. Pay securely via PayHere.
                        </p>

                        {/* PayHere badge */}
                        <div className={s.gatewayBadge}>
                            <span className={s.gatewayBadgeIcon}>🏦</span>
                            <span>Secure payments via PayHere · LKR · Cards, Bank Transfer & Cash accepted</span>
                        </div>
                    </div>

                    {/* ── Billing toggle ── */}
                    <div className={s.toggleWrap}>
                        <span className={`${s.toggleLabel} ${!annual ? s.toggleLabelActive : ''}`}>Monthly</span>
                        <button
                            className={`${s.toggle} ${annual ? s.toggleAnnual : ''}`}
                            onClick={() => setAnnual(p => !p)}
                            aria-label="Toggle annual billing"
                        >
                            <div className={`${s.toggleThumb} ${annual ? s.toggleThumbAnnual : ''}`} />
                        </button>
                        <span className={`${s.toggleLabel} ${annual ? s.toggleLabelActive : ''}`}>Annual</span>
                        {annual && <span className={s.saveBadge}>Save ~17%</span>}
                    </div>

                    {/* ── Plans grid ── */}
                    <div className={s.plansGrid}>
                        {PLANS.map(plan => {
                            const isCurrent = plan.key === currentPlan;
                            const isLoading = loadingPlan === plan.key;
                            const priceLKR  = annual ? plan.annualLKR : plan.monthlyLKR;

                            return (
                                <div key={plan.key} className={`${s.planCard} ${CARD_CLASS[plan.key]}`}>
                                    {plan.popular && (
                                        <div className={s.popularBadge}>⭐ Most Popular</div>
                                    )}

                                    {/* Header */}
                                    <div className={s.planHeader}>
                                        <div className={`${s.planIconWrap} ${ICON_CLASS[plan.key]}`}>
                                            {plan.icon}
                                        </div>
                                        <div className={s.planName}>{plan.name}</div>
                                        <div className={s.planDesc}>{plan.desc}</div>
                                    </div>

                                    {/* Price */}
                                    <div className={s.priceBlock}>
                                        {plan.monthlyLKR === 0 ? (
                                            <div className={s.priceFree}>Free</div>
                                        ) : (
                                            <>
                                                <div className={s.priceRow}>
                                                    <span className={s.priceCurrency}>LKR</span>
                                                    <span className={s.priceAmount}>{priceLKR.toLocaleString()}</span>
                                                </div>
                                                <div className={s.pricePeriodLabel}>
                                                    per {annual ? 'year' : 'month'}
                                                </div>
                                                {annual && (
                                                    <div className={s.priceAnnualNote}>
                                                        ≈ LKR {Math.round(plan.annualLKR / 12).toLocaleString()}/mo billed annually
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    {/* Features */}
                                    <ul className={s.featuresList}>
                                        {plan.features.map((f, i) => (
                                            <li key={i} className={`${s.featureItem} ${!f.included ? s.featureDimmed : ''}`}>
                                                <span className={`${s.featureCheck} ${f.included ? CHECK_CLASS[plan.key] : s.featureCheckFree}`}>
                                                    {f.included ? '✓' : '×'}
                                                </span>
                                                {f.text}
                                            </li>
                                        ))}
                                    </ul>

                                    {/* CTA */}
                                    <button
                                        className={`${s.ctaBtn} ${isCurrent ? s.ctaBtnCurrent : BTN_CLASS[plan.key]} ${isLoading ? s.ctaBtnLoading : ''}`}
                                        onClick={() => handleSelectPlan(plan.key)}
                                        disabled={isCurrent || isLoading || plan.key === 'free'}
                                    >
                                        {isLoading ? (
                                            <><span className={s.btnSpinner} /> Redirecting to PayHere...</>
                                        ) : isCurrent ? (
                                            '✓ Current Plan'
                                        ) : plan.key === 'free' ? (
                                            'Always Free'
                                        ) : (
                                            `Pay with PayHere`
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* ── FAQ ── */}
                    <div className={s.faq}>
                        <h2 className={s.faqTitle}>Frequently Asked Questions</h2>
                        {FAQ.map((item, i) => (
                            <div key={i} className={s.faqItem}>
                                <div className={s.faqQ}>{item.q}</div>
                                <div className={s.faqA}>{item.a}</div>
                            </div>
                        ))}
                    </div>

                </div>
            </main>
        </div>
    );
}