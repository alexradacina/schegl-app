import { ref, onMounted, onUnmounted } from "vue"
import { Network } from "@capacitor/network"

export function useNetworkStatus() {
  const isOnline = ref(true)
  const connectionType = ref<string>("unknown")
  const onOnlineCallbacks: Array<() => void> = []

  let networkListener: any = null
  let onlineTimeout: NodeJS.Timeout | null = null

  const checkNetworkStatus = async () => {
    try {
      isOnline.value = false
      const status = await Network.getStatus()
      isOnline.value = status.connected
      connectionType.value = status.connectionType
      console.log("[v0] Network status:", status)
    } catch (error) {
      console.error("[v0] Error checking network status:", error)
      // Fallback to navigator.onLine
      isOnline.value = navigator.onLine
    }
  }

  const onOnline = (callback: () => void) => {
    onOnlineCallbacks.push(callback)
  }

  const startListening = async () => {
    await checkNetworkStatus()

    try {
      networkListener = await Network.addListener("networkStatusChange", (status) => {
        console.log("[v0] Network status changed:", status)
        const wasOffline = !isOnline.value
        isOnline.value = status.connected
        connectionType.value = status.connectionType

        if (wasOffline && status.connected) {
          console.log("[v0] Network came online, waiting 3 seconds before syncing...")
          if (onlineTimeout) {
            clearTimeout(onlineTimeout)
          }
          onlineTimeout = setTimeout(() => {
            console.log("[v0] Network stable, triggering online callbacks")
            onOnlineCallbacks.forEach((callback) => callback())
          }, 3000)
        }
      })
    } catch (error) {
      console.error("[v0] Error adding network listener:", error)
      // Fallback to window events
      window.addEventListener("online", () => {
        const wasOffline = !isOnline.value
        isOnline.value = true

        if (wasOffline) {
          console.log("[v0] Network came online (fallback), waiting 3 seconds...")
          if (onlineTimeout) {
            clearTimeout(onlineTimeout)
          }
          onlineTimeout = setTimeout(() => {
            console.log("[v0] Network stable (fallback), triggering online callbacks")
            onOnlineCallbacks.forEach((callback) => callback())
          }, 3000)
        }
      })
      window.addEventListener("offline", () => {
        isOnline.value = false
      })
    }
  }

  const stopListening = async () => {
    if (onlineTimeout) {
      clearTimeout(onlineTimeout)
    }
    if (networkListener) {
      await networkListener.remove()
    }
    window.removeEventListener("online", () => {})
    window.removeEventListener("offline", () => {})
  }

  onMounted(() => {
    startListening()
  })

  onUnmounted(() => {
    stopListening()
  })

  return {
    isOnline,
    connectionType,
    checkNetworkStatus,
    onOnline, // Export the callback registration function
  }
}
