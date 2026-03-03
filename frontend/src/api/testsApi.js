import { request } from './index.js';

export const createTest = async (seriesId, data) => {
    return await request(`/test-series/${seriesId}/tests`, { method: 'POST', body: data });
};

export const getTestDetail = async (seriesId, testId) => {
    return await request(`/test-series/${seriesId}/tests/${testId}`);
};

export const submitTestResult = async (seriesId, testId, subjectId, data) => {
    return await request(`/test-series/${seriesId}/tests/${testId}/subjects/${subjectId}/results`, { method: 'POST', body: data });
};

export const deleteTest = async (seriesId, testId) => {
    return await request(`/test-series/${seriesId}/tests/${testId}`, { method: 'DELETE' });
};

export const updateTest = async (seriesId, testId, data) => {
    return await request(`/test-series/${seriesId}/tests/${testId}`, { method: 'PUT', body: data });
};

