import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Request interceptor - attach JWT token to all requests
api.interceptors.request.use(
    (config) => {
        // Only run in browser
        if (typeof window !== "undefined") {
            const token = localStorage.getItem("token");
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for handling errors (can handle 401 later)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Optional: auto-logout on 401
        if (error.response?.status === 401 && typeof window !== "undefined") {
            localStorage.removeItem("token");
            // Optionally redirect to login
            // window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);
