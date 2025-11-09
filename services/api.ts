import axios from "axios"

const API_BASE_URL = "http://schlegel.test/api"
//const API_BASE_URL = "https://schlegl.devserver12.com/api"

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
})

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("auth_token")
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    },
)

// Response interceptor to handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("auth_token")
            localStorage.removeItem("user")
            window.location.href = "/login"
        }
        return Promise.reject(error)
    },
)

// Auth API endpoints
export const authAPI = {
    login: (credentials: { email: string; password: string }) => api.post("/login", credentials),
    logout: () => api.post("/logout"),
    me: () => api.get("/me"),
    user: () => api.get("/user"),
}

// Assignments API endpoints
export const assignmentsAPI = {
    getAll: (params?: any) => api.get("/route-assignments", { params }),
    getById: (id: number) => api.get(`/route-assignments/${id}`),
    updateStatus: (id: number, status: string) => api.put(`/route-assignments/${id}/status`, { status }),
}

// Machines API endpoints
export const machinesAPI = {
    getAll: () => api.get("/machines"),
    getById: (id: number) => api.get(`/machines/${id}`),
    create: (data: any) => api.post("/machines", data),
    update: (id: number, data: any) => api.put(`/machines/${id}`, data),
    delete: (id: number) => api.delete(`/machines/${id}`),
}

// Machine Orders API endpoints
export const machineOrdersAPI = {
    getAll: () => api.get("/machine-orders"),
    getById: (id: number) => api.get(`/machine-orders/${id}`),
    create: (data: any) => api.post("/machine-orders", data),
    updateStatus: (id: number, data: any) => api.patch(`/machine-orders/${id}/status`, data),
    assignTemplate: (id: number, templateId: number | null) =>
        api.patch(`/machine-orders/${id}/template`, { template_id: templateId }),
}

// Templates API endpoints
export const templatesAPI = {
    getAll: () => api.get("/machine-order-templates"),
    getById: (id: number) => api.get(`/machine-order-templates/${id}`),
}

// Route Assignments API endpoints
export const routeAssignmentsAPI = {
    getAll: () => api.get("/route-assignments"),
    getById: (id: number) => api.get(`/route-assignments/${id}`),
    updateStatus: (id: number, data: any) => api.patch(`/route-assignments/${id}/status`, data),
    getRouteMessages: () => api.get("/route-messages"),
}

// Order Results API endpoints
export const orderResultsAPI = {
    getAll: (params?: any) => api.get("/order-results", { params }),
    getById: (id: number) => api.get(`/order-results/${id}`),
    create: (formData: FormData) =>
        api.post("/order-results", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        }),
    update: (id: number, formData: FormData) =>
        api.put(`/order-results/${id}`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        }),
    delete: (id: number) => api.delete(`/order-results/${id}`),
}

export default api
