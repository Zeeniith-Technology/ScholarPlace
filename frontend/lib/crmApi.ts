import axios from 'axios';

const crmApi = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
    headers: {
        'Content-Type': 'application/json',
    },
});

crmApi.interceptors.request.use((config) => {
    // Only access localStorage if in browser environment
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('crm_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

crmApi.interceptors.response.use(
    (response) => response.data,
    (error) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('crm_token');
                localStorage.removeItem('crm_user');
                // Clear the cookie too so middleware stops protecting routes
                document.cookie = 'crm_token=; path=/; max-age=0; SameSite=Strict';
                if (!window.location.pathname.includes('/crm/login')) {
                    window.location.href = '/crm/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

export default crmApi;
