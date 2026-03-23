const crypto       = require('crypto');
const db           = require('../config/db');
const Subscription = require('../models/Subscription');

// ── Plan pricing config ────────────────────────────────────────────────────
const PLANS = {
    pro: {
        name: 'Pro',
        monthly: { amount_lkr: 3200  },
        annual:  { amount_lkr: 31900 },
    },
    ultra: {
        name: 'Ultra',
        monthly: { amount_lkr: 6400  },
        annual:  { amount_lkr: 63900 },
    },
};

// ── GET /api/subscription/plans ────────────────────────────────────────────
const getPlans = async (req, res) => {
    try {
        let currentPlan = 'free';
        if (req.user) {
            const sub   = await Subscription.getByUserId(req.user.id);
            currentPlan = sub?.plan || 'free';
        }
        res.json({ plans: PLANS, currentPlan });
    } catch (err) {
        console.error('getPlans error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ── GET /api/subscription/me ───────────────────────────────────────────────
const getMySubscription = async (req, res) => {
    try {
        const sub = await Subscription.getByUserId(req.user.id);
        res.json({ subscription: sub });
    } catch (err) {
        console.error('getMySubscription error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ── POST /api/subscription/payhere/initiate ────────────────────────────────
// Body: { plan: 'pro'|'ultra', billing: 'monthly'|'annual' }
// Returns { action, params } — frontend builds a form and submits it
const initiatePayhere = async (req, res) => {
    try {
        const { plan, billing } = req.body;

        if (!PLANS[plan]?.[billing]) {
            return res.status(400).json({ message: 'Invalid plan or billing cycle' });
        }

        const user           = req.user;
        const planConfig     = PLANS[plan][billing];
        const orderId        = `AD-${user.id}-${Date.now()}`;
        const amount         = planConfig.amount_lkr.toFixed(2);
        const currency       = 'LKR';
        const merchantId     = process.env.PAYHERE_MERCHANT_ID;
        const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;

        // PayHere hash: MD5( merchant_id + order_id + amount + currency + MD5(secret).toUpperCase() )
        const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
        const hash = crypto.createHash('md5')
            .update(`${merchantId}${orderId}${amount}${currency}${hashedSecret}`)
            .digest('hex')
            .toUpperCase();

        // Save as pending before redirecting user
        await db.execute(
            `INSERT INTO subscriptions
                (user_id, plan, billing_cycle, gateway, gateway_order_id, amount, currency, status)
             VALUES (?, ?, ?, 'payhere', ?, ?, ?, 'pending')`,
            [user.id, plan, billing, orderId, planConfig.amount_lkr, currency]
        );

        const isSandbox = process.env.PAYHERE_SANDBOX === 'true';

        const params = {
            merchant_id:  merchantId,
            return_url:   `${process.env.FRONTEND_URL}/pricing-success?order_id=${orderId}`,
            cancel_url:   `${process.env.FRONTEND_URL}/pricing?cancelled=true`,
            notify_url:   `${process.env.BACKEND_URL}/api/subscription/payhere/notify`,
            order_id:     orderId,
            items:        `AutoDiag ${PLANS[plan].name} Plan (${billing})`,
            currency,
            amount,
            first_name:   user.display_name?.split(' ')[0] || 'User',
            last_name:    user.display_name?.split(' ').slice(1).join(' ') || '',
            email:        user.email,
            phone:        '0771234567',
            address:      'N/A',
            city:         'Colombo',
            country:      'Sri Lanka',
            // Recurring subscription fields
            recurrence:   billing === 'monthly' ? '1 Month' : '1 Year',
            duration:     'Forever',
            startup_fee:  '0',
            // Custom fields — used in notify webhook to identify user + plan
            custom_1:     String(user.id),
            custom_2:     `${plan}|${billing}`,
            hash,
        };

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('💳  PAYHERE CHECKOUT INITIATED');
        console.log(`  User    : [${user.id}] ${user.display_name}`);
        console.log(`  Plan    : ${plan} / ${billing}`);
        console.log(`  Amount  : LKR ${amount}`);
        console.log(`  Order   : ${orderId}`);
        console.log(`  Sandbox : ${isSandbox}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        res.json({
            action: isSandbox
                ? 'https://sandbox.payhere.lk/pay/checkout'
                : 'https://www.payhere.lk/pay/checkout',
            params,
        });

    } catch (err) {
        console.error('initiatePayhere error:', err);
        res.status(500).json({ message: 'Failed to initiate PayHere payment' });
    }
};

// ── POST /api/subscription/cancel ─────────────────────────────────────────
const cancelSubscription = async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT plan FROM users WHERE id = ?',
            [req.user.id]
        );

        if (!rows[0] || rows[0].plan === 'free') {
            return res.status(400).json({ message: 'No active subscription to cancel' });
        }

        await Subscription.cancelPlan(req.user.id);

        console.log(`⚠️  Subscription cancelled: user=${req.user.id}`);
        res.json({ message: 'Subscription cancelled. You keep access until the end of your billing period.' });

    } catch (err) {
        console.error('cancelSubscription error:', err);
        res.status(500).json({ message: 'Failed to cancel subscription' });
    }
};

module.exports = {
    getPlans,
    getMySubscription,
    initiatePayhere,
    cancelSubscription,
};