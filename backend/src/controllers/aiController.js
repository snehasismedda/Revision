import { generateResponse } from '../services/ai_service/response/index.js';
import * as topicModel from '../models/topicModel.js';
import * as sessionModel from '../models/sessionModel.js';
import * as subjectModel from '../models/subjectModel.js';
import * as analyticsModel from '../models/analyticsModel.js';

export const parseSyllabus = async (req, res) => {
    try {
        const { syllabusText, subjectId } = req.body;
        if (!syllabusText) return res.status(400).json({ error: 'syllabusText is required' });

        const subject = await subjectModel.findSubjectByIdAndUser({
            id: subjectId,
            userId: req.user.id,
        });
        if (!subject) return res.status(404).json({ error: 'Subject not found' });

        // Call Ollama directly without the tool-calling pipeline
        // The agentic tools confuse the model when we just need structured JSON
        const ollama = (await import('../config/ollama.js')).default;
        const model = process.env.OLLAMA_MODEL || 'qwen2.5:7b';

        const response = await ollama.chat({
            model,
            messages: [
                {
                    role: "system",
                    content: `
            You are a precise educational syllabus parser and hierarchy builder.

            Your task is to convert raw syllabus text into a clean, logically structured JSON topic tree.

            STRICT OUTPUT RULES (MANDATORY):
            - Output ONLY a valid JSON array.
            - DO NOT include markdown, explanations, comments, or extra text.
            - DO NOT wrap output in code fences.
            - The response must be directly JSON.parse() compatible.
            - Never include trailing commas.
            - Never invent topics not implied by the syllabus.
            - Preserve conceptual hierarchy from the syllabus.

            STRUCTURE RULES:
            - Each object MUST contain:
            - "name": concise topic title (2–6 words, normalized wording).
            - "children": array of subtopics using the SAME structure.
            - If a topic has no subtopics, use an empty array [].
            - Maintain consistent granularity across sibling topics.
            - Merge duplicates or synonymous topics.
            - Avoid overly long names, numbering, or descriptions.

            NORMALIZATION RULES:
            - Remove numbering, bullets, and formatting artifacts.
            - Convert long phrases into short academic topic names.
            - Prefer standard computer science terminology.
            - Keep hierarchy shallow but meaningful (avoid unnecessary nesting).

            VALIDATION BEFORE OUTPUT:
            - Ensure valid JSON syntax.
            - Ensure every node has both "name" and "children".
            - Ensure root output is a JSON array.

            Return ONLY the JSON array.
            `
                },
                {
                    role: "user",
                    content: `Parse the following syllabus into a structured JSON array of topics.
            Each topic object must have: "name" (string, concise 2-6 words) and "children" (array of subtopic objects with the same structure, can be empty array []).

            Example format:
            [{"name": "Data Structures", "children": [{"name": "Arrays", "children": []}, {"name": "Linked Lists", "children": []}]}]

            Syllabus:
            ${syllabusText}`
                }
            ],
            stream: false,
            format: 'json',
        });

        const rawResult = response.message?.content || '';

        let topics = [];
        try {
            // Try direct parse first
            const parsed = JSON.parse(rawResult);
            if (Array.isArray(parsed)) {
                topics = parsed;
            } else if (typeof parsed === 'object' && parsed !== null) {
                // Find the first array value in the object (AI may use any key name)
                const arrayVal = Object.values(parsed).find(v => Array.isArray(v));
                topics = arrayVal || [];
            }
        } catch {
            // Fallback: extract JSON array from response
            try {
                // Remove markdown code fences if present
                const cleaned = rawResult.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim();
                const parsed = JSON.parse(cleaned);
                topics = Array.isArray(parsed) ? parsed : (parsed.topics || parsed.data || []);
            } catch {
                // Last resort: find the first [ ... ] in the text
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

        const [overview, weakAreas, trends] = await Promise.all([
            analyticsModel.getSubjectOverview({ subjectId }),
            analyticsModel.getWeakAreas({ subjectId, minEncounters: 1 }),
            analyticsModel.getSessionTrends({ subjectId }),
        ]);

        const analyticsContext = JSON.stringify({ overview, weakAreas: weakAreas.slice(0, 5), recentTrends: trends.slice(-5) });

        const result = await generateResponse({
            model: 'qwen',
            query: `Based on this learning analytics data for the subject "${subject.name}", provide a brief, actionable performance summary in 3-4 sentences. Highlight the biggest weak area, mention whether performance is improving or declining, and give one specific study recommendation.

Analytics Data:
${analyticsContext}`,
            history: [],
            systemPrompt: 'You are a personalized learning coach. Provide direct, encouraging, and specific advice based on data. Do not use bullet points. Write in natural paragraph form.',
            subjectId,
        });

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

        const bestTopics = topics.filter(t => t.accuracy >= 75).slice(0, 3);
        const weakTopics = topics.filter(t => t.accuracy < 50).slice(0, 3);

        const analyticsContext = JSON.stringify({
            sessionTitle: session.title,
            sessionAccuracy: accuracy,
            totalQuestions: total,
            bestTopics,
            weakTopics,
            notes: session.notes
        });

        const result = await generateResponse({
            model: 'qwen',
            query: `Based on this single study session's data, provide a brief, actionable performance summary in 3-4 sentences. Mention what went well, highlight the main topic that needs revision, and give one specific piece of advice for the next session.
            
Analytics Data:
${analyticsContext}`,
            history: [],
            systemPrompt: `You are a personalized learning coach analyzing a single study session. Provide direct, encouraging, and specific advice and actionable Next Steps
            - Specific recommendations for the next session
            - What to continue, adjust, or stop doing`,
            subjectId,
        });

        res.status(200).json({ insight: result });
    } catch (error) {
        console.error('getSessionInsights error:', error);
        res.status(500).json({ error: 'Failed to generate session insights' });
    }
};
