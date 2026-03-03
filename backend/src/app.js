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
import imageRoute from './routes/imageRoute.js';
import testSeriesRoute from './routes/testSeriesRoute.js';
import testRoute from './routes/testRoute.js';

const app = express();

// --- Middleware ---
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

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
app.use('/api/images', imageRoute);
app.use('/api/test-series', testSeriesRoute);
app.use('/api/test-series/:seriesId/tests', testRoute);

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
