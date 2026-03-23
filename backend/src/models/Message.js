const db = require('../config/db');

class Message {

    static async create(chat_id, role, content, resource_links = null) {
        // ── Safely serialize resource_links to JSON string ─────────────────
        // resource_links arrives as a JS array from axios (already parsed)
        // We must stringify it cleanly before storing in MySQL JSON column
        let linksJson = null;
        if (Array.isArray(resource_links) && resource_links.length > 0) {
            try {
                // JSON.stringify on a real JS array always produces valid JSON
                linksJson = JSON.stringify(resource_links);
            } catch (e) {
                console.warn('⚠️  Could not stringify resource_links:', e.message);
                linksJson = null;
            }
        }

        const [result] = await db.query(
            'INSERT INTO messages (chat_id, role, content, resource_links) VALUES (?, ?, ?, ?)',
            [chat_id, role, content, linksJson]
        );

        const [newMessage] = await db.query(
            'SELECT * FROM messages WHERE id = ?',
            [result.insertId]
        );

        const msg = newMessage[0];

        // Parse resource_links back to array before returning
        msg.resource_links = _parseLinks(msg.resource_links);

        return msg;
    }

    static async findByChatId(chat_id) {
        const [rows] = await db.query(
            'SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC',
            [chat_id]
        );

        return rows.map(msg => ({
            ...msg,
            resource_links: _parseLinks(msg.resource_links),
        }));
    }

    static async deleteByChatId(chat_id) {
        await db.query('DELETE FROM messages WHERE chat_id = ?', [chat_id]);
    }
}

// ── Helper: safely parse whatever MySQL returns for resource_links ──────────
// MySQL JSON column can return:
//   - null          → return []
//   - a JS array    → already parsed by mysql2 driver (common with JSON columns)
//   - a JSON string → parse it
//   - "[object Object]" string → broken, return []
function _parseLinks(value) {
    if (!value) return [];

    // mysql2 with JSON columns sometimes auto-parses to JS array
    if (Array.isArray(value)) return value;

    // It's a string — check if it looks like valid JSON before parsing
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) {
            // Not JSON — likely "[object Object]" corruption
            console.warn('⚠️  resource_links contains invalid string:', trimmed.substring(0, 50));
            return [];
        }
        try {
            const parsed = JSON.parse(trimmed);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.warn('⚠️  resource_links JSON.parse failed:', e.message);
            return [];
        }
    }

    return [];
}

module.exports = Message;