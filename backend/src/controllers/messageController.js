const Chat    = require('../models/Chat');
const Message = require('../models/Message');
const axios   = require('axios');

// POST /api/messages
const sendMessage = async (req, res) => {
    try {
        const { chat_id, content, image_base64, image_media_type } = req.body;

        if (!chat_id || (!content && !image_base64)) {
            return res.status(400).json({ message: 'chat_id and content or image are required' });
        }

        const chat = await Chat.findById(chat_id);
        if (!chat) return res.status(404).json({ message: 'Chat not found' });

        const userMessage = await Message.create(chat_id, 'user', content || '[Image uploaded]');

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('💬  USER MESSAGE SAVED');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  Message ID :', userMessage.id);
        console.log('  Chat ID    :', chat_id);
        console.log('  Content    :', userMessage.content);
        console.log('  Has Image  :', image_base64 ? 'yes' : 'no');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        const allMessages = await Message.findByChatId(chat_id);

        console.log(`🤖 Sending to AI — Chat [${chat_id}], ${allMessages.length} message(s)${image_base64 ? ', with image' : ''}...`);

        const aiResponse = await axios.post('http://localhost:8000/chat', {
            chat_id,
            vehicle_brand:    chat.vehicle_brand,
            vehicle_model:    chat.vehicle_model,
            vehicle_year:     chat.vehicle_year,
            messages:         allMessages.map(m => ({ role: m.role, content: m.content })),
            image_base64:     image_base64     || null,
            image_media_type: image_media_type || 'image/jpeg',
        });

        const { reply, vehicle_brand, vehicle_model, vehicle_year } = aiResponse.data;

        // Update vehicle info whenever any new field is returned
        const needsUpdate =
            (vehicle_brand && vehicle_brand !== chat.vehicle_brand) ||
            (vehicle_model && vehicle_model !== chat.vehicle_model) ||
            (vehicle_year  && vehicle_year  !== chat.vehicle_year);

        if (needsUpdate) {
            await Chat.updateVehicleInfo(chat_id, {
                vehicle_brand: vehicle_brand || chat.vehicle_brand,
                vehicle_model: vehicle_model || chat.vehicle_model,
                vehicle_year:  vehicle_year  || chat.vehicle_year,
            });

            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🚘  VEHICLE INFO UPDATED');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('  Brand :', vehicle_brand || chat.vehicle_brand);
            console.log('  Model :', vehicle_model || chat.vehicle_model);
            console.log('  Year  :', vehicle_year  || chat.vehicle_year);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        }

        const botMessage = await Message.create(chat_id, 'bot', reply);

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🤖  BOT REPLY SAVED');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  Message ID :', botMessage.id);
        console.log('  Content    :', botMessage.content.substring(0, 80) + '...');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        res.status(201).json({ message: 'Message sent successfully', userMessage, botMessage });

    } catch (error) {
        console.error('❌ Send message error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// GET /api/messages/:chat_id
const getMessages = async (req, res) => {
    try {
        const messages = await Message.findByChatId(req.params.chat_id);
        console.log(`📨 Messages fetched: Chat [${req.params.chat_id}] — ${messages.length} message(s)`);
        res.json({ messages });
    } catch (error) {
        console.error('❌ Get messages error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { sendMessage, getMessages };