import { request } from './index.js';

export const getTestSeries = async () => {
    return await request('/test-series');
};

export const createTestSeries = async (data) => {
    return await request('/test-series', { method: 'POST', body: data });
};

export const getTestSeriesDetail = async (id) => {
    return await request(`/test-series/${id}`);
};

export const deleteTestSeries = async (id) => {
    return await request(`/test-series/${id}`, { method: 'DELETE' });
};

export const updateTestSeries = async (id, data) => {
    return await request(`/test-series/${id}`, { method: 'PUT', body: data });
};


