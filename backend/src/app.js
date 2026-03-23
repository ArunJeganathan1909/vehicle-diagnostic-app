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
        'http://localhost:3000',
        'http://localhost:5000',
        'https://vehicle-diagnostic-app.vercel.app',
        'https://autodiag-backend.onrender.com',
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