const db = require('../config/db');

class User {
    // Create user if not exists (called after Google login)
    static async findOrCreate({ firebase_uid, email, display_name, photo_url }) {
        const [existing] = await db.query(
            'SELECT * FROM users WHERE firebase_uid = ?',
            [firebase_uid]
        );

        if (existing.length > 0) {
            return existing[0];
        }

        const [result] = await db.query(
            'INSERT INTO users (firebase_uid, email, display_name, photo_url) VALUES (?, ?, ?, ?)',
            [firebase_uid, email, display_name, photo_url]
        );

        const [newUser] = await db.query(
            'SELECT * FROM users WHERE id = ?',
            [result.insertId]
        );

        return newUser[0];
    }

    // Get user by firebase uid
    static async findByFirebaseUid(firebase_uid) {
        const [rows] = await db.query(
            'SELECT * FROM users WHERE firebase_uid = ?',
            [firebase_uid]
        );
        return rows[0] || null;
    }
}

module.exports = User;