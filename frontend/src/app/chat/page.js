'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getChats, createChat } from '@/lib/api';

export default function ChatIndexPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;
        if (!user) {
            router.replace('/login');
            return;
        }

        const redirectToChat = async () => {
            try {
                const res = await getChats();
                const chats = res.data.chats;

                if (chats && chats.length > 0) {
                    // Redirect to the most recent chat
                    router.replace(`/chat/${chats[0].uuid}`);
                } else {
                    // No chats exist — create one and redirect
                    const newChat = await createChat();
                    router.replace(`/chat/${newChat.data.chat.uuid}`);
                }
            } catch {
                // Fallback to dashboard on error
                router.replace('/dashboard');
            }
        };

        redirectToChat();
    }, [user, loading, router]);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#09090f',
        }}>
            <div className="loader" />
        </div>
    );
}