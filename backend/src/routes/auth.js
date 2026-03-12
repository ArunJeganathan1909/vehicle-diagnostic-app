const router = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const { syncUser, getMe } = require('../controllers/authController');

// POST /api/auth/sync — called after Google login to create/find user in MySQL
router.post('/sync', verifyToken, syncUser);

// GET /api/auth/me — get current user's DB record
router.get('/me', verifyToken, getMe);

module.exports = router;