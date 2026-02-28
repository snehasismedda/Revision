const BASE_URL = '/api';

const request = async (path, options = {}) => {
    const res = await fetch(`${BASE_URL}${path}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        credentials: 'include',
        ...options,
        body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
    }

    return data;
};

// Auth
export const authApi = {
    register: (body) => request('/auth/register', { method: 'POST', body }),
    login: (body) => request('/auth/login', { method: 'POST', body }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    me: () => request('/auth/me'),
    refresh: () => request('/auth/refresh', { method: 'POST' }),
};

// Subjects
export const subjectsApi = {
    list: () => request('/subjects'),
    get: (id) => request(`/subjects/${id}`),
    create: (body) => request('/subjects', { method: 'POST', body }),
    update: (id, body) => request(`/subjects/${id}`, { method: 'PUT', body }),
    delete: (id) => request(`/subjects/${id}`, { method: 'DELETE' }),
};

// Topics
export const topicsApi = {
    list: (subjectId) => request(`/subjects/${subjectId}/topics`),
    create: (subjectId, body) => request(`/subjects/${subjectId}/topics`, { method: 'POST', body }),
    bulkCreate: (subjectId, body) => request(`/subjects/${subjectId}/topics/bulk`, { method: 'POST', body }),
    update: (subjectId, topicId, body) => request(`/subjects/${subjectId}/topics/${topicId}`, { method: 'PUT', body }),
    delete: (subjectId, topicId) => request(`/subjects/${subjectId}/topics/${topicId}`, { method: 'DELETE' }),
};

// Sessions
export const sessionsApi = {
    list: (subjectId) => request(`/subjects/${subjectId}/sessions`),
    get: (subjectId, sessionId) => request(`/subjects/${subjectId}/sessions/${sessionId}`),
    create: (subjectId, body) => request(`/subjects/${subjectId}/sessions`, { method: 'POST', body }),
    update: (subjectId, sessionId, body) => request(`/subjects/${subjectId}/sessions/${sessionId}`, { method: 'PUT', body }),
    delete: (subjectId, sessionId) => request(`/subjects/${subjectId}/sessions/${sessionId}`, { method: 'DELETE' }),
};

// Entries
export const entriesApi = {
    list: (sessionId) => request(`/sessions/${sessionId}/entries`),
    create: (sessionId, body) => request(`/sessions/${sessionId}/entries`, { method: 'POST', body }),
    update: (sessionId, body) => request(`/sessions/${sessionId}/entries`, { method: 'PUT', body }),
};

// Analytics
export const analyticsApi = {
    overview: (subjectId) => request(`/analytics/${subjectId}/overview`),
    topicPerformance: (subjectId) => request(`/analytics/${subjectId}/topic-performance`),
    trends: (subjectId) => request(`/analytics/${subjectId}/trends`),
    weakAreas: (subjectId) => request(`/analytics/${subjectId}/weak-areas`),
};

// AI
export const aiApi = {
    parseSyllabus: (body) => request('/ai/parse-syllabus', { method: 'POST', body }),
    insights: (subjectId) => request(`/ai/insights/${subjectId}`),
    sessionInsights: (subjectId, sessionId) => request(`/ai/insights/${subjectId}/sessions/${sessionId}`),
    globalInsights: () => request('/ai/global-insights')
};

// Questions
export const questionsApi = {
    list: (subjectId) => request(`/subjects/${subjectId}/questions`),
    create: (subjectId, body) => request(`/subjects/${subjectId}/questions`, { method: 'POST', body }),
    update: (subjectId, questionId, body) => request(`/subjects/${subjectId}/questions/${questionId}`, { method: 'PUT', body }),
    delete: (subjectId, questionId) => request(`/subjects/${subjectId}/questions/${questionId}`, { method: 'DELETE' }),
    getImage: (subjectId, questionId) => request(`/subjects/${subjectId}/questions/${questionId}/image`),
};

// Notes
export const notesApi = {
    list: (subjectId) => request(`/subjects/${subjectId}/notes`),
    create: (subjectId, body) => request(`/subjects/${subjectId}/notes`, { method: 'POST', body }),
    delete: (subjectId, noteId) => request(`/subjects/${subjectId}/notes/${noteId}`, { method: 'DELETE' }),
};
