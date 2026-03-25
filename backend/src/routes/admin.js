const express     = require('express');
const router      = express.Router();
const verifyToken = require('../middleware/verifyToken');
const { getStats, getUsers } = require('../controllers/adminController');

// ── Admin guard ───────────────────────────────────────────────────────────
// Add your Firebase UID(s) to ADMIN_UIDS in .env  e.g.  ADMIN_UIDS=uid1,uid2
const requireAdmin = (req, res, next) => {
    const adminUids = (process.env.ADMIN_UIDS || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

    if (!adminUids.includes(req.user.uid)) {
        console.warn(`🚫 Admin access denied for uid: ${req.user.uid}`);
        return res.status(403).json({ message: 'Forbidden: Admin access only' });
    }
    next();
};

router.use(verifyToken);
router.use(requireAdmin);

router.get('/stats', getStats);
router.get('/users', getUsers);

module.exports = router;