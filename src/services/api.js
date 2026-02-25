import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
});

// Inject JWT token on every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('pms_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
