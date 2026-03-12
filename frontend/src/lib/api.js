import axios from 'axios';
import { auth } from './firebase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const api = axios.create({ baseURL: API_URL });

// Auto-attach Firebase token to every request
api.interceptors.request.use(async (config) => {
    const user = auth.currentUser;
    if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth
export const syncUser = () => api.post('/api/auth/sync');

// Chats
export const getChats   = ()     => api.get('/api/chats');
export const createChat = ()     => api.post('/api/chats');
export const getChat    = (id)   => api.get(`/api/chats/${id}`);
export const deleteChat = (id)   => api.delete(`/api/chats/${id}`);
export const resolveChat= (id)   => api.patch(`/api/chats/${id}/resolve`);

// Messages — now supports optional image (base64 string)
export const sendMessage = (chatId, content, imageBase64 = null, imageMediaType = 'image/jpeg') =>
    api.post('/api/messages', {
        chat_id:          chatId,
        content:          content,
        image_base64:     imageBase64  || undefined,
        image_media_type: imageBase64 ? imageMediaType : undefined,
    });

export const getMessages = (chatId) => api.get(`/api/messages/${chatId}`);

export default api;