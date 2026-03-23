const db = require('../config/db');

class Message {

    // ── Save a message (bot or user) ───────────────────────────────────────
    // resource_links is an optional array of { label, url, type } objects
    // stored as JSON in the DB — only bot messages ever have links
    static async create(chat_id, role, content, resource_links = null) {
        const linksJson = (resource_links && resource_links.length > 0)
            ? JSON.stringify(resource_links)
            : null;

        const [result] = await db.query(
            'INSERT INTO messages (chat_id, role, content, resource_links) VALUES (?, ?, ?, ?)',
            [chat_id, role, content, linksJson]
        );

        const [newMessage] = await db.query(
            'SELECT * FROM messages WHERE id = ?',
            [result.insertId]
        );

        const msg = newMessage[0];

        // Parse resource_links JSON back to array before returning
        msg.resource_links = msg.resource_links
            ? JSON.parse(msg.resource_links)
            : [];

        return msg;
    }

    // ── Get all messages for a chat ────────────────────────────────────────
    static async findByChatId(chat_id) {
        const [rows] = await db.query(
            'SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC',
            [chat_id]
        );

        // Parse resource_links JSON for every message
        return rows.map(msg => ({
            ...msg,
            resource_links: msg.resource_links
                ? JSON.parse(msg.resource_links)
                : [],
        }));
    }

    // ── Delete all messages in a chat ──────────────────────────────────────
    static async deleteByChatId(chat_id) {
        await db.query('DELETE FROM messages WHERE chat_id = ?', [chat_id]);
    }
}

module.exports = Message;