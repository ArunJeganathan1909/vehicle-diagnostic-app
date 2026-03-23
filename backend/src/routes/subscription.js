const express     = require('express');
const router      = express.Router();
const verifyToken = require('../middleware/verifyToken');
const {
    getPlans,
    getMySubscription,
    initiatePayhere,
    cancelSubscription,
} = require('../controllers/subscriptionController');
const { payhereNotify } = require('../webhooks/payhereWebhook');

// ── PayHere notify — form-encoded body, no auth needed ───────────────────
// PayHere calls this server-to-server after payment
router.post(
    '/payhere/notify',
    express.urlencoded({ extended: false }),
    payhereNotify
);

// ── Public ────────────────────────────────────────────────────────────────
router.get('/plans', getPlans);

// ── Protected (Firebase token required) ──────────────────────────────────
router.use(verifyToken);

router.get('/me',                getMySubscription);
router.post('/payhere/initiate', initiatePayhere);
router.post('/cancel',           cancelSubscription);

module.exports = router;