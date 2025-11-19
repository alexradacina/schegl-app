import { defineStore } from "pinia"
import { ref, computed } from "vue"
import api from "@/services/api"
import { useOfflineStorage } from "@/composables/useOfflineStorage"
import { useNetworkStatus } from "@/composables/useNetworkStatus"
import { useAssignmentsStore } from "./assignments"

export const useMachinesStore = defineStore("machines", () => {
  const machines = ref<any[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const { addToOfflineQueue, getOfflineData, saveOfflineData } = useOfflineStorage()
  const { isOnline } = useNetworkStatus()

  const fetchMachines = async (useCache = false) => {
    const assignmentsStore = useAssignmentsStore()

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
      const allMachines: any[] = []

      assignmentsStore.assignments.forEach((assignment: any) => {
        if (assignment.machines && Array.isArray(assignment.machines)) {
          allMachines.push(...assignment.machines)
        }
      })

      const uniqueMachines = Array.from(new Map(allMachines.map(m => [m.id, m])).values())
      machines.value = [...uniqueMachines, ...offlineMachines]

      await saveOfflineData("machines", machines.value)

      console.log("[v0] Machines loaded from assignments:", machines.value.length)
    } catch (err: any) {
      console.error("Error fetching machines:", err)
      error.value = err.message || "Failed to fetch machines"

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

  const addMachine = async (machine: any) => {
    if (!machine) return

    if (!Array.isArray(machines.value)) {
      machines.value = []
    }

    const existingIndex = machines.value.findIndex(m => m.id === machine.id)
    if (existingIndex >= 0) {
      machines.value[existingIndex] = machine
    } else {
      machines.value.push(machine)
    }

    await saveOfflineData("machines", machines.value)
    console.log("[v0] Machine added to store:", machine)
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

        await addToOfflineQueue({
          id: offlineId,
          type: "machine",
          data: machineData,
          timestamp: Date.now(),
          synced: false,
          action: "create",
        })

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
        if (!Array.isArray(machines.value)) {
          machines.value = []
        }

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
    addMachine,
    createMachine,
    getMachineSyncStatus,
    removeSyncedOfflineMachines,
  }
})
