const stripe       = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db           = require('../config/db');
const Subscription = require('../models/Subscription');

// POST /api/subscription/stripe/webhook
// IMPORTANT: This route must use express.raw() — NOT express.json()
// Mount it in app.js BEFORE the express.json() middleware
const stripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    // Verify webhook signature
    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('❌ Stripe webhook signature failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`🔔 Stripe webhook received: ${event.type}`);

    try {
        switch (event.type) {

            // ── Payment successful — activate plan ───────────────────────
            case 'checkout.session.completed': {
                const session  = event.data.object;
                const userId   = parseInt(session.metadata.user_id);
                const plan     = session.metadata.plan;
                const billing  = session.metadata.billing;
                const subId    = session.subscription;

                // Fetch full Stripe subscription to get period_end date
                const stripeSub = await stripe.subscriptions.retrieve(subId);
                const expiresAt = new Date(stripeSub.current_period_end * 1000);
                const amountPaid = (session.amount_total / 100).toFixed(2);

                await Subscription.activatePlan(userId, {
                    plan,
                    billingCycle:          billing,
                    gateway:               'stripe',
                    gatewaySubscriptionId: subId,
                    gatewayPaymentId:      session.payment_intent,
                    amount:                amountPaid,
                    currency:              session.currency.toUpperCase(),
                    expiresAt,
                });

                console.log(`✅ Stripe plan activated: user=${userId} plan=${plan} expires=${expiresAt}`);
                break;
            }

            // ── Renewal invoice paid — extend expiry ─────────────────────
            case 'invoice.paid': {
                const invoice   = event.data.object;
                const subId     = invoice.subscription;
                const stripeSub = await stripe.subscriptions.retrieve(subId);
                const expiresAt = new Date(stripeSub.current_period_end * 1000);
                const userId    = stripeSub.metadata?.user_id;

                if (userId) {
                    await db.execute(
                        `UPDATE users
                         SET plan_expires_at = ?, plan_status = 'active'
                         WHERE id = ?`,
                        [expiresAt, parseInt(userId)]
                    );
                    await db.execute(
                        `UPDATE subscriptions
                         SET expires_at = ?, status = 'active'
                         WHERE gateway_subscription_id = ?`,
                        [expiresAt, subId]
                    );
                    console.log(`🔄 Stripe renewal: user=${userId} new_expiry=${expiresAt}`);
                }
                break;
            }

            // ── Subscription deleted — downgrade to free ─────────────────
            case 'customer.subscription.deleted': {
                const sub = event.data.object;
                await Subscription.cancelPlan(null, sub.id);
                console.log(`❌ Stripe subscription deleted: ${sub.id}`);
                break;
            }

            // ── Payment failed — mark as expired ─────────────────────────
            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                const subId   = invoice.subscription;
                await db.execute(
                    `UPDATE users SET plan_status = 'expired'
                     WHERE stripe_subscription_id = ?`,
                    [subId]
                );
                console.log(`❌ Stripe payment failed: subscription=${subId}`);
                break;
            }

            default:
                // Unhandled event — ignore silently
                break;
        }

        res.json({ received: true });

    } catch (err) {
        console.error('❌ Stripe webhook handler error:', err);
        res.status(500).json({ error: 'Webhook handler failed' });
    }
};

module.exports = { stripeWebhook };