import dotenv from 'dotenv';
import db from '../../knex/db.js';
dotenv.config();

/**
 * Validates request authentication for Claude MCP integrations.
 * Supports x-api-key, Authorization: Bearer, and ?token=? query parameter.
 * Resolves and returns the authenticated user object.
 */
export const authenticateClaudeRequest = async (req) => {
    const configuredApiKey = process.env.CLAUDE_API_KEY;
    const apiKeyHeader = req.headers['x-api-key'];
    const authHeader = req.headers['authorization'];
    const queryToken = req.query?.token || req.query?.apiKey;

    let providedKey = apiKeyHeader || queryToken;
    if (!providedKey && authHeader && authHeader.startsWith('Bearer ')) {
        providedKey = authHeader.substring(7);
    }

    if (configuredApiKey && providedKey !== configuredApiKey) {
        throw new Error('Unauthorized: Invalid or missing API key.');
    }

    // Resolve active user (from custom header, or default to the first active user)
    const targetUserId = req.headers['x-user-id'] || req.query?.userId;
    let user;

    if (targetUserId) {
        user = await db('revision.users')
            .where('id', targetUserId)
            .where('is_deleted', false)
            .first();
    }

    if (!user) {
        user = await db('revision.users')
            .where('is_deleted', false)
            .orderBy('created_at', 'asc')
            .first();
    }

    if (!user) {
        throw new Error('No active user found in Revision database. Please create a user account first.');
    }

    return user;
};
