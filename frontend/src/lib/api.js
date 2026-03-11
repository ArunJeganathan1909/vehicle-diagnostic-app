import axios from 'axios';
import { auth } from './firebase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
});

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
export const getChats = () => api.get('/api/chats');
export const createChat = () => api.post('/api/chats');
export const getChat = (id) => api.get(`/api/chats/${id}`);
export const deleteChat = (id) => api.delete(`/api/chats/${id}`);
export const resolveChat = (id) => api.patch(`/api/chats/${id}/resolve`);

// Messages
export const sendMessage = (chatId, content) =>
    api.post('/api/messages', { chat_id: chatId, content });
export const getMessages = (chatId) => api.get(`/api/messages/${chatId}`);

export default api;