const Chat    = require('../models/Chat');
const Message = require('../models/Message');
const User    = require('../models/User');
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

        const user = await User.findById(chat.user_id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // ── Block image upload for free plan ──────────────────────────────
        if (image_base64 && !User.canUseImageAnalysis(user.plan)) {
            console.log(`🚫 Image upload blocked: User [${user.id}] plan=${user.plan}`);
            return res.status(403).json({
                message:    'Image analysis is available on Pro and Ultra plans only.',
                code:       'IMAGE_ANALYSIS_NOT_AVAILABLE',
                plan:       user.plan,
                upgradeUrl: '/pricing',
            });
        }

        // ── Save user message (no resource_links for user messages) ────────
        const userMessage = await Message.create(chat_id, 'user', content || '[Image uploaded]');

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('💬  USER MESSAGE SAVED');
        console.log(`  ID: ${userMessage.id} | Chat: ${chat_id} | Plan: ${user.plan} | Image: ${image_base64 ? 'yes' : 'no'}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        const allMessages = await Message.findByChatId(chat_id);

        // Replace this:
        // axios.post('http://localhost:8000/chat',

        // With this:
        // axios.post(`${process.env.AI_SERVICE_URL}/chat`,

        const aiResponse = axios.post(`${process.env.AI_SERVICE_URL}/chat`, {
            chat_id,
            vehicle_brand:    chat.vehicle_brand,
            vehicle_model:    chat.vehicle_model,
            vehicle_year:     chat.vehicle_year,
            // Only send role + content to AI — don't send resource_links
            messages: allMessages.map(m => ({ role: m.role, content: m.content })),
            image_base64:     image_base64     || null,
            image_media_type: image_media_type || 'image/jpeg',
        });

        const { reply, vehicle_brand, vehicle_model, vehicle_year, resource_links } = aiResponse.data;

        // ── Update vehicle info if changed ─────────────────────────────────
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
            console.log(`🚘 Vehicle updated: ${vehicle_brand} ${vehicle_model} ${vehicle_year}`);
        }

        // ── Save bot reply WITH resource_links persisted to DB ─────────────
        const safeLinks = Array.isArray(resource_links) ? resource_links : [];
        const botMessage = await Message.create(chat_id, 'bot', reply, safeLinks);

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🤖  BOT REPLY SAVED');
        console.log(`  Message ID : ${botMessage.id}`);
        console.log(`  Links      : ${safeLinks.length} resource link(s) saved to DB`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        res.status(201).json({
            message: 'Message sent successfully',
            userMessage,
            botMessage,   // already has resource_links parsed as array from Message.create()
        });

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