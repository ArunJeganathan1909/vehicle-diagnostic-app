const User = require('../models/User');

// POST /api/auth/sync
const syncUser = async (req, res) => {
    try {
        const { uid, email, name, picture } = req.user;

        if (!uid || !email) {
            return res.status(400).json({ message: 'Missing required user fields from token' });
        }

        // Check if user already exists before create
        const existing = await User.findByFirebaseUid(uid);
        const isNewUser = !existing;

        const user = await User.findOrCreate({
            firebase_uid: uid,
            email: email,
            display_name: name || email.split('@')[0],
            photo_url: picture || null,
        });

        if (isNewUser) {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('✅  NEW USER CREATED');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('  ID           :', user.id);
            console.log('  Firebase UID :', user.firebase_uid);
            console.log('  Name         :', user.display_name);
            console.log('  Email        :', user.email);
            console.log('  Photo        :', user.photo_url);
            console.log('  Created At   :', user.created_at);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        } else {
            console.log(`👤 Existing user synced: [${user.id}] ${user.display_name} <${user.email}>`);
        }

        res.json({
            message: isNewUser ? 'User created successfully' : 'User synced successfully',
            isNewUser,
            user: {
                id: user.id,
                firebase_uid: user.firebase_uid,
                display_name: user.display_name,
                email: user.email,
                photo_url: user.photo_url,
                created_at: user.created_at,
            },
        });
    } catch (error) {
        console.error('❌ Auth sync error:', error);
        res.status(500).json({ message: 'Server error during user sync' });
    }
};

// GET /api/auth/me
const getMe = async (req, res) => {
    try {
        const user = await User.findByFirebaseUid(req.user.uid);
        if (!user) {
            return res.status(404).json({ message: 'User not found — try logging in again' });
        }

        console.log(`🔍 /me requested by: [${user.id}] ${user.display_name} <${user.email}>`);

        res.json({ user });
    } catch (error) {
        console.error('❌ Get me error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { syncUser, getMe };