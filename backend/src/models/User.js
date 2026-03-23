const db = require('../config/db');

class User {

    static async findOrCreate({ firebase_uid, email, display_name, photo_url }) {
        const [existing] = await db.query(
            'SELECT * FROM users WHERE firebase_uid = ?',
            [firebase_uid]
        );

        if (existing.length > 0) return existing[0];

        const [result] = await db.query(
            `INSERT INTO users
                 (firebase_uid, email, display_name, photo_url, plan, plan_status)
             VALUES (?, ?, ?, ?, 'free', 'active')`,
            [firebase_uid, email, display_name, photo_url]
        );

        const [newUser] = await db.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
        return newUser[0];
    }

    static async findByFirebaseUid(firebase_uid) {
        const [rows] = await db.query('SELECT * FROM users WHERE firebase_uid = ?', [firebase_uid]);
        return rows[0] || null;
    }

    static async findById(id) {
        const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
        return rows[0] || null;
    }

    static async findByStripeCustomerId(stripeCustomerId) {
        const [rows] = await db.query('SELECT * FROM users WHERE stripe_customer_id = ?', [stripeCustomerId]);
        return rows[0] || null;
    }

    // ── Plan limits ─────────────────────────────────────────────────────────
    // free:  3 chats lifetime, unlimited messages, NO image upload
    // pro:   50 chats/month,   unlimited messages, image upload ✓
    // ultra: unlimited chats,  unlimited messages, image upload ✓
    static getPlanLimits(plan) {
        const limits = {
            free: {
                chats:          3,
                chatsPerMonth:  false,   // false = lifetime count
                messagesPerChat: -1,     // unlimited — no message cap on free
                imageAnalysis:  false,   // blocked on free
            },
            pro: {
                chats:          50,
                chatsPerMonth:  true,    // rolling 30-day window
                messagesPerChat: -1,     // unlimited
                imageAnalysis:  true,
            },
            ultra: {
                chats:          -1,      // unlimited
                chatsPerMonth:  true,
                messagesPerChat: -1,     // unlimited
                imageAnalysis:  true,
            },
        };
        return limits[plan] || limits.free;
    }

    // Free  → counts ALL chats ever (lifetime cap of 3)
    // Pro   → counts chats in last 30 days
    // Ultra → always false (unlimited)
    static async hasReachedChatLimit(userId) {
        const user = await this.findById(userId);
        if (!user) return true;

        const limits = this.getPlanLimits(user.plan);
        if (limits.chats === -1) return false;

        const query  = limits.chatsPerMonth
            ? `SELECT COUNT(*) as count FROM chats WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
            : `SELECT COUNT(*) as count FROM chats WHERE user_id = ?`;

        const [rows] = await db.query(query, [userId]);
        return rows[0].count >= limits.chats;
    }

    // Always returns false now since all plans have unlimited messages
    // Kept for future use if needed
    static async hasReachedMessageLimit(userId, chatId) {
        const user = await this.findById(userId);
        if (!user) return true;

        const limits = this.getPlanLimits(user.plan);
        if (limits.messagesPerChat === -1) return false; // all plans unlimited

        const [rows] = await db.query(
            `SELECT COUNT(*) as count FROM messages WHERE chat_id = ? AND role = 'user'`,
            [chatId]
        );
        return rows[0].count >= limits.messagesPerChat;
    }

    static canUseImageAnalysis(plan) {
        return this.getPlanLimits(plan).imageAnalysis;
    }
}

module.exports = User;