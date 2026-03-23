'use client';

import { useRouter } from 'next/navigation';
import s from '@/styles/UpgradePrompt.module.css';

export default function UpgradePrompt({ type, onClose }) {
    const router = useRouter();

    const CONTENT = {
        CHAT_LIMIT_REACHED: {
            icon:  '🚗',
            title: "You've used all 3 free chats",
            desc:  'The free plan includes 3 vehicle diagnostic chats. Upgrade to Pro for 50 chats/month with full image analysis.',
            cta:   'Upgrade to Pro — LKR 3,200/mo',
        },
        IMAGE_ANALYSIS_NOT_AVAILABLE: {
            icon:  '📷',
            title: 'Image analysis is a paid feature',
            desc:  'Upload dashboard photos and warning light images on Pro or Ultra. Our AI instantly identifies what every warning light means.',
            cta:   'Upgrade to unlock image analysis',
        },
    };

    const c = CONTENT[type] || CONTENT.CHAT_LIMIT_REACHED;

    const COMPARE = [
        { label: 'Vehicle chats',  free: '3 total',   pro: '50/month',  ultra: 'Unlimited' },
        { label: 'Messages/chat',  free: 'Unlimited',  pro: 'Unlimited', ultra: 'Unlimited' },
        { label: 'Image analysis', free: '✕',          pro: '✓',         ultra: '✓'         },
        { label: 'OBD2 deep-dive', free: 'Basic',      pro: 'Full',      ultra: 'Full'      },
    ];

    return (
        <div className={s.overlay} onClick={onClose}>
            <div className={s.card} onClick={e => e.stopPropagation()}>
                <button className={s.closeBtn} onClick={onClose}>✕</button>

                <div className={s.iconWrap}>{c.icon}</div>
                <h3 className={s.title}>{c.title}</h3>
                <p className={s.desc}>{c.desc}</p>

                {/* Plan comparison */}
                <div className={s.compare}>
                    <div className={s.compareHeader}>
                        <span />
                        <span className={s.compareHeadFree}>Free</span>
                        <span className={s.compareHeadPro}>Pro</span>
                        <span className={s.compareHeadUltra}>Ultra</span>
                    </div>
                    {COMPARE.map(row => (
                        <div key={row.label} className={s.compareRow}>
                            <span className={s.compareLabel}>{row.label}</span>
                            <span className={`${s.compareVal} ${s.compareFree}`}>{row.free}</span>
                            <span className={`${s.compareVal} ${s.comparePro}`}>{row.pro}</span>
                            <span className={`${s.compareVal} ${s.compareUltra}`}>{row.ultra}</span>
                        </div>
                    ))}
                </div>

                {/* PayHere note */}
                <div className={s.payhereNote}>
                    🏦 Secure payment via PayHere · LKR · Cards & Bank Transfer
                </div>

                <button className={s.ctaBtn} onClick={() => { onClose(); router.push('/pricing'); }}>
                    {c.cta} →
                </button>
                <button className={s.skipBtn} onClick={onClose}>Maybe later</button>
            </div>
        </div>
    );
}