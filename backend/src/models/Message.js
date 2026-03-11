const db = require('../config/db');

class Message {
    // Save a message (bot or user)
    static async create(chat_id, role, content) {
        const [result] = await db.query(
            'INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)',
            [chat_id, role, content]
        );

        const [newMessage] = await db.query(
            'SELECT * FROM messages WHERE id = ?',
            [result.insertId]
        );

        return newMessage[0];
    }

    // Get all messages for a chat (for conversation history)
    static async findByChatId(chat_id) {
        const [rows] = await db.query(
            'SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC',
            [chat_id]
        );
        return rows;
    }

    // Delete all messages in a chat
    static async deleteByChatId(chat_id) {
        await db.query('DELETE FROM messages WHERE chat_id = ?', [chat_id]);
    }
}

module.exports = Message;
