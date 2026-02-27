import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import db from './db/knex.js';
import './workers/deletionWorker.js'; // Start BullMQ worker

const PORT = process.env.PORT || 3001;

const start = async () => {
    try {
        // Verify DB connection
        await db.raw('SELECT 1');
        console.log('✅ Database connected');

        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
};

start();
