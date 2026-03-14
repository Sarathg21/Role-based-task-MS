import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000',
    timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS) || 15000,
    headers: {
        'ngrok-skip-browser-warning': 'true',
    },
});

// Inject JWT Bearer token on every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('pms_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
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
            // Gracefully resolve 403s for all authenticated users.
            // API-level 403s usually mean "you don't have permission for this specific
            // endpoint", not "you are on the wrong page". Page-level access control
            // is already enforced by ProtectedRoute in React.
            // We only hard-redirect if the user is NOT authenticated at all.
            try {
                const savedUser = JSON.parse(localStorage.getItem('pms_user') || '{}');
                if (savedUser?.role) {
                    // Authenticated user hit a 403 on an API call — resolve gracefully
                    console.warn(`[API] 403 Forbidden on ${url} for role ${savedUser.role}. Resolving gracefully.`);
                    return Promise.resolve({ data: { data: [], notifications: [], items: [], status: 'success' } });
                }
            } catch (e) { /* ignore */ }

            // Not authenticated — redirect to login, not access-denied
            window.location.href = '/login';

        }

        return Promise.reject(error);
    }
);


export default api;
