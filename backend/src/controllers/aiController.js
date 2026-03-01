import * as sessionModel from '../models/sessionModel.js';
import * as subjectModel from '../models/subjectModel.js';
import * as topicModel from '../models/topicModel.js';
import * as analyticsModel from '../models/analyticsModel.js';
import db from '../knex/db.js';
import { ollama, models } from '../config/ollama.js';
import { syllabusPrompt, insightPrompt, globalInsightPrompt, noteAnalysisPrompt, enhanceNotePrompt, noteDescriptionPrompt } from '../system_prompts/index.js';

export const enhanceNote = async (req, res) => {
    try {
        const { title, content } = req.body;
        if (!content) return res.status(400).json({ error: 'Content is required' });

        const messages = [
            { role: "system", content: enhanceNotePrompt },
            { role: "user", content: `Title: ${title}\nContent: ${content}` }
        ];

        const response = await ollama.chat({
            model: models.TEXT,
            messages,
            stream: false,
            format: 'json'
        });
        const result = JSON.parse(response.message?.content || '{}');
        res.status(200).json(result);
    } catch (error) {
        console.error('enhanceNote error:', error);
        res.status(500).json({ error: 'Failed to enhance note' });
    }
};

export const describeImage = async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) return res.status(400).json({ error: 'Image content is required' });

        const base64Data = content.replace(/^data:image\/\w+;base64,/, '');
        const messages = [
            { role: "system", content: noteDescriptionPrompt },
            {
                role: 'user',
                content: 'Provide a detailed educational description for this image. Return strictly as JSON.',
                images: [base64Data]
            }
        ];

        const response = await ollama.chat({
            model: models.IMAGE,
            messages,
            stream: false,
            format: 'json',
        });

        const result = JSON.parse(response.message?.content || '{}');
        res.status(200).json(result);
    } catch (error) {
        console.error('describeImage error:', error);
        res.status(500).json({ error: 'Failed to describe image' });
    }
};

export const parseNote = async (req, res) => {
    try {
        const { content, type } = req.body;
        if (!content) return res.status(400).json({ error: 'Content is required' });

        const model = type === 'image' ? models.IMAGE : models.TEXT;
        const messages = [
            { role: "system", content: noteAnalysisPrompt }
        ];

        if (type === 'image') {
            const base64Data = content.replace(/^data:image\/\w+;base64,/, '');
            messages.push({
                role: 'user',
                content: 'Extract the title and structured study notes from this image. Return strictly as JSON.',
                images: [base64Data]
            });
        } else {
            messages.push({
                role: 'user',
                content: `Extract the title and structured study notes from the following text:\n\n${content}`
            });
        }

        const response = await ollama.chat({
            model,
            messages,
            stream: false,
            format: 'json',
        });

        const result = JSON.parse(response.message?.content || '{}');
        res.status(200).json(result);
    } catch (error) {
        console.error('parseNote error:', error);
        res.status(500).json({ error: 'Failed to analyze note' });
    }
};

export const parseSyllabus = async (req, res) => {
    try {
        const { syllabusText, subjectId } = req.body;
        if (!syllabusText) return res.status(400).json({ error: 'syllabusText is required' });

        const subject = await subjectModel.findSubjectByIdAndUser({
            id: subjectId,
            userId: req.user.id,
        });
        if (!subject) return res.status(404).json({ error: 'Subject not found' });

        const response = await ollama.chat({
            model: models.TEXT,
            messages: [
                {
                    role: "system",
                    content: syllabusPrompt
                },
                {
                    role: "user",
                    content: `Parse the following syllabus into a structured JSON array of topics.
                    Syllabus:
                    ${syllabusText}`
                }
            ],
            stream: false,
            format: 'json',
        });

        const rawResult = response.message?.content || '';
        // --- 1. Robust JSON Extraction ---
        let topics = [];
        try {
            // First attempt: direct parse
            const parsed = JSON.parse(rawResult);
            topics = Array.isArray(parsed) ? parsed : (parsed.name && Array.isArray(parsed.children) ? [parsed] : Object.values(parsed).find(v => Array.isArray(v)) || []);
        } catch {
            try {
                // Second attempt: clean markdown fences and extract by regex
                const cleaned = rawResult.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim();
                const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
                const objMatch = cleaned.match(/\{[\s\S]*\}/);

                const jsonToParse = arrayMatch ? arrayMatch[0] : (objMatch ? objMatch[0] : cleaned);
                const parsed = JSON.parse(jsonToParse);

                topics = Array.isArray(parsed) ? parsed : (parsed.name && Array.isArray(parsed.children) ? [parsed] : Object.values(parsed).find(v => Array.isArray(v)) || []);
            } catch (err) {
                console.error('parseSyllabus: could not extract valid JSON from:', rawResult);
                return res.status(422).json({ error: 'AI response was not valid JSON. Please try again.', raw: rawResult });
            }
        }

        if (!topics || topics.length === 0) {
            return res.status(422).json({ error: 'AI returned an empty or invalid topic list. Please try again.', raw: rawResult });
        }

        // --- 2. Hierarchical Storage within Transaction ---
        const createdTopics = await db.transaction(async (trx) => {
            await topicModel.softDeleteTopicsBySubject({ subjectId }, trx);

            return await topicModel.bulkCreateTopics({
                subjectId,
                topics,
            }, trx);
        });

        // Reconstruct for frontend
        const topicTree = topicModel.buildTopicTree(createdTopics);
        res.status(200).json({ topics: topicTree });
    } catch (error) {
        console.error('parseSyllabus error:', error);
        res.status(500).json({ error: error.message || 'Failed to parse syllabus' });
    }
};

