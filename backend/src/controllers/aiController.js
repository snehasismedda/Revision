import * as sessionModel from '../models/sessionModel.js';
import * as subjectModel from '../models/subjectModel.js';
import * as analyticsModel from '../models/analyticsModel.js';
import { ollama, models } from '../config/ollama.js';
import { syllabusPrompt, insightPrompt, globalInsightPrompt } from '../system_prompts/index.js';

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
        console.log('rawResult', JSON.stringify(rawResult, null, 2));

        let topics = [];
        try {
            const parsed = JSON.parse(rawResult);
            if (Array.isArray(parsed)) {
                topics = parsed;
            } else if (typeof parsed === 'object' && parsed !== null) {
                const arrayVal = Object.values(parsed).find(v => Array.isArray(v));
                topics = arrayVal || [];
            }
        } catch {
            try {
                const cleaned = rawResult.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim();
                const parsed = JSON.parse(cleaned);
                topics = Array.isArray(parsed) ? parsed : (parsed.topics || parsed.data || []);
            } catch {
                const arrayMatch = rawResult.match(/\[[\s\S]*\]/);
                if (arrayMatch) {
                    topics = JSON.parse(arrayMatch[0]);
                } else {
                    console.error('parseSyllabus: could not extract JSON from:', rawResult);
                    return res.status(422).json({ error: 'AI response was not valid JSON. Please try again.', raw: rawResult });
                }
            }
        }

        if (!Array.isArray(topics)) {
            return res.status(422).json({ error: 'AI returned unexpected format. Please try again.', raw: rawResult });
        }

        res.status(200).json({ topics });
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
