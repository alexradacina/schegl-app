import axios from "axios";
//const API_BASE_URL = "http://schlegel.test/api"
const API_BASE_URL = "https://schlegl.devserver12.com/api";
// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
});
// Request interceptor to add auth token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("auth_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});
// Response interceptor to handle auth errors
api.interceptors.response.use((response) => response, (error) => {
    if (error.response?.status === 401) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");
        window.location.href = "/login";
    }
    return Promise.reject(error);
});
// Auth API endpoints
export const authAPI = {
    login: (credentials) => api.post("/login", credentials),
    logout: () => api.post("/logout"),
    me: () => api.get("/me"),
    user: () => api.get("/user"),
};
// Assignments API endpoints
export const assignmentsAPI = {
    getAll: (params) => api.get("/route-assignments", { params }),
    getById: (id) => api.get(`/route-assignments/${id}`),
    updateStatus: (id, status) => api.put(`/route-assignments/${id}/status`, { status }),
};
// Machines API endpoints
export const machinesAPI = {
    getAll: () => api.get("/machines"),
    getById: (id) => api.get(`/machines/${id}`),
    create: (data) => api.post("/machines", data),
    update: (id, data) => api.put(`/machines/${id}`, data),
    delete: (id) => api.delete(`/machines/${id}`),
};
// Machine Orders API endpoints
export const machineOrdersAPI = {
    getAll: () => api.get("/machine-orders"),
    getById: (id) => api.get(`/machine-orders/${id}`),
    create: (data) => api.post("/machine-orders", data),
    updateStatus: (id, data) => api.patch(`/machine-orders/${id}/status`, data),
    assignTemplate: (id, templateId) => api.patch(`/machine-orders/${id}/template`, { template_id: templateId }),
};
// Templates API endpoints
export const templatesAPI = {
    getAll: () => api.get("/machine-order-templates"),
    getById: (id) => api.get(`/machine-order-templates/${id}`),
};
// Route Assignments API endpoints
export const routeAssignmentsAPI = {
    getAll: () => api.get("/route-assignments"),
    getById: (id) => api.get(`/route-assignments/${id}`),
    updateStatus: (id, data) => api.patch(`/route-assignments/${id}/status`, data),
    getRouteMessages: () => api.get("/route-messages"),
};
export default api;
//# sourceMappingURL=api.js.map
