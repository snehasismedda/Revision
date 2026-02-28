import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import db from './knex/db.js';

const PORT = process.env.PORT || 3001;

const start = async () => {
    try {
        // Verify DB connection
        await db.raw('SELECT 1');
        console.log(':::: Database connected ::::');

        const server = app.listen(PORT, () => {
            console.log(`:::: Server running on http://localhost:${PORT} ::::`);
        });

        server.on('error', (e) => {
            if (e.code === 'EADDRINUSE') {
                console.error(`:::: Port ${PORT} is already in use. Please run 'npm run predev' or kill the process manually. ::::`);
                process.exit(1);
            }
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
};

start();
