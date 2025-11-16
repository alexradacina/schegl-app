import { defineStore } from "pinia"
import { ref } from "vue"
import api from "@/services/api"
import { useOfflineStorage } from "@/composables/useOfflineStorage"
import { useNetworkStatus } from "@/composables/useNetworkStatus"

export interface Assignment {
  id: number
  date: string
  status: string
  number_of_items: number
  scheduled_time?: string
  notes?: string
  machines?: any[]
  machine_orders?: any[]
  order?: {
    id: number
    order_number?: string
    customer?: {
      name: string
    }
    finished?: number
  }
  address?: {
    street: string
    city: string
    postal_code: string
  }
}

export interface RouteMessage {
  id: number
  message: string
  type?: string
  created_at: string
  route_plan_date: string // The date of the route plan this message belongs to
}

export const useAssignmentsStore = defineStore("assignments", () => {
  const assignments = ref<Assignment[]>([])
  const currentAssignment = ref<Assignment | null>(null)
  const routeMessages = ref<RouteMessage[]>([])
  const trackingTimes = ref<any[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const { saveOfflineFile, getOfflineFile, offlineFileExists, saveOfflineData, getOfflineData, getAllOfflineKeys } =
      useOfflineStorage()
  const { isOnline } = useNetworkStatus()

  const fetchAssignments = async (fromDate?: string, toDate?: string, useCache = false) => {
    const cacheKey = `assignments_${fromDate}_${toDate}`
    if (!isOnline.value || useCache) {
      const cachedAssignments = await getOfflineData(cacheKey)
      if (cachedAssignments) {
        assignments.value = cachedAssignments
        console.log("[v0] Loaded assignments from cache")
        if (!isOnline.value) return
      }
    }

    isLoading.value = true
    error.value = null

    try {
      const params: any = {}

      if (fromDate && toDate) {
        params.from_date = fromDate
        params.to_date = toDate
      } else if (fromDate) {
        params.date = fromDate
      }

      const response = await api.get("/route-assignments", { params })
      if (response.data.success) {
        assignments.value = response.data.data || response.data.assignments || []
        routeMessages.value = response.data.messages || []
        trackingTimes.value = response.data.tracking_times || []

        await saveOfflineData(cacheKey, assignments.value)
      } else {
        error.value = response.data.message || "Failed to fetch assignments"
        assignments.value = []
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || "Failed to fetch assignments"

      const cachedAssignments = await getOfflineData(cacheKey)
      if (cachedAssignments) {
        assignments.value = cachedAssignments
        error.value = "Using cached data (offline)"
      } else {
        assignments.value = []
      }
    } finally {
      isLoading.value = false
    }
  }

  const fetchAssignmentById = async (id: number, forceRefresh = false) => {
    console.log("[v0] fetchAssignmentById called for ID:", id, "forceRefresh:", forceRefresh)

    if (!forceRefresh) {
      const cachedAssignment = assignments.value.find((a) => a.id === id)
      if (cachedAssignment) {
        currentAssignment.value = cachedAssignment
        console.log("[v0] Loaded assignment from in-memory cache:", id)
        return cachedAssignment
      }

      try {
        const allKeys = await getAllOfflineKeys()
        for (const key of allKeys) {
          if (key.startsWith("route_plan_")) {
            const routePlan = await getOfflineFile(key.replace("route_plan_", ""))
            if (routePlan && routePlan.assignments) {
              const foundAssignment = routePlan.assignments.find((a: Assignment) => a.id === id)
              if (foundAssignment) {
                currentAssignment.value = foundAssignment
                console.log("[v0] Loaded assignment from downloaded route plan:", id)
                return foundAssignment
              }
            }
          }
        }
      } catch (error) {
        console.error("[v0] Error checking route plans:", error)
      }

      const cachedAssignments = await getOfflineData("assignments")
      if (cachedAssignments) {
        const foundAssignment = cachedAssignments.find((a: Assignment) => a.id === id)
        if (foundAssignment) {
          currentAssignment.value = foundAssignment
          console.log("[v0] Loaded assignment from offline cache:", id)
          return foundAssignment
        }
      }
    }

    if (!isOnline.value) {
      console.error("[v0] Assignment not found in offline cache and device is offline")
      error.value = "Assignment not found in offline cache"
      currentAssignment.value = null
      return null
    }

    console.log("[v0] Fetching assignment from API:", id)
    isLoading.value = true
    error.value = null

    try {
      const response = await api.get(`/route-assignments/${id}`)
      if (response.data.success) {
        currentAssignment.value = response.data.data
        console.log("[v0] Assignment loaded from API:", id)
        return response.data.data
      } else {
        error.value = response.data.message || "Failed to fetch assignment"
        currentAssignment.value = null
        return null
      }
    } catch (err: any) {
      console.error("[v0] Error fetching assignment from API:", err)
      error.value = err.response?.data?.message || err.message || "Failed to fetch assignment"
      currentAssignment.value = null
      return null
    } finally {
      isLoading.value = false
    }
  }

  const fetchRouteMessages = async (fromDate?: string, toDate?: string) => {
    console.log("[v0] fetchRouteMessages: Messages are loaded via fetchAssignments")
  }

  const downloadRoutePlan = async (fromDate: string, toDate: string) => {
    try {
      const params: any = {
        from_date: fromDate,
        to_date: toDate,
      }

      const response = await api.get("/route-assignments", { params })

      const routePlan = {
        fromDate,
        toDate,
        assignments: response.data.success ? (response.data.data || response.data.assignments || []) : [],
        messages: response.data.success ? (response.data.messages || []) : [],
        trackingTimes: response.data.success ? (response.data.tracking_times || []) : [],
        downloadedAt: Date.now(),
      }

      const fileName = `route_plan_${fromDate}_${toDate}`
      await saveOfflineFile(fileName, routePlan)

      console.log("[v0] Route plan downloaded for offline use")
      return { success: true, message: "Route plan downloaded successfully" }
    } catch (error: any) {
      console.error("[v0] Error downloading route plan:", error)
      return { success: false, message: error.message || "Failed to download route plan" }
    }
  }

  const isRoutePlanAvailableOffline = async (fromDate: string, toDate: string) => {
    const fileName = `route_plan_${fromDate}_${toDate}`
    return await offlineFileExists(fileName)
  }

  const loadOfflineRoutePlan = async (fromDate: string, toDate: string) => {
    try {
      const fileName = `route_plan_${fromDate}_${toDate}`
      const routePlan = await getOfflineFile(fileName)

      if (routePlan) {
        assignments.value = routePlan.assignments
        routeMessages.value = routePlan.messages
        trackingTimes.value = routePlan.trackingTimes || []
        console.log("[v0] Loaded route plan from offline storage")
        return { success: true, data: routePlan }
      }

      return { success: false, message: "Route plan not found offline" }
    } catch (error: any) {
      console.error("[v0] Error loading offline route plan:", error)
      return { success: false, message: error.message }
    }
  }

  const updateAssignmentStatus = async (id: number, finished: number) => {
    try {
      const response = await api.patch(`/route-assignments/${id}/status`, {
        finished,
      })

      if (response.data.success) {
        if (currentAssignment.value && currentAssignment.value.id === id) {
          if (currentAssignment.value.order) {
            currentAssignment.value.order.finished = finished
          }
        }

        const assignment = assignments.value.find((a) => a.id === id)
        if (assignment && assignment.order) {
          assignment.order.finished = finished
        }

        return { success: true, message: response.data.message }
      } else {
        return { success: false, message: response.data.message || "Failed to update status" }
      }
    } catch (err: any) {
      console.error("Status update error:", err)
      return {
        success: false,
        message: err.response?.data?.message || err.message || "Failed to update status",
      }
    }
  }

  const clearError = () => {
    error.value = null
  }

  const clearCurrentAssignment = () => {
    currentAssignment.value = null
  }

  return {
    assignments,
    currentAssignment,
    routeMessages,
    trackingTimes,
    isLoading,
    error,
    fetchAssignments,
    fetchAssignmentById,
    fetchRouteMessages,
    updateAssignmentStatus,
    downloadRoutePlan,
    isRoutePlanAvailableOffline,
    loadOfflineRoutePlan,
    clearError,
    clearCurrentAssignment,
  }
})
