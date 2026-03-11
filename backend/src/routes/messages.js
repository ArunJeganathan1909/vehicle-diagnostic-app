const router = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const axios = require('axios');

// All routes protected
router.use(verifyToken);

// POST /api/messages — send a message and get bot reply
router.post('/', async (req, res) => {
    try {
        const { chat_id, content } = req.body;

        if (!chat_id || !content) {
            return res.status(400).json({ message: 'chat_id and content are required' });
        }

        // 1. Get the chat
        const chat = await Chat.findById(chat_id);
        if (!chat) return res.status(404).json({ message: 'Chat not found' });

        // 2. Save the user message
        const userMessage = await Message.create(chat_id, 'user', content);

        // 3. Get all messages so far (conversation history)
        const allMessages = await Message.findByChatId(chat_id);

        // 4. Send to Python AI service and get bot reply
        const aiResponse = await axios.post('http://localhost:8000/chat', {
            chat_id,
            vehicle_brand: chat.vehicle_brand,
            vehicle_model: chat.vehicle_model,
            vehicle_year: chat.vehicle_year,
            messages: allMessages.map((m) => ({
                role: m.role,
                content: m.content,
            })),
        });

        const { reply, vehicle_brand, vehicle_model, vehicle_year } = aiResponse.data;

        // 5. If AI extracted vehicle info, update the chat
        if (vehicle_brand && !chat.vehicle_brand) {
            await Chat.updateVehicleInfo(chat_id, {
                vehicle_brand,
                vehicle_model: vehicle_model || null,
                vehicle_year: vehicle_year || null,
            });
        }

        // 6. Save bot reply to database
        const botMessage = await Message.create(chat_id, 'bot', reply);

        res.status(201).json({
            userMessage,
            botMessage,
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/messages/:chat_id — get all messages for a chat
router.get('/:chat_id', async (req, res) => {
    try {
        const messages = await Message.findByChatId(req.params.chat_id);
        res.json({ messages });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;