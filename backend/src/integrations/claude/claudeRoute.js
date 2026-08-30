import express from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { authenticateClaudeRequest } from './claudeAuth.js';
import { registerRevisionTools } from './claudeTools.js';

const router = express.Router();

// Allow cross-origin requests from Claude (claude.ai) and other MCP clients
router.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-user-id', 'ngrok-skip-browser-warning']
}));

// Map of active SSE sessions: sessionId -> { transport, server, user }
const activeTransports = new Map();

/**
 * 1. Health / Info endpoint
 */
router.get('/', (req, res) => {
    res.json({
        status: 'online',
        service: 'Revision Claude MCP Connector',
        version: '1.0.0',
        sseEndpoint: '/api/integrations/claude/sse',
        messagesEndpoint: '/api/integrations/claude/messages',
        tools: [
            'list_subjects',
            'create_subject',
            'list_notes',
            'read_note',
            'create_note',
            'update_note',
            'save_question_and_solution',
            'list_questions'
        ]
    });
});

/**
 * 2. SSE Connection Endpoint for Claude Custom Connector
 * Establishes long-lived SSE connection and registers MCP tools.
 */
router.get('/sse', async (req, res) => {
    try {
        const user = await authenticateClaudeRequest(req);

        // Determine the absolute messages POST endpoint URL
        const host = req.headers['x-forwarded-host'] || req.headers['host'] || req.get('host');
        const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
        const tokenQuery = req.query?.token ? `?token=${encodeURIComponent(req.query.token)}` : '';
        const messagesEndpoint = `${protocol}://${host}/api/integrations/claude/messages${tokenQuery}`;

        const transport = new SSEServerTransport(messagesEndpoint, res);

        const server = new McpServer({
            name: 'Revision Connector',
            version: '1.0.0'
        });

        // Register tools scoped to this authenticated user
        registerRevisionTools(server, user);

        const sessionId = transport.sessionId;
        activeTransports.set(sessionId, { transport, server, user });

        req.on('close', () => {
            activeTransports.delete(sessionId);
        });

        await server.connect(transport);
    } catch (error) {
        console.error('[Claude MCP SSE Error]:', error.message);
        if (!res.headersSent) {
            res.status(401).json({ error: error.message });
        }
    }
});

/**
 * 3. Messages POST endpoint
 * Handles incoming JSON-RPC calls from Claude.
 */
router.post('/messages', async (req, res) => {
    try {
        const sessionId = req.query.sessionId;
        if (!sessionId) {
            return res.status(400).json({ error: 'Missing sessionId query parameter' });
        }

        const session = activeTransports.get(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Active MCP session not found or expired' });
        }

        // Pass req.body since express.json() already parsed the incoming stream
        await session.transport.handlePostMessage(req, res, req.body);
    } catch (error) {
        console.error('[Claude MCP Message Error]:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to process MCP message' });
        }
    }
});

export default router;
