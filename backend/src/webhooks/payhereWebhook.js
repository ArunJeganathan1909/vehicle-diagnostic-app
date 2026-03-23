const crypto       = require('crypto');
const db           = require('../config/db');
const Subscription = require('../models/Subscription');

// POST /api/subscription/payhere/notify
// PayHere sends a form-encoded POST to this URL after every payment
// This must be publicly accessible — use ngrok for local testing
const payhereNotify = async (req, res) => {
    try {
        const {
            merchant_id,
            order_id,
            payhere_amount,
            payhere_currency,
            status_code,
            md5sig,
            custom_1,              // user_id
            custom_2,              // plan|billing e.g. "pro|monthly"
            payment_id,
            recurring_payment_id,
        } = req.body;

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔔  PAYHERE NOTIFY RECEIVED');
        console.log(`  Order   : ${order_id}`);
        console.log(`  Status  : ${status_code}`);
        console.log(`  Amount  : ${payhere_currency} ${payhere_amount}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // ── Verify PayHere MD5 hash ──────────────────────────────────────
        const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
        const hashedSecret   = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
        const expectedSig    = crypto.createHash('md5')
            .update(`${merchant_id}${order_id}${payhere_amount}${payhere_currency}${status_code}${hashedSecret}`)
            .digest('hex')
            .toUpperCase();

        if (md5sig !== expectedSig) {
            console.error('❌ PayHere hash mismatch — rejected');
            return res.status(400).send('Invalid signature');
        }

        // ── Handle non-success statuses ──────────────────────────────────
        // 2 = success, 0 = pending, -1 = cancelled, -2 = failed, -3 = chargedback
        if (status_code !== '2') {
            const statusMap = { '0': 'pending', '-1': 'cancelled', '-2': 'failed', '-3': 'failed' };
            const newStatus = statusMap[status_code] || 'failed';

            await db.execute(
                `UPDATE subscriptions SET status = ? WHERE gateway_order_id = ?`,
                [newStatus, order_id]
            );

            console.log(`⚠️  PayHere non-success: status_code=${status_code} (${newStatus}) order=${order_id}`);
            return res.send('OK');
        }

        // ── Payment confirmed (status_code === '2') ───────────────────────
        const userId             = parseInt(custom_1);
        const [planStr, billing] = (custom_2 || '').split('|');

        if (!userId || !planStr || !billing) {
            console.error('❌ Missing custom fields in PayHere notify');
            return res.status(400).send('Missing custom fields');
        }

        // Calculate expiry based on billing cycle
        const expiresAt = new Date();
        if (billing === 'annual') expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        else                      expiresAt.setMonth(expiresAt.getMonth() + 1);

        // Activate the plan
        await Subscription.activatePlan(userId, {
            plan:             planStr,
            billingCycle:     billing,
            gatewayOrderId:   recurring_payment_id || order_id,
            gatewayPaymentId: payment_id || order_id,
            amount:           payhere_amount,
            currency:         payhere_currency,
            expiresAt,
        });

        // Update the pending row to active
        await db.execute(
            `UPDATE subscriptions
             SET status = 'active', started_at = NOW(), expires_at = ?
             WHERE gateway_order_id = ? AND status = 'pending'`,
            [expiresAt, order_id]
        );

        console.log(`✅ PayHere payment confirmed: user=${userId} plan=${planStr}/${billing} expires=${expiresAt}`);
        res.send('OK');

    } catch (err) {
        console.error('❌ PayHere notify error:', err);
        res.status(500).send('Error');
    }
};

module.exports = { payhereNotify };