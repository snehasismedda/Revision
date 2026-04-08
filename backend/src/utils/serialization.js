/**
 * Recursively scans an object and converts all Date instances to ISO strings.
 * This ensures the frontend receives strings that are easy to parse and consistent.
 */
export const serializeDates = (obj) => {
    if (obj instanceof Date) {
        return obj.toISOString();
    }
    
    if (Array.isArray(obj)) {
        return obj.map(serializeDates);
    }
    
    if (obj !== null && typeof obj === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = serializeDates(value);
        }
        return result;
    }
    
    return obj;
};

/**
 * Express middleware to automatically serialize Date objects in all JSON responses.
 */
export const dateSerializationMiddleware = (req, res, next) => {
    const originalJson = res.json;
    res.json = function (body) {
        return originalJson.call(this, serializeDates(body));
    };
    next();
};
