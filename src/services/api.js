import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
    timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS) || 30000, // Sync with env timeout or fallback to 30s
    headers: {
        'ngrok-skip-browser-warning': 'true',
    },
});

// Inject JWT Bearer token and user context headers on every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('pms_token');
    const userStr = localStorage.getItem('pms_user');
    
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    // --- Global Parameter Sanitization ---
    // Remove empty string parameters that cause 422/500 backend errors.
    // Ensure from_date/to_date/start_date/end_date are never empty.
    if (config.params) {
        Object.keys(config.params).forEach(key => {
            const val = config.params[key];
            if (val === '' || val === null || val === undefined) {
                // Remove empty or null params
                delete config.params[key];
            } else if (['from_date', 'to_date', 'start_date', 'end_date'].includes(key) && typeof val === 'string' && val.length < 10) {
                // Remove partial/invalid dates
                delete config.params[key];
            }
        });
    }

    // Add employee context headers if available
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            if (user.emp_id || user.id) {
                config.headers['X-EMP-ID'] = user.emp_id || user.id;
            }
            if (user.role) {
                config.headers['X-USER-ROLE'] = user.role.toUpperCase();
            }
        } catch (e) {
            console.warn('[API] Failed to parse user for headers');
        }
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

        const isBlob = error.config?.responseType === 'blob';

        if (status === 401) {
            // Skip the redirect for auth endpoints (login, etc.) — let the caller handle it
            if (!url.includes('/auth/')) {
                localStorage.removeItem('pms_token');
                localStorage.removeItem('pms_user');
                window.location.href = '/login';
            }
        } else if (status === 422) {
            // Blob requests handle their own error display — skip global toast
            if (!isBlob) {
                const detail = error.response?.data?.detail;
                const msg = Array.isArray(detail)
                    ? detail.map(d => d.msg).join(', ')
                    : (detail || 'Invalid input. Please check your data.');
                toast.error(msg);
            }
        } else if (status === 400 || status === 409) {
            // Blob requests (downloads/exports) handle their own error display — skip global toast
            if (!isBlob) toast.error(message);
        } else if (status === 403) {
            // Gracefully resolve 403s ONLY for GET requests for authenticated users.
            // State-changing actions (POST, PUT, DELETE) must fail explicitly so users 
            // know their action (like approval or deletion) was not performed.
            try {
                const savedUser = JSON.parse(localStorage.getItem('pms_user') || '{}');
                const isGet = error.config?.method?.toLowerCase() === 'get';
                
                // We should NOT mock data for blob/binary requests (like downloads) 
                // as it would return a corrupted file (the dummy JSON as a blob).
                if (savedUser?.role && isGet && !isBlob) {
                    console.warn(`[API] 403 Forbidden on ${url} for role ${savedUser.role}. Resolving gracefully.`);
                    return Promise.resolve({ data: { data: [], notifications: [], items: [], status: 'success' } });
                }
            } catch (e) { /* ignore */ }

            // Not authenticated or not a GET request — failure
            if (!localStorage.getItem('pms_token')) {
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);


export default api;
