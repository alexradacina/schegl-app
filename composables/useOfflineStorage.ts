import { Preferences } from "@capacitor/preferences"
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem"
import { Capacitor } from "@capacitor/core"

export interface OfflineItem {
  id: string
  type: "machine" | "assignment" | "machineOrder" | "drawing"
  data: any
  timestamp: number
  synced: boolean
  action: "create" | "update" | "delete"
}

export function useOfflineStorage() {
  const OFFLINE_QUEUE_KEY = "offline_sync_queue"
  const OFFLINE_DATA_PREFIX = "offline_data_"

  const isNative = Capacitor.isNativePlatform()

  // Save item to offline queue
  const addToOfflineQueue = async (item: OfflineItem) => {
    try {
      const { value } = await Preferences.get({ key: OFFLINE_QUEUE_KEY })
      const queue: OfflineItem[] = value ? JSON.parse(value) : []

      queue.push(item)

      await Preferences.set({
        key: OFFLINE_QUEUE_KEY,
        value: JSON.stringify(queue),
      })

      console.log("[v0] Added to offline queue:", item)
      return true
    } catch (error) {
      console.error("[v0] Error adding to offline queue:", error)
      return false
    }
  }

  // Get all items from offline queue
  const getOfflineQueue = async (): Promise<OfflineItem[]> => {
    try {
      const { value } = await Preferences.get({ key: OFFLINE_QUEUE_KEY })
      return value ? JSON.parse(value) : []
    } catch (error) {
      console.error("[v0] Error getting offline queue:", error)
      return []
    }
  }

  // Remove item from offline queue
  const removeFromOfflineQueue = async (itemId: string) => {
    try {
      const queue = await getOfflineQueue()
      const updatedQueue = queue.filter((item) => item.id !== itemId)

      await Preferences.set({
        key: OFFLINE_QUEUE_KEY,
        value: JSON.stringify(updatedQueue),
      })

      console.log("[v0] Removed from offline queue:", itemId)
      return true
    } catch (error) {
      console.error("[v0] Error removing from offline queue:", error)
      return false
    }
  }

  // Mark item as synced
  const markAsSynced = async (itemId: string) => {
    try {
      const queue = await getOfflineQueue()
      const updatedQueue = queue.map((item) => (item.id === itemId ? { ...item, synced: true } : item))

      await Preferences.set({
        key: OFFLINE_QUEUE_KEY,
        value: JSON.stringify(updatedQueue),
      })

      return true
    } catch (error) {
      console.error("[v0] Error marking as synced:", error)
      return false
    }
  }

  // Clear synced items from queue
  const clearSyncedItems = async () => {
    try {
      const queue = await getOfflineQueue()
      const unsyncedQueue = queue.filter((item) => !item.synced)

      await Preferences.set({
        key: OFFLINE_QUEUE_KEY,
        value: JSON.stringify(unsyncedQueue),
      })

      return true
    } catch (error) {
      console.error("[v0] Error clearing synced items:", error)
      return false
    }
  }

  // Save data for offline use
  const saveOfflineData = async (key: string, data: any) => {
    try {
      await Preferences.set({
        key: `${OFFLINE_DATA_PREFIX}${key}`,
        value: JSON.stringify(data),
      })
      return true
    } catch (error) {
      console.error("[v0] Error saving offline data:", error)
      return false
    }
  }

  // Get offline data
  const getOfflineData = async (key: string) => {
    try {
      const { value } = await Preferences.get({ key: `${OFFLINE_DATA_PREFIX}${key}` })
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.error("[v0] Error getting offline data:", error)
      return null
    }
  }

  const getAllOfflineKeys = async (): Promise<string[]> => {
    try {
      const { keys } = await Preferences.keys()
      return keys.filter((key) => key.startsWith(OFFLINE_DATA_PREFIX))
    } catch (error) {
      console.error("[v0] Error getting offline keys:", error)
      return []
    }
  }

  // Save large files (like route plans) to filesystem
  const saveOfflineFile = async (fileName: string, data: any) => {
    try {
      const jsonData = JSON.stringify(data)

      if (isNative) {
        // Native: Use Capacitor Filesystem
        await Filesystem.writeFile({
          path: `offline/${fileName}.json`,
          data: jsonData,
          directory: Directory.Data,
          encoding: Encoding.UTF8,
          recursive: true,
        })
      } else {
        // Web: Use localStorage as fallback
        localStorage.setItem(`offline_file_${fileName}`, jsonData)
      }

      console.log("[v0] Saved offline file:", fileName)
      return true
    } catch (error) {
      console.error("[v0] Error saving offline file:", error)
      return false
    }
  }

  // Get offline file
  const getOfflineFile = async (fileName: string) => {
    try {
      if (isNative) {
        // Native: Use Capacitor Filesystem
        const result = await Filesystem.readFile({
          path: `offline/${fileName}.json`,
          directory: Directory.Data,
          encoding: Encoding.UTF8,
        })
        return JSON.parse(result.data as string)
      } else {
        // Web: Use localStorage as fallback
        const data = localStorage.getItem(`offline_file_${fileName}`)
        return data ? JSON.parse(data) : null
      }
    } catch (error) {
      console.error("[v0] Error getting offline file:", error)
      return null
    }
  }

  // Check if file exists
  const offlineFileExists = async (fileName: string): Promise<boolean> => {
    try {
      if (isNative) {
        // Native: Check filesystem
        await Filesystem.stat({
          path: `offline/${fileName}.json`,
          directory: Directory.Data,
        })
        return true
      } else {
        // Web: Check localStorage
        return localStorage.getItem(`offline_file_${fileName}`) !== null
      }
    } catch (error) {
      return false
    }
  }

  return {
    addToOfflineQueue,
    getOfflineQueue,
    removeFromOfflineQueue,
    markAsSynced,
    clearSyncedItems,
    saveOfflineData,
    getOfflineData,
    getAllOfflineKeys,
    saveOfflineFile,
    getOfflineFile,
    offlineFileExists,
  }
}
