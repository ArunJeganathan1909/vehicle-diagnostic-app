const db = require('../config/db');

class Chat {
    // Create a new chat session
    static async create(user_id) {
        const [result] = await db.query(
            'INSERT INTO chats (user_id, title) VALUES (?, ?)',
            [user_id, 'New Vehicle Chat']
        );

        const [newChat] = await db.query(
            'SELECT * FROM chats WHERE id = ?',
            [result.insertId]
        );

        return newChat[0];
    }

    // Get all chats for a user
    static async findByUserId(user_id) {
        const [rows] = await db.query(
            'SELECT * FROM chats WHERE user_id = ? ORDER BY created_at DESC',
            [user_id]
        );
        return rows;
    }

    // Get single chat by id
    static async findById(chat_id) {
        const [rows] = await db.query(
            'SELECT * FROM chats WHERE id = ?',
            [chat_id]
        );
        return rows[0] || null;
    }

    // Update vehicle info once bot collects it
    static async updateVehicleInfo(chat_id, { vehicle_brand, vehicle_model, vehicle_year }) {
        await db.query(
            'UPDATE chats SET vehicle_brand = ?, vehicle_model = ?, vehicle_year = ?, title = ? WHERE id = ?',
            [
                vehicle_brand,
                vehicle_model,
                vehicle_year,
                `${vehicle_brand} ${vehicle_model} ${vehicle_year}`,
                chat_id,
            ]
        );

        return await Chat.findById(chat_id);
    }

    // Mark chat as resolved
    static async resolve(chat_id) {
        await db.query(
            'UPDATE chats SET status = ? WHERE id = ?',
            ['resolved', chat_id]
        );
        return await Chat.findById(chat_id);
    }

    // Delete a chat
    static async delete(chat_id) {
        await db.query('DELETE FROM chats WHERE id = ?', [chat_id]);
    }
}

module.exports = Chat;