const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chats');
const messageRoutes = require('./routes/messages');
const subscriptionRoutes = require('./routes/subscription');

const app = express();

app.use(cors({
    origin: [
        'http://localhost:3000',               // local dev
        'https://autodiag.vercel.app',         // production frontend
        'https://your-custom-domain.com',      // if you have one
    ],
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/subscription', subscriptionRoutes);



// Health check
app.get('/', (req, res) => {
    res.json({ message: 'Vehicle Diagnostic API running!' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ message: 'Something went wrong' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});