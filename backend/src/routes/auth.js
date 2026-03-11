const router = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const User = require('../models/User');

// Called after Google login — syncs user to MySQL
router.post('/sync', verifyToken, async (req, res) => {
    try {
        const { uid, email, name, picture } = req.user;

        const user = await User.findOrCreate({
            firebase_uid: uid,
            email: email,
            display_name: name,
            photo_url: picture,
        });

        res.json({ message: 'User synced successfully', user });
    } catch (error) {
        console.error('Auth sync error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;