import axios from "axios";

const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/",
});

// Add JWT token automatically
API.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("access_token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Handle expired token / unauthorized requests
API.interceptors.response.use(
    (response) => response,
    async (error) => {
        const url = error.config?.url || "";
        if (
            error.response?.status === 401 &&
            !url.includes("auth/login/") &&
            !url.includes("auth/register/")
        ) {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            localStorage.removeItem("username");
            window.location.href = "/";
        }
        return Promise.reject(error);
    }
);

// Disease Prediction APIs
export const getSymptoms = () => API.get("symptoms/");
export const getHistory = () => API.get("history/");
export const predictDisease = (data) => API.post("predict/", data);
export const extractSymptoms = (text) => API.post("extract-symptoms/", { text });

// Authentication APIs
export const loginUser = (data) => API.post("auth/login/", data);
export const registerUser = (data) => API.post("auth/register/", data);

export default API;