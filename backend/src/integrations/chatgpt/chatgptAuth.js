import dotenv from 'dotenv';
import db from '../../knex/db.js';
dotenv.config();

/**
 * Authentication middleware for ChatGPT Actions.
 * Supports x-api-key header or Authorization Bearer token.
 * Attaches the authenticated user to req.user.
 */
export const authenticateChatGPT = async (req, res, next) => {
    try {
        const configuredApiKey = process.env.CHATGPT_API_KEY;
        const apiKeyHeader = req.headers['x-api-key'];
        const authHeader = req.headers['authorization'];
        
        let providedKey = apiKeyHeader;
        if (!providedKey && authHeader && authHeader.startsWith('Bearer ')) {
            providedKey = authHeader.substring(7);
        }

        // If CHATGPT_API_KEY is configured in .env, enforce validation
        if (configuredApiKey && providedKey !== configuredApiKey) {
            return res.status(401).json({
                error: 'Unauthorized: Invalid or missing API key. Please configure x-api-key header.'
            });
        }

        // Resolve active user (from custom header, or default to the first active user)
        const targetUserId = req.headers['x-user-id'];
        let user;

        if (targetUserId) {
            user = await db('revision.users')
                .where('id', targetUserId)
                .where('is_deleted', false)
                .first();
        }

        if (!user) {
            // Fallback: pick the first registered user
            user = await db('revision.users')
                .where('is_deleted', false)
                .orderBy('created_at', 'asc')
                .first();
        }

        if (!user) {
            return res.status(500).json({
                error: 'No active user found in Revision database. Please create a user account first.'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('[ChatGPT Auth Error]:', error);
        return res.status(500).json({ error: 'Internal authentication error' });
    }
};
