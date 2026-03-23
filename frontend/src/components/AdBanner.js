'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import s from '@/styles/AdBanner.module.css';

// Plans that see ads — Ultra users are ad-free
const ADS_PLANS = ['free', 'pro'];

// Your AdSense publisher ID and slot IDs
// Replace these with your real values from Google AdSense dashboard
const ADSENSE_CLIENT  = 'ca-pub-5030474082686075';   // ← your publisher ID
const SLOT_VERTICAL   = '3718247793';                 // ← vertical 160x600 slot
const SLOT_RECTANGLE  = '2405166120';                 // ← medium rectangle 300x250 slot

export default function AdBanner({ slot = 'vertical' }) {
    const { user }    = useAuth();
    const adRef       = useRef(null);
    const initialized = useRef(false);

    // Read plan from user context — default to 'free' if not loaded yet
    const plan = user?.plan || 'free';

    // Don't render for Ultra users or if user not loaded
    if (!ADS_PLANS.includes(plan)) return null;

    return (
        <aside className={s.panel}>
            {/* Upgrade nudge at top */}
            <div className={s.nudge}>
                <span className={s.nudgeIcon}>💎</span>
                <div>
                    <div className={s.nudgeTitle}>Go Ultra</div>
                    <div className={s.nudgeSub}>Remove ads forever</div>
                </div>
                <a href="/pricing" className={s.nudgeBtn}>Upgrade</a>
            </div>

            {/* Ad slot */}
            <div className={s.adWrap}>
                <div className={s.adLabel}>Advertisement</div>
                <AdSlot slotId={slot === 'vertical' ? SLOT_VERTICAL : SLOT_RECTANGLE} slot={slot} />
            </div>

            {/* Second ad slot — rectangle below */}
            <div className={s.adWrap}>
                <div className={s.adLabel}>Sponsored</div>
                <AdSlot slotId={SLOT_RECTANGLE} slot="rectangle" />
            </div>
        </aside>
    );
}

// ── Individual ad slot ────────────────────────────────────────────────────────
function AdSlot({ slotId, slot }) {
    const adRef       = useRef(null);
    const initialized = useRef(false);

    useEffect(() => {
        // Only push once per mount
        if (initialized.current) return;
        initialized.current = true;

        try {
            // AdSense push — works in production when script is loaded
            if (typeof window !== 'undefined' && window.adsbygoogle) {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            }
        } catch (e) {
            console.warn('AdSense push failed:', e);
        }
    }, []);

    const isDev = process.env.NODE_ENV === 'development';

    // In development — show a placeholder so you can see the layout
    if (isDev) {
        return (
            <div className={`${s.placeholder} ${slot === 'vertical' ? s.placeholderVertical : s.placeholderRect}`}>
                <div className={s.placeholderInner}>
                    <div className={s.placeholderIcon}>📢</div>
                    <div className={s.placeholderText}>
                        Google Ad
                        <span className={s.placeholderSize}>
                            {slot === 'vertical' ? '160×600' : '300×250'}
                        </span>
                    </div>
                    <div className={s.placeholderNote}>Shows in production</div>
                </div>
            </div>
        );
    }

    // Production — real AdSense slot
    return (
        <ins
            ref={adRef}
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client={`ca-pub-5030474082686075`}
            data-ad-slot={slotId}
            data-ad-format={slot === 'vertical' ? 'vertical' : 'rectangle'}
            data-full-width-responsive="false"
        />
    );
}