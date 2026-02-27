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

        const server = app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });

        server.on('error', (e) => {
            if (e.code === 'EADDRINUSE') {
                console.error(`❌ Port ${PORT} is already in use. Please run 'npm run predev' or kill the process manually.`);
                process.exit(1);
            }
        });

        // Graceful shutdown
        const shutdown = async (signal) => {
            console.log(`\nReceived ${signal}. Shutting down gracefully...`);
            server.close(async () => {
                console.log('HTTP server closed.');
                try {
                    await db.destroy();
                    console.log('Database connection closed.');
                } catch (dbErr) {
                    console.error('Error closing database:', dbErr.message);
                }
                process.exit(0);
            });

            // Force close after 5s
            setTimeout(() => {
                console.error('Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }, 5000);
        };

    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
};

start();
