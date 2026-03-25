const db = require('../config/db');

// GET /api/admin/stats
const getStats = async (req, res) => {
    try {
        const [[{ totalUsers }]]     = await db.query('SELECT COUNT(*) AS totalUsers FROM users');
        const [[{ totalChats }]]     = await db.query('SELECT COUNT(*) AS totalChats FROM chats');
        const [[{ activeChats }]]    = await db.query("SELECT COUNT(*) AS activeChats FROM chats WHERE status != 'resolved'");
        const [[{ resolvedChats }]]  = await db.query("SELECT COUNT(*) AS resolvedChats FROM chats WHERE status = 'resolved'");
        const [[{ totalMessages }]]  = await db.query('SELECT COUNT(*) AS totalMessages FROM messages');
        const [[{ subscribedUsers }]]= await db.query("SELECT COUNT(*) AS subscribedUsers FROM users WHERE plan IN ('pro','ultra')");
        const [[{ newUsers30d }]]    = await db.query('SELECT COUNT(*) AS newUsers30d FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)');
        const [[{ newChats30d }]]    = await db.query('SELECT COUNT(*) AS newChats30d FROM chats WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)');
        const [[{ totalRevenueLKR }]]= await db.query("SELECT COALESCE(SUM(amount),0) AS totalRevenueLKR FROM subscriptions WHERE status IN ('active','completed')");

        const [planRows] = await db.query('SELECT plan, COUNT(*) AS count FROM users GROUP BY plan');
        const planBreakdown = { free: 0, pro: 0, ultra: 0 };
        planRows.forEach(r => { planBreakdown[r.plan] = Number(r.count); });

        const [recentUsers] = await db.query(
            'SELECT id, display_name, email, plan, plan_status, created_at FROM users ORDER BY created_at DESC LIMIT 10'
        );

        const [dailySignups] = await db.query(`
            SELECT DATE(created_at) AS date, COUNT(*) AS count
            FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
            GROUP BY DATE(created_at) ORDER BY date ASC
        `);

        const [dailyChats] = await db.query(`
            SELECT DATE(created_at) AS date, COUNT(*) AS count
            FROM chats WHERE created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
            GROUP BY DATE(created_at) ORDER BY date ASC
        `);

        console.log(`📊 Admin stats fetched by uid: ${req.user.uid}`);

        res.json({
            stats: {
                totalUsers:      Number(totalUsers),
                totalChats:      Number(totalChats),
                activeChats:     Number(activeChats),
                resolvedChats:   Number(resolvedChats),
                totalMessages:   Number(totalMessages),
                subscribedUsers: Number(subscribedUsers),
                newUsers30d:     Number(newUsers30d),
                newChats30d:     Number(newChats30d),
                totalRevenueLKR: parseFloat(totalRevenueLKR),
                planBreakdown,
            },
            recentUsers,
            dailySignups,
            dailyChats,
        });
    } catch (err) {
        console.error('❌ Admin getStats error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// GET /api/admin/users?page=1&limit=20&search=
const getUsers = async (req, res) => {
    try {
        const page   = Math.max(1, parseInt(req.query.page)  || 1);
        const limit  = Math.min(50, parseInt(req.query.limit) || 20);
        const offset = (page - 1) * limit;
        const search = `%${req.query.search || ''}%`;

        const [users] = await db.query(
            `SELECT id, display_name, email, plan, plan_status, created_at
             FROM users
             WHERE display_name LIKE ? OR email LIKE ?
             ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [search, search, limit, offset]
        );

        const [[{ total }]] = await db.query(
            'SELECT COUNT(*) AS total FROM users WHERE display_name LIKE ? OR email LIKE ?',
            [search, search]
        );

        res.json({ users, total: Number(total), page, limit });
    } catch (err) {
        console.error('❌ Admin getUsers error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getStats, getUsers };