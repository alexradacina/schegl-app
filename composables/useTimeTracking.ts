import { useTrackingTimesStore, type TrackingTime } from "@/stores/trackingTimes"
import { useOfflineStorage } from "@/composables/useOfflineStorage"
import { useNetworkStatus } from "@/composables/useNetworkStatus"

export function useTimeTracking() {
  const trackingStore = useTrackingTimesStore()
  const {
    getOfflineTrackingTimes,
    addOfflineTrackingTime,
    updateOfflineTrackingTime,
    clearOfflineTrackingTimes,
  } = useOfflineStorage()
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
      const result = await trackingStore.createTrackingTime(trackingData)
      return result
    } else {
      // Save offline with temporary ID
      const offlineTracking = {
        ...trackingData,
        id: `offline_${Date.now()}`,
        tracking_time_id: null,
        synced: false,
      }

      await addOfflineTrackingTime(offlineTracking)

      // Add to store immediately for UI update
      trackingStore.trackingTimes.push(offlineTracking as any)
      trackingStore.currentTracking = offlineTracking as any

      console.log("[v0] Started tracking offline:", offlineTracking)
      return { success: true, data: offlineTracking, offline: true }
    }
  }

  const stopTracking = async (id: number | string) => {
    const endDate = formatDateTime(new Date())

    if (isOnline.value && typeof id === 'number') {
      const result = await trackingStore.updateTrackingTime(id, { end_date: endDate })
      return result
    } else {
      // Update offline tracking
      await updateOfflineTrackingTime(String(id), { end_date: endDate })

      // Update in store for UI
      const tracking = trackingStore.trackingTimes.find((t: any) => t.id === id)
      if (tracking) {
        tracking.end_date = endDate
      }
      trackingStore.currentTracking = null

      console.log("[v0] Stopped tracking offline:", id)
      return { success: true, offline: true }
    }
  }

  const updateAndRestart = async (currentId: number | string, newData: Partial<TrackingTime>) => {
    // Stop current tracking
    const stopResult = await stopTracking(currentId)

    if (stopResult.success) {
      // Start new tracking with updated data
      return await startTracking(newData)
    }

    return stopResult
  }

  const syncOfflineTrackingTimes = async () => {
    console.log("[v0] Starting tracking times sync...")
    const offlineTrackingTimes = await getOfflineTrackingTimes()

    if (offlineTrackingTimes.length === 0) {
      return { success: true, synced: 0 }
    }

    const validOfflineItems = offlineTrackingTimes.filter((t: any) => !t.deleted)

    if (validOfflineItems.length === 0) {
      await clearOfflineTrackingTimes()
      return { success: true, synced: 0 }
    }

    // Prepare items for the API
    const items = validOfflineItems.map((t: any) => ({
      tracking_time_id: typeof t.id === 'string' ? null : t.id,
      assignment_id: t.assignment_id,
      type: t.type,
      description: t.description,
      start_date: t.start_date,
      end_date: t.end_date,
    }))

    try {
      const result = await trackingStore.syncMultipleTrackingTimes(items)

      if (result.success) {
        await clearOfflineTrackingTimes()
        console.log("[v0] Successfully synced tracking times")
        return { success: true, synced: items.length }
      }

      return { success: false, message: "Sync failed" }
    } catch (error) {
      console.error("[v0] Error syncing tracking times:", error)
      return { success: false, error }
    }
  }

  return {
    startTracking,
    stopTracking,
    updateAndRestart,
    syncOfflineTrackingTimes,
    formatDateTime,
  }
}
