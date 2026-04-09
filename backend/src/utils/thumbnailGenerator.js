import sharp from 'sharp';

/**
 * Generates a thumbnail for a given file content (base64 or buffer).
 * @param {string|Buffer} content - The file content.
 * @param {string} fileType - The type of file ('image', 'pdf', etc.).
 * @returns {Promise<string|null>} - The thumbnail as a base64 string, or null if failed.
 */
export const generateThumbnail = async (content, fileType) => {
    try {
        let buffer;
        if (typeof content === 'string' && content.startsWith('data:')) {
            // Remove data URI prefix
            const base64Data = content.split(',')[1];
            buffer = Buffer.from(base64Data, 'base64');
        } else if (typeof content === 'string') {
            buffer = Buffer.from(content, 'base64');
        } else {
            buffer = content;
        }

        if (fileType === 'image') {
            const thumbnailBuffer = await sharp(buffer)
                .resize(300, 400, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .toFormat('webp')
                .toBuffer();

            return `data:image/webp;base64,${thumbnailBuffer.toString('base64')}`;
        }

        // For PDF, we'd need another library or a specifically configured sharp.
        // For now, return null or a generic PDF icon if possible.
        // If the user wants PDF thumbnails, we might need pdf-img-convert.
        return null;
    } catch (error) {
        console.error('[generateThumbnail] Error:', error);
        return null;
    }
};
