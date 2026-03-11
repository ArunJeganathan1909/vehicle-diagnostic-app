const router = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const User = require('../models/User');
const Chat = require('../models/Chat');
const Message = require('../models/Message');

// All routes are protected — user must be logged in
router.use(verifyToken);

// GET /api/chats — get all chats for logged in user
router.get('/', async (req, res) => {
    try {
        const user = await User.findByFirebaseUid(req.user.uid);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const chats = await Chat.findByUserId(user.id);
        res.json({ chats });
    } catch (error) {
        console.error('Get chats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/chats — create a new chat session
router.post('/', async (req, res) => {
    try {
        const user = await User.findByFirebaseUid(req.user.uid);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const chat = await Chat.create(user.id);

        // Save the first bot message into this chat
        await Message.create(
            chat.id,
            'bot',
            "Hello! I'm your vehicle diagnostic assistant. What is the brand of your vehicle? (e.g., Toyota, Honda, BMW)"
        );

        res.status(201).json({ chat });
    } catch (error) {
        console.error('Create chat error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/chats/:id — get single chat with all messages
router.get('/:id', async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id);
        if (!chat) return res.status(404).json({ message: 'Chat not found' });

        const messages = await Message.findByChatId(req.params.id);
        res.json({ chat, messages });
    } catch (error) {
        console.error('Get chat error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/chats/:id — delete a chat
router.delete('/:id', async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id);
        if (!chat) return res.status(404).json({ message: 'Chat not found' });

        await Message.deleteByChatId(req.params.id);
        await Chat.delete(req.params.id);

        res.json({ message: 'Chat deleted successfully' });
    } catch (error) {
        console.error('Delete chat error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// PATCH /api/chats/:id/resolve — mark chat as resolved
router.patch('/:id/resolve', async (req, res) => {
    try {
        const chat = await Chat.resolve(req.params.id);
        res.json({ chat });
    } catch (error) {
        console.error('Resolve chat error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;