const Chat    = require('../models/Chat');
const Message = require('../models/Message');
const User    = require('../models/User');

// GET /api/chats
const getChats = async (req, res) => {
    try {
        const user = await User.findByFirebaseUid(req.user.uid);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const chats = await Chat.findByUserId(user.id);

        console.log(`📋 Chats fetched: User [${user.id}] ${user.display_name} — ${chats.length} chat(s) — plan: ${user.plan}`);

        res.json({ chats });
    } catch (error) {
        console.error('❌ Get chats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// POST /api/chats
const createChat = async (req, res) => {
    try {
        const user = await User.findByFirebaseUid(req.user.uid);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // ── Plan limit check ──────────────────────────────────────────────
        const limitReached = await User.hasReachedChatLimit(user.id);
        if (limitReached) {
            const limits     = User.getPlanLimits(user.plan);
            const isFreePlan = user.plan === 'free';

            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🚫  CHAT LIMIT REACHED');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('  User ID :', user.id);
            console.log('  Plan    :', user.plan);
            console.log('  Limit   :', limits.chats, isFreePlan ? '(lifetime)' : '(per 30 days)');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

            return res.status(403).json({
                message: isFreePlan
                    ? `Free plan allows only ${limits.chats} vehicle chats total. Upgrade to Pro for 50 chats/month.`
                    : `You've used all ${limits.chats} chats this month. Upgrade to Ultra for unlimited chats.`,
                code:       'CHAT_LIMIT_REACHED',
                plan:       user.plan,
                limit:      limits.chats,
                isLifetime: isFreePlan,
                upgradeUrl: '/pricing',
            });
        }

        const chat = await Chat.create(user.id);

        const firstMessage = await Message.create(
            chat.id,
            'bot',
            "Hello! I'm your vehicle diagnostic assistant. What is the brand of your vehicle? (e.g., Toyota, Honda, BMW)"
        );

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🚗  NEW CHAT CREATED');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  Chat ID    :', chat.id);
        console.log('  Chat UUID  :', chat.uuid);
        console.log('  User ID    :', user.id);
        console.log('  User Plan  :', user.plan);
        console.log('  Created At :', chat.created_at);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        res.status(201).json({ message: 'Chat created successfully', chat, firstMessage });
    } catch (error) {
        console.error('❌ Create chat error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// GET /api/chats/:uuid
const getChatById = async (req, res) => {
    try {
        const user = await User.findByFirebaseUid(req.user.uid);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // ── Ownership check: UUID must belong to the requesting user ───────
        const chat = await Chat.findByUuidAndUserId(req.params.uuid, user.id);
        if (!chat) {
            // Return 404 (not 403) to avoid leaking that the chat exists
            return res.status(404).json({ message: 'Chat not found' });
        }

        const messages = await Message.findByChatId(chat.id);

        console.log(`🔍 Chat fetched: [${chat.uuid}] "${chat.title}" — ${messages.length} message(s)`);

        res.json({ chat, messages });
    } catch (error) {
        console.error('❌ Get chat error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// DELETE /api/chats/:uuid
const deleteChat = async (req, res) => {
    try {
        const user = await User.findByFirebaseUid(req.user.uid);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // ── Ownership check ────────────────────────────────────────────────
        const chat = await Chat.findByUuidAndUserId(req.params.uuid, user.id);
        if (!chat) return res.status(404).json({ message: 'Chat not found' });

        await Message.deleteByChatId(chat.id);
        await Chat.delete(chat.id);

        console.log(`🗑️  Chat deleted: [${chat.uuid}] ${chat.vehicle_brand || 'No vehicle'}`);

        res.json({ message: 'Chat deleted successfully' });
    } catch (error) {
        console.error('❌ Delete chat error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// PATCH /api/chats/:uuid/resolve
const resolveChat = async (req, res) => {
    try {
        const user = await User.findByFirebaseUid(req.user.uid);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // ── Ownership check ────────────────────────────────────────────────
        const chat = await Chat.findByUuidAndUserId(req.params.uuid, user.id);
        if (!chat) return res.status(404).json({ message: 'Chat not found' });

        const updatedChat = await Chat.resolve(chat.id);

        console.log(`✅ Chat resolved: [${chat.uuid}] ${chat.vehicle_brand || 'No vehicle'}`);

        res.json({ message: 'Chat resolved successfully', chat: updatedChat });
    } catch (error) {
        console.error('❌ Resolve chat error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getChats, createChat, getChatById, deleteChat, resolveChat };