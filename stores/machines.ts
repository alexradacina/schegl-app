import { defineStore } from "pinia"
import { ref } from "vue"
import api from "@/services/api"
import { useOfflineStorage } from "@/composables/useOfflineStorage"
import { useNetworkStatus } from "@/composables/useNetworkStatus"

export const useMachinesStore = defineStore("machines", () => {
  const machines = ref<any[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const { addToOfflineQueue, getOfflineData, saveOfflineData } = useOfflineStorage()
  const { isOnline } = useNetworkStatus()

  const fetchMachines = async (useCache = false) => {
    // Get offline machines first
    const cachedMachines = await getOfflineData("machines")
    const offlineMachines = cachedMachines ? cachedMachines.filter((m: any) => m._offline && !m._synced) : []

    if (!isOnline.value || useCache) {
      if (cachedMachines) {
        machines.value = cachedMachines
        console.log("[v0] Loaded machines from cache")
        if (!isOnline.value) return
      }
    }

    isLoading.value = true
    error.value = null

    try {
      const response = await api.get("/machines")
      console.log("Machines API response:", response.data)

      if (response.data.success) {
        // Handle both possible response structures
        const machinesData = response.data.data?.machines || response.data.data || []
        const apiMachines = Array.isArray(machinesData) ? machinesData : []

        // Merge API machines with offline machines
        machines.value = [...apiMachines, ...offlineMachines]

        await saveOfflineData("machines", machines.value)

        console.log("Machines loaded:", machines.value)
      } else {
        error.value = response.data.message || "Failed to fetch machines"
        machines.value = offlineMachines
      }
    } catch (err: any) {
      console.error("Error fetching machines:", err)
      error.value = err.response?.data?.message || err.message || "Failed to fetch machines"

      if (cachedMachines) {
        machines.value = cachedMachines
        error.value = "Using cached data (offline)"
      } else {
        machines.value = offlineMachines
      }
    } finally {
      isLoading.value = false
    }
  }

  const createMachine = async (machineData: any) => {
    try {
      console.log("Creating machine with data:", machineData)

      if (!isOnline.value) {
        const offlineId = `offline_${Date.now()}`
        const newMachine = {
          ...machineData,
          id: offlineId,
          _offline: true,
          _synced: false,
        }

        // Add to offline queue
        await addToOfflineQueue({
          id: offlineId,
          type: "machine",
          data: machineData,
          timestamp: Date.now(),
          synced: false,
          action: "create",
        })

        // Add to local list
        if (!Array.isArray(machines.value)) {
          machines.value = []
        }
        machines.value.push(newMachine)

        await saveOfflineData("machines", machines.value)

        console.log("[v0] Machine added offline:", newMachine)
        return { success: true, data: newMachine, offline: true }
      }

      const response = await api.post("/machines", machineData)
      console.log("Create machine response:", response.data)

      if (response.data.success) {
        // Ensure machines is an array before pushing
        if (!Array.isArray(machines.value)) {
          machines.value = []
        }

        // Add the new machine to the list - handle both possible response structures
        const newMachine = response.data.data?.machine || response.data.data
        if (newMachine) {
          machines.value.push(newMachine)

          await saveOfflineData("machines", machines.value)

          console.log("Machine added to list:", newMachine)
        }
        return { success: true, data: newMachine }
      } else {
        return { success: false, message: response.data.message || "Failed to create machine" }
      }
    } catch (err: any) {
      console.error("Error creating machine:", err)
      return {
        success: false,
        message: err.response?.data?.message || err.message || "Failed to create machine",
      }
    }
  }

  const getMachineSyncStatus = (machine: any) => {
    if (machine._offline && !machine._synced) {
      return "pending"
    }
    if (machine._offline && machine._synced) {
      return "synced"
    }
    return "saved"
  }

  const removeSyncedOfflineMachines = async () => {
    machines.value = machines.value.filter((m: any) => !m._offline || !m._synced)
    await saveOfflineData("machines", machines.value)
  }

  return {
    machines,
    isLoading,
    error,
    fetchMachines,
    createMachine,
    getMachineSyncStatus,
    removeSyncedOfflineMachines,
  }
})
