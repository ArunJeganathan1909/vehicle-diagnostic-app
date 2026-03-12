const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');

// GET /api/chats
const getChats = async (req, res) => {
    try {
        const user = await User.findByFirebaseUid(req.user.uid);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const chats = await Chat.findByUserId(user.id);

        console.log(`📋 Chats fetched: User [${user.id}] ${user.display_name} has ${chats.length} chat(s)`);

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
        console.log('  Title      :', chat.title);
        console.log('  Status     :', chat.status);
        console.log('  User ID    :', user.id);
        console.log('  User Name  :', user.display_name);
        console.log('  User Email :', user.email);
        console.log('  Created At :', chat.created_at);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        res.status(201).json({
            message: 'Chat created successfully',
            chat,
            firstMessage,
        });
    } catch (error) {
        console.error('❌ Create chat error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// GET /api/chats/:id
const getChatById = async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id);
        if (!chat) return res.status(404).json({ message: 'Chat not found' });

        const messages = await Message.findByChatId(req.params.id);

        console.log(`🔍 Chat fetched: Chat [${chat.id}] "${chat.title}" — ${messages.length} message(s)`);

        res.json({ chat, messages });
    } catch (error) {
        console.error('❌ Get chat error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// DELETE /api/chats/:id
const deleteChat = async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id);
        if (!chat) return res.status(404).json({ message: 'Chat not found' });

        await Message.deleteByChatId(req.params.id);
        await Chat.delete(req.params.id);

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🗑️   CHAT DELETED');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  Chat ID :', chat.id);
        console.log('  Title   :', chat.title);
        console.log('  Vehicle :', chat.vehicle_brand
            ? `${chat.vehicle_year} ${chat.vehicle_brand} ${chat.vehicle_model}`
            : 'Not set');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        res.json({ message: 'Chat deleted successfully' });
    } catch (error) {
        console.error('❌ Delete chat error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// PATCH /api/chats/:id/resolve
const resolveChat = async (req, res) => {
    try {
        const chat = await Chat.resolve(req.params.id);

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅  CHAT RESOLVED');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  Chat ID :', chat.id);
        console.log('  Title   :', chat.title);
        console.log('  Vehicle :', chat.vehicle_brand
            ? `${chat.vehicle_year} ${chat.vehicle_brand} ${chat.vehicle_model}`
            : 'Not set');
        console.log('  Status  :', chat.status);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        res.json({
            message: 'Chat resolved successfully',
            chat,
        });
    } catch (error) {
        console.error('❌ Resolve chat error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getChats, createChat, getChatById, deleteChat, resolveChat };