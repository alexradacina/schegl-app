import { defineStore } from "pinia"
import { ref } from "vue"
import { machineOrdersAPI } from "@/services/api"
import { useAssignmentsStore } from "./assignments"

export const useMachineOrdersStore = defineStore("machineOrders", () => {
  const machineOrders = ref<any[]>([])
  const currentMachineOrder = ref<any>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const fetchMachineOrders = async () => {
    isLoading.value = true
    error.value = null

    try {
      const assignmentsStore = useAssignmentsStore()

      const allMachineOrders: any[] = []

      assignmentsStore.assignments.forEach((assignment: any) => {
        if (assignment.machine_orders && Array.isArray(assignment.machine_orders)) {
          allMachineOrders.push(...assignment.machine_orders)
        }
      })

      machineOrders.value = Array.from(new Map(allMachineOrders.map(mo => [mo.id, mo])).values())

      console.log("[v0] Machine orders loaded from assignments:", machineOrders.value.length)
    } catch (err: any) {
      error.value = err.message || "Failed to fetch machine orders"
    } finally {
      isLoading.value = false
    }
  }

  const fetchMachineOrderById = async (id: number) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await machineOrdersAPI.getById(id)
      if (response.data.success) {
        currentMachineOrder.value = response.data.data.machine_order
        return response.data.data.machine_order
      } else {
        error.value = response.data.message || "Failed to fetch machine order"
        return null
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || "Failed to fetch machine order"
      return null
    } finally {
      isLoading.value = false
    }
  }

  const createMachineOrder = async (data: any) => {
    try {
      const response = await machineOrdersAPI.create(data)

      if (response.data.success) {
        if (response.data.data?.machine_order) {
          machineOrders.value.push(response.data.data.machine_order)
        }
        return { success: true, data: response.data.data }
      } else {
        return {
          success: false,
          message: response.data.message || "Failed to create machine order",
          data: response.data.data,
        }
      }
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || "Failed to create machine order",
        data: err.response?.data?.data,
      }
    }
  }

  const updateMachineOrderStatus = async (id: number, data: any) => {
    try {
      const response = await machineOrdersAPI.updateStatus(id, data)

      if (response.data.success) {
        const index = machineOrders.value.findIndex((order) => order.id === id)
        if (index !== -1) {
          machineOrders.value[index] = { ...machineOrders.value[index], ...response.data.data.machine_order }
        }

        if (currentMachineOrder.value?.id === id) {
          currentMachineOrder.value = { ...currentMachineOrder.value, ...response.data.data.machine_order }
        }

        return { success: true, data: response.data.data }
      } else {
        return { success: false, message: response.data.message || "Failed to update status" }
      }
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || "Failed to update status",
      }
    }
  }

  const assignTemplate = async (id: number, templateId: number | null) => {
    try {
      const response = await machineOrdersAPI.assignTemplate(id, templateId)

      if (response.data.success) {
        const index = machineOrders.value.findIndex((order) => order.id === id)
        if (index !== -1) {
          machineOrders.value[index] = { ...machineOrders.value[index], ...response.data.data.machine_order }
        }

        if (currentMachineOrder.value?.id === id) {
          currentMachineOrder.value = { ...currentMachineOrder.value, ...response.data.data.machine_order }
        }

        return { success: true, data: response.data.data }
      } else {
        return { success: false, message: response.data.message || "Failed to assign template" }
      }
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || "Failed to assign template",
      }
    }
  }

  return {
    machineOrders,
    currentMachineOrder,
    isLoading,
    error,
    fetchMachineOrders,
    fetchMachineOrderById,
    createMachineOrder,
    updateMachineOrderStatus,
    assignTemplate,
  }
})
