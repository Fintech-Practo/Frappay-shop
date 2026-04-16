import axios from 'axios';


const rawBaseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
export const API_BASE_URL = rawBaseURL.endsWith('/') ? rawBaseURL.slice(0, -1) : rawBaseURL;
// Create axios instance with base URL
const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});



api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 503) {
            // Prevent redirect loop and allow admin logins
            try {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                const isAdmin = user?.role === 'ADMIN';

                if (!isAdmin && window.location.pathname !== '/maintenance' && !window.location.pathname.startsWith('/admin') && !window.location.pathname.startsWith('/login')) {
                    window.location.href = '/maintenance';
                }
            } catch (e) {
                // Fallback if localStorage parse fails
                window.location.href = '/maintenance';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
