import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
    baseURL: 'http://127.0.0.1:8000',
});

// Inject JWT Bearer token on every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('pms_token');
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor for global error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response ? error.response.status : null;
        const message = error.response?.data?.detail || error.message || 'An unexpected error occurred';
        const url = error.config?.url || '';

        if (status === 401) {
            // Skip the redirect for auth endpoints (login, etc.) — let the caller handle it
            if (!url.includes('/auth/')) {
                localStorage.removeItem('pms_token');
                localStorage.removeItem('pms_user');
                window.location.href = '/login';
            }
        } else if (status === 422) {
            // Validation error — surface the details as a toast
            const detail = error.response?.data?.detail;
            const msg = Array.isArray(detail)
                ? detail.map(d => d.msg).join(', ')
                : (detail || 'Invalid input. Please check your data.');
            toast.error(msg);
        } else if (status === 400 || status === 409) {
            toast.error(message);
        } else if (status === 403) {
            window.location.href = '/access-denied';
        }

        return Promise.reject(error);
    }
);


export default api;
