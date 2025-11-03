import { ref } from "vue"
import { useNetworkStatus } from "./useNetworkStatus"
import { useOfflineStorage, type OfflineItem } from "./useOfflineStorage"
import api from "@/services/api"

export function useOfflineSync() {
  const { isOnline } = useNetworkStatus()
  const { getOfflineQueue, removeFromOfflineQueue, markAsSynced, clearSyncedItems } = useOfflineStorage()

  const isSyncing = ref(false)
  const syncProgress = ref(0)
  const syncTotal = ref(0)

  // Sync all offline items
  const syncOfflineData = async () => {
    if (!isOnline.value || isSyncing.value) {
      console.log("[v0] Cannot sync: offline or already syncing")
      return { success: false, message: "Cannot sync while offline or already syncing" }
    }

    isSyncing.value = true
    const queue = await getOfflineQueue()
    syncTotal.value = queue.length
    syncProgress.value = 0

    console.log("[v0] Starting sync of", queue.length, "items")

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    }

    for (const item of queue) {
      if (item.synced) {
        syncProgress.value++
        continue
      }

      try {
        const result = await syncItem(item)

        if (result.success) {
          await markAsSynced(item.id)
          results.success++
          console.log("[v0] Synced item:", item.type, item.id)
        } else {
          results.failed++
          results.errors.push(`${item.type} ${item.id}: ${result.message}`)
          console.error("[v0] Failed to sync item:", item.type, item.id, result.message)
        }
      } catch (error: any) {
        results.failed++
        results.errors.push(`${item.type} ${item.id}: ${error.message}`)
        console.error("[v0] Error syncing item:", error)
      }

      syncProgress.value++
    }

    // Clear synced items
    await clearSyncedItems()

    isSyncing.value = false
    syncProgress.value = 0
    syncTotal.value = 0

    console.log("[v0] Sync complete:", results)

    return {
      success: results.failed === 0,
      message: `Synced ${results.success} items${results.failed > 0 ? `, ${results.failed} failed` : ""}`,
      results,
    }
  }

  // Sync individual item
  const syncItem = async (item: OfflineItem): Promise<{ success: boolean; message: string }> => {
    try {
      switch (item.type) {
        case "machine":
          return await syncMachine(item)
        case "assignment":
          return await syncAssignment(item)
        case "machineOrder":
          return await syncMachineOrder(item)
        default:
          return { success: false, message: "Unknown item type" }
      }
    } catch (error: any) {
      return { success: false, message: error.message }
    }
  }

  // Sync machine
  const syncMachine = async (item: OfflineItem) => {
    try {
      if (item.action === "create") {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

        try {
          const response = await api.post("/machines", item.data, {
            signal: controller.signal,
          })
          clearTimeout(timeoutId)

          if (response.data.success) {
            console.log("[v0] Machine synced successfully:", response.data)
            return { success: true, message: "Machine created" }
          }
          return { success: false, message: response.data.message || "Failed to create machine" }
        } catch (error: any) {
          clearTimeout(timeoutId)

          if (
              error.code === "ECONNABORTED" ||
              error.message.includes("timeout") ||
              error.message.includes("Network Error")
          ) {
            console.error("[v0] Network timeout or no internet connection")
            return { success: false, message: "No internet connection - will retry later" }
          }

          throw error
        }
      }
      return { success: false, message: "Unsupported action" }
    } catch (error: any) {
      console.error("[v0] Error syncing machine:", error)
      return { success: false, message: error.response?.data?.message || error.message }
    }
  }

  // Sync assignment
  const syncAssignment = async (item: OfflineItem) => {
    try {
      if (item.action === "update") {
        const response = await api.patch(`/route-assignments/${item.data.id}/status`, {
          status: item.data.status,
          notes: item.data.notes,
        })
        if (response.data.success) {
          return { success: true, message: "Assignment updated" }
        }
        return { success: false, message: response.data.message || "Failed to update assignment" }
      }
      return { success: false, message: "Unsupported action" }
    } catch (error: any) {
      return { success: false, message: error.response?.data?.message || error.message }
    }
  }

  // Sync machine order
  const syncMachineOrder = async (item: OfflineItem) => {
    try {
      if (item.action === "create") {
        const response = await api.post("/machine-orders", item.data)
        if (response.data.success) {
          return { success: true, message: "Machine order created" }
        }
        return { success: false, message: response.data.message || "Failed to create machine order" }
      }
      return { success: false, message: "Unsupported action" }
    } catch (error: any) {
      return { success: false, message: error.response?.data?.message || error.message }
    }
  }

  return {
    isSyncing,
    syncProgress,
    syncTotal,
    syncOfflineData,
  }
}
