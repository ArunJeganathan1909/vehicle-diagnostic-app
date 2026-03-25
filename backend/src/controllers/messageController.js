const Chat    = require('../models/Chat');
const Message = require('../models/Message');
const User    = require('../models/User');
const axios   = require('axios');

// ── Warm up the AI service before the real call ────────────────────────────
// Render free tier spins down after 15 min. This ping wakes it up first,
// so the real /chat call doesn't time out waiting for a cold start.
const warmUpAiService = async (aiServiceUrl) => {
    try {
        await axios.get(`${aiServiceUrl}/`, { timeout: 30000 });
        console.log('🔥 AI service warmed up');
    } catch {
        // Ignore — even if ping fails, we still attempt the real call
        console.log('⚠️  AI service warm-up ping failed (may still be starting)');
    }
};

// ── Axios call with one automatic retry on 502/503/timeout ────────────────
const callAiWithRetry = async (aiServiceUrl, payload) => {
    const config = {
        timeout: 90000, // 90 seconds — enough for a cold start + inference
    };

    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            console.log(`📡 AI call attempt ${attempt}...`);
            const response = await axios.post(`${aiServiceUrl}/chat`, payload, config);
            return response;
        } catch (err) {
            const status = err.response?.status;
            const isRetryable = !status || status === 502 || status === 503 || err.code === 'ECONNABORTED';

            console.warn(`⚠️  AI attempt ${attempt} failed — status=${status || err.code}`);

            if (attempt === 2 || !isRetryable) throw err;

            // Wait 5 seconds before retry — gives the service time to finish waking
            console.log('⏳ Waiting 5s before retry...');
            await new Promise(r => setTimeout(r, 5000));
        }
    }
};

// POST /api/messages
const sendMessage = async (req, res) => {
    try {
        const { chat_id, content, image_base64, image_media_type } = req.body;

        if (!chat_id || (!content && !image_base64)) {
            return res.status(400).json({ message: 'chat_id and content or image are required' });
        }

        // ── Look up by UUID and verify ownership ───────────────────────────
        const requestingUser = await User.findByFirebaseUid(req.user.uid);
        if (!requestingUser) return res.status(404).json({ message: 'User not found' });

        const chat = await Chat.findByUuidAndUserId(chat_id, requestingUser.id);
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

        // ── Save user message ──────────────────────────────────────────────
        const userMessage = await Message.create(chat.id, 'user', content || '[Image uploaded]');

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('💬  USER MESSAGE SAVED');
        console.log(`  ID: ${userMessage.id} | Chat: ${chat.uuid} | Plan: ${user.plan} | Image: ${image_base64 ? 'yes' : 'no'}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        const allMessages = await Message.findByChatId(chat.id);

        // ── Check AI service URL ────────────────────────────────────────────
        const aiServiceUrl = process.env.AI_SERVICE_URL;
        if (!aiServiceUrl) {
            console.error('❌ AI_SERVICE_URL env var is not set!');
            return res.status(500).json({ message: 'AI service not configured' });
        }

        // ── Warm up AI service to reduce cold start 502s ───────────────────
        await warmUpAiService(aiServiceUrl);

        // ── Call AI service with retry ─────────────────────────────────────
        const aiResponse = await callAiWithRetry(aiServiceUrl, {
            chat_id:          chat.id,
            vehicle_brand:    chat.vehicle_brand,
            vehicle_model:    chat.vehicle_model,
            vehicle_year:     chat.vehicle_year,
            messages:         allMessages.map(m => ({ role: m.role, content: m.content })),
            image_base64:     image_base64     || null,
            image_media_type: image_media_type || 'image/jpeg',
        });

        const { reply, vehicle_brand, vehicle_model, vehicle_year } = aiResponse.data;

        // ── Safely extract resource_links ──────────────────────────────────
        let resource_links = [];
        try {
            const raw = aiResponse.data.resource_links;
            if (Array.isArray(raw) && raw.length > 0) {
                resource_links = JSON.parse(JSON.stringify(raw));
            }
        } catch (e) {
            console.warn('⚠️  Failed to clean resource_links:', e.message);
            resource_links = [];
        }

        console.log(`🔗 resource_links from AI: ${JSON.stringify(resource_links)}`);

        // ── Update vehicle info if changed ─────────────────────────────────
        const needsUpdate =
            (vehicle_brand && vehicle_brand !== chat.vehicle_brand) ||
            (vehicle_model && vehicle_model !== chat.vehicle_model) ||
            (vehicle_year  && vehicle_year  !== chat.vehicle_year);

        if (needsUpdate) {
            await Chat.updateVehicleInfo(chat.id, {
                vehicle_brand: vehicle_brand || chat.vehicle_brand,
                vehicle_model: vehicle_model || chat.vehicle_model,
                vehicle_year:  vehicle_year  || chat.vehicle_year,
            });
            console.log(`🚘 Vehicle updated: ${vehicle_brand} ${vehicle_model} ${vehicle_year}`);
        }

        // ── Save bot reply ─────────────────────────────────────────────────
        const botMessage = await Message.create(chat.id, 'bot', reply, resource_links);

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🤖  BOT REPLY SAVED');
        console.log(`  Message ID : ${botMessage.id}`);
        console.log(`  Links      : ${resource_links.length} resource link(s) saved to DB`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        res.status(201).json({
            message: 'Message sent successfully',
            userMessage,
            botMessage,
        });

    } catch (error) {
        console.error('❌ Send message error:', error.message);

        // ── Return a user-friendly message based on error type ─────────────
        const status = error.response?.status;
        if (status === 502 || status === 503) {
            return res.status(503).json({
                message: 'The AI service is starting up. Please wait 30 seconds and try again.',
                code:    'AI_SERVICE_UNAVAILABLE',
            });
        }
        if (error.code === 'ECONNABORTED') {
            return res.status(503).json({
                message: 'The AI service took too long to respond. Please try again.',
                code:    'AI_SERVICE_TIMEOUT',
            });
        }

        res.status(500).json({ message: 'Server error' });
    }
};

// GET /api/messages/:chat_uuid
const getMessages = async (req, res) => {
    try {
        const requestingUser = await User.findByFirebaseUid(req.user.uid);
        if (!requestingUser) return res.status(404).json({ message: 'User not found' });

        const chat = await Chat.findByUuidAndUserId(req.params.chat_uuid, requestingUser.id);
        if (!chat) return res.status(404).json({ message: 'Chat not found' });

        const messages = await Message.findByChatId(chat.id);
        console.log(`📨 Messages fetched: Chat [${chat.uuid}] — ${messages.length} message(s)`);
        res.json({ messages });
    } catch (error) {
        console.error('❌ Get messages error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { sendMessage, getMessages };