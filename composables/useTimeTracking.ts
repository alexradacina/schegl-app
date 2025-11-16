import { useTrackingTimesStore, type TrackingTime } from "@/stores/trackingTimes"
import { useOfflineStorage, type OfflineItem } from "@/composables/useOfflineStorage"
import { useNetworkStatus } from "@/composables/useNetworkStatus"

export function useTimeTracking() {
  const trackingStore = useTrackingTimesStore()
  const { addToOfflineQueue, getOfflineData, saveOfflineData } = useOfflineStorage()
  const { isOnline } = useNetworkStatus()

  const formatDateTime = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const hours = String(date.getHours()).padStart(2, "0")
    const minutes = String(date.getMinutes()).padStart(2, "0")
    const seconds = String(date.getSeconds()).padStart(2, "0")

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }

  const startTracking = async (data: Partial<TrackingTime>) => {
    const trackingData = {
      ...data,
      start_date: formatDateTime(new Date()),
      end_date: null,
    }

    if (isOnline.value) {
      return await trackingStore.createTrackingTime(trackingData)
    } else {
      // Save offline
      const offlineItem: OfflineItem = {
        id: `tracking_${Date.now()}`,
        type: "create",
        data: trackingData,
        timestamp: Date.now(),
        synced: false,
        action: "create",
      }

      await addToOfflineQueue(offlineItem)
      await saveOfflineData("current_tracking", trackingData)

      return { success: true, offline: true }
    }
  }

  const stopTracking = async (id: number) => {
    const updateData = {
      end_date: formatDateTime(new Date()),
    }

    if (isOnline.value) {
      return await trackingStore.updateTrackingTime(id, updateData)
    } else {
      // Save offline
      const offlineItem: OfflineItem = {
        id: `tracking_update_${Date.now()}`,
        type: "update",
        data: { id, ...updateData },
        timestamp: Date.now(),
        synced: false,
        action: "update",
      }

      await addToOfflineQueue(offlineItem)
      await saveOfflineData("current_tracking", null)

      return { success: true, offline: true }
    }
  }

  const updateAndRestart = async (currentId: number, newData: Partial<TrackingTime>) => {
    // Stop current tracking
    const stopResult = await stopTracking(currentId)

    if (stopResult.success) {
      // Start new tracking with updated data
      return await startTracking(newData)
    }

    return stopResult
  }

  return {
    startTracking,
    stopTracking,
    updateAndRestart,
    formatDateTime,
  }
}
