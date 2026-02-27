import { generateResponse } from '../services/ai_service/response/index.js';
import * as topicModel from '../models/topicModel.js';
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
                    role: 'system',
                    content: 'You are an educational content organizer. You MUST respond with ONLY a valid JSON array. No markdown code fences, no explanation, no extra text. Just the raw JSON array.',
                },
                {
                    role: 'user',
                    content: `Parse the following syllabus into a structured JSON array of topics.
Each topic object must have: "name" (string, concise 2-6 words) and "children" (array of subtopic objects with the same structure, can be empty array []).

Example format:
[{"name": "Data Structures", "children": [{"name": "Arrays", "children": []}, {"name": "Linked Lists", "children": []}]}]

Syllabus:
${syllabusText}`,
                },
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
