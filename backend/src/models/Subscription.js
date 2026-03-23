const db = require('../config/db');

const Subscription = {

    // ── Get user's subscription info ───────────────────────────────────────
    async getByUserId(userId) {
        const [rows] = await db.execute(
            `SELECT plan, plan_status, billing_cycle,
                    plan_expires_at, plan_started_at, payhere_order_id
             FROM users WHERE id = ?`,
            [userId]
        );
        return rows[0] || null;
    },

    // ── Activate plan after PayHere payment confirmed ──────────────────────
    async activatePlan(userId, { plan, billingCycle, gatewayOrderId, gatewayPaymentId, amount, currency, expiresAt }) {
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            // Update users table
            await conn.execute(
                `UPDATE users SET
                                  plan              = ?,
                                  plan_status       = 'active',
                                  billing_cycle     = ?,
                                  plan_started_at   = NOW(),
                                  plan_expires_at   = ?,
                                  payhere_order_id  = ?
                 WHERE id = ?`,
                [plan, billingCycle, expiresAt, gatewayOrderId, userId]
            );

            // Insert subscription history record
            await conn.execute(
                `INSERT INTO subscriptions
                 (user_id, plan, billing_cycle, gateway, gateway_order_id,
                  gateway_payment_id, amount, currency, status, started_at, expires_at)
                 VALUES (?, ?, ?, 'payhere', ?, ?, ?, ?, 'active', NOW(), ?)`,
                [userId, plan, billingCycle, gatewayOrderId,
                    gatewayPaymentId, amount, currency, expiresAt]
            );

            await conn.commit();
            console.log(`✅ Plan activated: user=${userId} plan=${plan} billing=${billingCycle} expires=${expiresAt}`);
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    },

    // ── Cancel plan — downgrade to free ────────────────────────────────────
    async cancelPlan(userId) {
        await db.execute(
            `UPDATE users SET
                plan              = 'free',
                plan_status       = 'cancelled',
                billing_cycle     = NULL,
                plan_expires_at   = NULL,
                payhere_order_id  = NULL
             WHERE id = ?`,
            [userId]
        );

        // Mark latest active subscription as cancelled
        await db.execute(
            `UPDATE subscriptions SET status = 'cancelled', cancelled_at = NOW()
             WHERE user_id = ? AND status = 'active'
             ORDER BY created_at DESC LIMIT 1`,
            [userId]
        );

        console.log(`⚠️  Plan cancelled: user=${userId}`);
    },
};

module.exports = Subscription;