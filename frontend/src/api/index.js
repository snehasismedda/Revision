const BASE_URL = '/api';

export const request = async (path, options = {}) => {
    let res = await fetch(`${BASE_URL}${path}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        credentials: 'include',
        ...options,
        body: options.body ? JSON.stringify(options.body) : undefined,
    });

    // If 401, try to refresh once
    if (res.status === 401 && path !== '/auth/refresh' && path !== '/auth/login' && !options._retry) {
        try {
            const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
                method: 'POST',
                credentials: 'include',
            });
            if (refreshRes.ok) {
                // Retry original request
                res = await fetch(`${BASE_URL}${path}`, {
                    headers: { 'Content-Type': 'application/json', ...options.headers },
                    credentials: 'include',
                    ...options,
                    _retry: true,
                    body: options.body ? JSON.stringify(options.body) : undefined,
                });
            }
        } catch (e) {
            console.error('Refresh failed', e);
        }
    }

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
    forgotPassword: (body) => request('/auth/forgot-password', { method: 'POST', body }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    me: () => request('/auth/me'),
    updateProfile: (body) => request('/auth/me', { method: 'PUT', body }),
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
    overview: (subjectId) => {
        if (Array.isArray(subjectId)) {
            return request(`/analytics/overview?subjectIds=${subjectId.join(',')}`);
        }
        return request(`/analytics/${subjectId}/overview`);
    },
    topicPerformance: (subjectId) => request(`/analytics/${subjectId}/topic-performance`),
    trends: (subjectId) => request(`/analytics/${subjectId}/trends`),
    weakAreas: (subjectId) => request(`/analytics/${subjectId}/weak-areas`),
    testSeries: (seriesId) => request(`/analytics/test-series/${seriesId}`),
    test: (seriesId, testId) => request(`/analytics/test-series/${seriesId}/tests/${testId}`),
    testInsights: (seriesId, testId) => request(`/analytics/test-series/${seriesId}/tests/${testId}/insights`),
};

// AI
export const aiApi = {
    parseSyllabus: (body) => request('/ai/parse-syllabus', { method: 'POST', body }),
    insights: (subjectId) => request(`/ai/insights/${subjectId}`),
    sessionInsights: (subjectId, sessionId) => request(`/ai/insights/${subjectId}/sessions/${sessionId}`),
    globalInsights: () => request('/ai/global-insights'),
    parseNote: (body) => request('/ai/parse-note', { method: 'POST', body }),
    describeImage: (body) => request('/ai/describe-image', { method: 'POST', body }),
    enhanceNote: (body) => request('/ai/enhance-note', { method: 'POST', body }),
    editSection: (body) => request('/ai/edit-section', { method: 'POST', body }),
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
    list: (subjectId, limit, offset) => {
        let q = [];
        if (limit != null) q.push(`limit=${limit}`);
        if (offset != null) q.push(`offset=${offset}`);
        const qs = q.length ? '?' + q.join('&') : '';
        return request(`/subjects/${subjectId}/notes${qs}`);
    },
    getTags: (subjectId) => request(`/subjects/${subjectId}/notes/tags`),
    create: (subjectId, body) => request(`/subjects/${subjectId}/notes`, { method: 'POST', body }),
    update: (subjectId, noteId, body) => request(`/subjects/${subjectId}/notes/${noteId}`, { method: 'PUT', body }),
    delete: (subjectId, noteId) => request(`/subjects/${subjectId}/notes/${noteId}`, { method: 'DELETE' }),
    getImage: (subjectId, noteId) => request(`/subjects/${subjectId}/notes/${noteId}/image`),
};

// Revision Tracker
export const revisionApi = {
    listSessions: (subjectId) => request(`/subjects/${subjectId}/revision-tracker/sessions`),
    createSession: (subjectId, name, topicIds) =>
        request(`/subjects/${subjectId}/revision-tracker/sessions`, { method: 'POST', body: { name, topicIds } }),
    updateSession: (subjectId, sessionId, name, topicIds) =>
        request(`/subjects/${subjectId}/revision-tracker/sessions/${sessionId}`, { method: 'PUT', body: { name, topicIds } }),
    deleteSession: (subjectId, sessionId) =>
        request(`/subjects/${subjectId}/revision-tracker/sessions/${sessionId}`, { method: 'DELETE' }),
    toggleStatus: (subjectId, sessionId, topicId, status) =>
        request(`/subjects/${subjectId}/revision-tracker/sessions/${sessionId}/topics/${topicId}`, { method: 'PUT', body: { status } }),
    analytics: (subjectId) => request(`/subjects/${subjectId}/revision-tracker/analytics`),
};

// Solutions
export const solutionsApi = {
    list: (subjectId) => request(`/subjects/${subjectId}/solutions`),
    create: (subjectId, body) => request(`/subjects/${subjectId}/solutions`, { method: 'POST', body }),
    update: (subjectId, solutionId, body) => request(`/subjects/${subjectId}/solutions/${solutionId}`, { method: 'PUT', body }),
    delete: (subjectId, solutionId) => request(`/subjects/${subjectId}/solutions/${solutionId}`, { method: 'DELETE' }),
    getImage: (subjectId, solutionId) => request(`/subjects/${subjectId}/solutions/${solutionId}/image`),
};

// Images
export const imagesApi = {
    list: (limit, offset) => {
        let q = [];
        if (limit != null) q.push(`limit=${limit}`);
        if (offset != null) q.push(`offset=${offset}`);
        const qs = q.length ? '?' + q.join('&') : '';
        return request(`/images${qs}`);
    },
    listBySubject: (subjectId, limit, offset) => {
        let q = [];
        if (limit != null) q.push(`limit=${limit}`);
        if (offset != null) q.push(`offset=${offset}`);
        const qs = q.length ? '?' + q.join('&') : '';
        return request(`/images/subject/${subjectId}${qs}`);
    },
    saveAs: (body) => request('/images/save-as', { method: 'POST', body }),
};
