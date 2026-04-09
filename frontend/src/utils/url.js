import { API_BASE_URL } from '../config/api';

/**
 * Resolves a photo URL by prepending the API_BASE_URL if it's a relative path.
 * If the URL is already absolute (e.g., S3, Cloudinary), it returns it as is.
 * @param {string} url - The image URL or relative path
 * @returns {string} - The fully qualified URL or placeholder if null
 */
export const resolvePhotoUrl = (url) => {
    if (!url) return null;

    // If it's an absolute URL (starts with http or https), return it
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    // If it's a data URL, return it
    if (url.startsWith('data:')) {
        return url;
    }

    // If it's a frontend asset path (dev or prod) or a placeholder, return it
    if (
        url.startsWith('/src/') ||
        url.startsWith('/@fs/') ||
        url.startsWith('/assets/') ||
        url.startsWith('/static/') ||
        url === '/placeholder.svg'
    ) {
        return url;
    }

    // Prepend API_BASE_URL to relative paths
    // Ensure relative paths start with a slash
    const relativePath = url.startsWith('/') ? url : `/${url}`;
    return `${API_BASE_URL}${relativePath}`;
};
