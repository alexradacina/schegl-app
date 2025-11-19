import { defineStore } from "pinia"
import { ref } from "vue"
import { trackingTimesAPI } from "@/services/api"
import { useAssignmentsStore } from "./assignments"
import { useOfflineStorage } from "@/composables/useOfflineStorage"

export interface TrackingTime {
  id?: number | string
  order_id?: number
  assignment_id: number | null
  type: "driving" | "work" | "pause"
  description: string | null
  start_date: string
  end_date: string | null
  duration_minutes?: number | null
  formatted_duration?: string
  order?: any
  address?: any
  synced?: boolean
}

export const useTrackingTimesStore = defineStore("trackingTimes", () => {
  const trackingTimes = ref<TrackingTime[]>([])
  const currentTracking = ref<TrackingTime | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const fetchTrackingTimes = async (date?: string) => {
    isLoading.value = true
    error.value = null

    try {
      const assignmentsStore = useAssignmentsStore()

      trackingTimes.value = assignmentsStore.trackingTimes || []

      const { getOfflineTrackingTimes } = useOfflineStorage()
      const offlineTrackingTimes = await getOfflineTrackingTimes()

      if (offlineTrackingTimes.length > 0) {
        console.log("[v0] Merging offline tracking times:", offlineTrackingTimes)
        trackingTimes.value = [...trackingTimes.value, ...offlineTrackingTimes]
      }

      currentTracking.value = trackingTimes.value.find((t) => !t.end_date) || null
    } catch (err: any) {
      error.value = err.message || "Failed to fetch tracking times"
      console.error("Error fetching tracking times:", err)
    } finally {
      isLoading.value = false
    }
  }

  const createTrackingTime = async (data: Partial<TrackingTime>) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await trackingTimesAPI.create(data)

      if (response.data.success) {
        const newTracking = response.data.data.tracking_time
        trackingTimes.value.push(newTracking)

        if (!newTracking.end_date) {
          currentTracking.value = newTracking
        }

        return { success: true, data: newTracking }
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || "Failed to create tracking time"
      console.error("Error creating tracking time:", err)
      return { success: false, message: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const updateTrackingTime = async (id: number, data: Partial<TrackingTime>) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await trackingTimesAPI.update(id, data)

      if (response.data.success) {
        const updatedTracking = response.data.data.tracking_time
        const index = trackingTimes.value.findIndex((t) => t.id === id)

        if (index !== -1) {
          trackingTimes.value[index] = updatedTracking
        }

        if (currentTracking.value?.id === id && updatedTracking.end_date) {
          currentTracking.value = null
        }

        return { success: true, data: updatedTracking }
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || "Failed to update tracking time"
      console.error("Error updating tracking time:", err)
      return { success: false, message: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const deleteTrackingTime = async (id: number | string) => {
    isLoading.value = true
    error.value = null

    try {
      if (typeof id === 'string') {
        const { updateOfflineTrackingTime } = useOfflineStorage()
        await updateOfflineTrackingTime(id, { deleted: true })
        trackingTimes.value = trackingTimes.value.filter((t) => t.id !== id)

        if (currentTracking.value?.id === id) {
          currentTracking.value = null
        }

        return { success: true }
      }

      const response = await trackingTimesAPI.delete(id as number)

      if (response.data.success) {
        trackingTimes.value = trackingTimes.value.filter((t) => t.id !== id)

        if (currentTracking.value?.id === id) {
          currentTracking.value = null
        }

        return { success: true }
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || "Failed to delete tracking time"
      console.error("Error deleting tracking time:", err)
      return { success: false, message: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const syncMultipleTrackingTimes = async (items: any[]) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await trackingTimesAPI.storeMultiple({ items })

      if (response.data.success) {
        const assignmentsStore = useAssignmentsStore()
        await assignmentsStore.fetchAssignments()

        trackingTimes.value = assignmentsStore.trackingTimes || []
        currentTracking.value = trackingTimes.value.find((t) => !t.end_date) || null

        return { success: true, data: response.data }
      }

      return { success: false }
    } catch (err: any) {
      error.value = err.response?.data?.message || "Failed to sync tracking times"
      console.error("Error syncing tracking times:", err)
      return { success: false, message: error.value }
    } finally {
      isLoading.value = false
    }
  }

  return {
    trackingTimes,
    currentTracking,
    isLoading,
    error,
    fetchTrackingTimes,
    createTrackingTime,
    updateTrackingTime,
    deleteTrackingTime,
    syncMultipleTrackingTimes,
  }
})
