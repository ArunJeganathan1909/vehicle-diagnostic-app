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

// Chats — all routes now use uuid (not numeric id)
export const getChats    = ()       => api.get('/api/chats');
export const createChat  = ()       => api.post('/api/chats');
export const getChat     = (uuid)   => api.get(`/api/chats/${uuid}`);
export const deleteChat  = (uuid)   => api.delete(`/api/chats/${uuid}`);
export const resolveChat = (uuid)   => api.patch(`/api/chats/${uuid}/resolve`);

// Messages — chat_id sent in body / param is now the uuid
export const sendMessage = (chatUuid, content, imageBase64 = null, imageMediaType = 'image/jpeg') =>
    api.post('/api/messages', {
        chat_id:          chatUuid,
        content:          content,
        image_base64:     imageBase64  || undefined,
        image_media_type: imageBase64 ? imageMediaType : undefined,
    });

export const getMessages = (chatUuid) => api.get(`/api/messages/${chatUuid}`);

export default api;