export const getInsights = async (req, res) => {
    try {
        const { subjectId } = req.params;

        const subject = await subjectModel.findSubjectByIdAndUser({
            id: subjectId,
            userId: req.user.id,
        });
        if (!subject) return res.status(404).json({ error: 'Subject not found' });

        const [overview, weakAreas, trends, topicDist] = await Promise.all([
            analyticsModel.getSubjectOverview({ subjectId }),
            analyticsModel.getWeakAreas({ subjectId, minEncounters: 1 }),
            analyticsModel.getSessionTrends({ subjectId }),
            analyticsModel.getTopicPerformance({ subjectId }),
        ]);

        const analyticsContext = JSON.stringify({
            overview,
            weakAreas: weakAreas.slice(0, 5),
            recentTrends: trends.slice(-8), // Send more context for trend analysis
            effortDistribution: topicDist.sort((a, b) => b.total - a.total).slice(0, 8)
        });

        const response = await ollama.chat({
            model: models.TEXT,
            messages: [
                { role: "system", content: insightPrompt },
                {
                    role: "user",
                    content: `Based on this learning analytics data for the subject "${subject.name}", provide a brief, actionable performance summary in 3-4 sentences. 
                    Highlight the biggest weak area, and compare the user's focus (seen in "effortDistribution") with their actual results.
                    Mention whether overall performance is improving or declining based on the session trends, and provide one specific study recommendation.
                    
                    Analytics Data: ${analyticsContext}`
                }
            ],
            stream: false
        });

        const result = response.message?.content || 'AI analysis unavailable at this time.';
        res.status(200).json({ insight: result });
    } catch (error) {
        console.error('getInsights error:', error);
        res.status(500).json({ error: 'Failed to generate insights' });
    }
};

export const getSessionInsights = async (req, res) => {
    try {
        const { subjectId, sessionId } = req.params;
        const session = await sessionModel.findSessionById({ id: sessionId, subjectId });

        if (!session) return res.status(404).json({ error: 'Session not found' });

        const sessionEntries = await sessionModel.findEntriesBySessionId({ sessionId });

        // Calculate basic session stats for context
        const total = sessionEntries.length;
        const correct = sessionEntries.filter(e => e.is_correct).length;
        const accuracy = total > 0 ? ((correct / total) * 100).toFixed(1) : 0;

        // Find best and worst topics in this session
        const topicPerf = {};
        sessionEntries.forEach(e => {
            if (!topicPerf[e.topic_name]) topicPerf[e.topic_name] = { correct: 0, total: 0 };
            topicPerf[e.topic_name].total++;
            if (e.is_correct) topicPerf[e.topic_name].correct++;
        });

        const topics = Object.entries(topicPerf).map(([name, stats]) => ({
            name,
            accuracy: ((stats.correct / stats.total) * 100).toFixed(1),
            total: stats.total
        })).sort((a, b) => b.accuracy - a.accuracy);

        // Fetch session distribution for deeper context
        const sessionDist = await analyticsModel.getSessionTopicDistribution({ sessionId });

        const analyticsContext = JSON.stringify({
            sessionTitle: session.title,
            sessionAccuracy: accuracy,
            totalQuestions: total,
            topicsCovered: topics,
            distribution: sessionDist,
            notes: session.notes
        });

        const model = process.env.OLLAMA_TEXT_MODEL;

        const response = await ollama.chat({
            model,
            messages: [
                {
                    role: "system",
                    content: insightPrompt
                },
                {
                    role: "user",
                    content: `Based on this single study session's data, provide a brief, actionable performance summary in 3-4 sentences. 
                    Identify which topics dominated the session (from "distribution") and if that effort was reflected in accuracy.
                    Highlight the main topic that needs revision, and give one specific piece of advice for the next session.
                    
                    Analytics Data:
                    ${analyticsContext}`
                }
            ],
            stream: false
        });

        const result = response.message?.content || 'Session insights unavailable.';
        res.status(200).json({ insight: result });
    } catch (error) {
        console.error('getSessionInsights error:', error);
        res.status(500).json({ error: 'Failed to generate session insights' });
    }
};

export const getGlobalInsights = async (req, res) => {
    try {
        const userId = req.user.id;

        const [summary, globalWeakAreas] = await Promise.all([
            analyticsModel.getUserPerformanceSummary(userId),
            analyticsModel.getGlobalWeakAreas(userId),
        ]);

        const analyticsContext = JSON.stringify({
            summary,
            globalWeakAreas,
        });

        const model = process.env.OLLAMA_TEXT_MODEL;

        const response = await ollama.chat({
            model,
            messages: [
                {
                    role: "system",
                    content: globalInsightPrompt
                },
                {
                    role: "user",
                    content: `Based on this overall learning data across all subjects, provide a comprehensive performance analysis and a strategic study plan for the coming week.
                    Highlight the critical subjects and topics that need immediate attention. Provide 3 specific, data-driven study goals.
                    Analytics Data:
                    ${analyticsContext}`
                }
            ],
            stream: false
        });

        const result = response.message?.content || 'Global insights unavailable.';
        res.status(200).json({ insight: result });
    } catch (error) {
        console.error('getGlobalInsights error:', error);
        res.status(500).json({ error: 'Failed to generate global insights' });
    }
};
