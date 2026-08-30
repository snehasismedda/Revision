import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import authRoute from './routes/authRoute.js';
import subjectRoute from './routes/subjectRoute.js';
import topicRoute from './routes/topicRoute.js';
import sessionRoute from './routes/sessionRoute.js';
import entryRoute from './routes/entryRoute.js';
import analyticsRoute from './routes/analyticsRoute.js';
import aiRoute from './routes/aiRoute.js';
import questionRoute from './routes/questionRoute.js';
import noteRoute from './routes/noteRoute.js';
import fileRoute from './routes/fileRoute.js';
import folderRoute from './routes/folderRoute.js';
import testSeriesRoute from './routes/testSeriesRoute.js';
import testRoute from './routes/testRoute.js';
import solutionRoute from './routes/solutionRoute.js';
import revisionTrackerRoute from './routes/revisionTrackerRoute.js';
import todoRoute from './routes/todoRoute.js';
import systemPromptRoute from './routes/systemPromptRoute.js';
import quizSetRoute from './routes/quizSetRoute.js';
import userRoute from './routes/userRoute.js';
import timeTableRoute from './routes/timeTableRoute.js';
import chatgptRoute from './integrations/chatgpt/chatgptRoute.js';
import claudeRoute from './integrations/claude/claudeRoute.js';
import { dateSerializationMiddleware } from './utils/serialization.js';

const app = express();

// --- Middleware ---
const allowedOrigins = (process.env.CLIENT_URL || '')
    .split(',')
    .map(url => url.trim())
    .filter(Boolean);

const isOriginAllowed = (origin) => {
    if (!origin) return true; // allow non-browser requests or same-origin
    if (allowedOrigins.includes(origin)) return true;
    // Allow local development (http/https on localhost or 127.0.0.1 on any port)
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
    // Allow Vercel preview and production domains
    if (/^https:\/\/.*\.vercel\.app$/.test(origin)) return true;
    return false;
};

app.use(cors({
    origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
            callback(null, true);
        } else {
            callback(null, false);
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());
app.use(dateSerializationMiddleware);


// --- Routes ---
app.use('/api/auth', authRoute);
app.use('/api/subjects', subjectRoute);
app.use('/api/subjects/:subjectId/topics', topicRoute);
app.use('/api/subjects/:subjectId/sessions', sessionRoute);
app.use('/api/subjects/:subjectId/questions', questionRoute);
app.use('/api/subjects/:subjectId/notes', noteRoute);
app.use('/api/sessions/:sessionId/entries', entryRoute);
app.use('/api/analytics', analyticsRoute);
app.use('/api/ai', aiRoute);
app.use('/api/files', fileRoute);
app.use('/api/folders', folderRoute);
app.use('/api/test-series', testSeriesRoute);
app.use('/api/test-series/:seriesId/tests', testRoute);
app.use('/api/subjects/:subjectId/revision-tracker', revisionTrackerRoute);
app.use('/api/subjects/:subjectId/todos', todoRoute);
app.use('/api/subjects/:subjectId/solutions', solutionRoute);
app.use('/api/system-prompts', systemPromptRoute);
app.use('/api/quiz-sets', quizSetRoute);
app.use('/api/users', userRoute);
app.use('/api/timetables', timeTableRoute);
app.use('/api/integrations/chatgpt', chatgptRoute);
app.use('/api/integrations/claude', claudeRoute);

// --- Health Check ---
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// --- Global Error Handler ---
app.use((err, req, res, next) => {
    console.error('[GlobalError]', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
    });
});

export default app;
