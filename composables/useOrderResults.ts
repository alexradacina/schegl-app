import { ref } from "vue"
import { orderResultsAPI } from "@/services/api"

export interface OrderResult {
  id?: number
  order_id: number
  machine_order_id?: number | null
  type: "notes" | "template"
  image_path?: string
  image_url?: string
  data?: any
  created_at?: string
  updated_at?: string
}

export function useOrderResults() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const getOrderResults = async (filters?: {
    order_id?: number
    machine_order_id?: number
    type?: "notes" | "template"
  }) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await orderResultsAPI.getAll(filters)

      if (response.data.success) {
        return {
          success: true,
          results: response.data.data.results || [],
          total: response.data.data.total || 0,
        }
      } else {
        error.value = response.data.message || "Failed to fetch order results"
        return { success: false, results: [], total: 0 }
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || "Failed to fetch order results"
      console.error("[v0] Error fetching order results:", err)
      return { success: false, results: [], total: 0 }
    } finally {
      isLoading.value = false
    }
  }

  const getOrderResultById = async (id: number) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await orderResultsAPI.getById(id)

      if (response.data.success) {
        return {
          success: true,
          result: response.data.data.result,
        }
      } else {
        error.value = response.data.message || "Failed to fetch order result"
        return { success: false, result: null }
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || "Failed to fetch order result"
      console.error("[v0] Error fetching order result:", err)
      return { success: false, result: null }
    } finally {
      isLoading.value = false
    }
  }

  const createOrderResult = async (
    order_id: number,
    type: "notes" | "template",
    canvasData?: any,
    imageBlob?: Blob,
    machine_order_id?: number | null,
  ) => {
    isLoading.value = true
    error.value = null

    try {
      const formData = new FormData()
      formData.append("order_id", order_id.toString())
      formData.append("type", type)

      if (machine_order_id) {
        formData.append("machine_order_id", machine_order_id.toString())
      }

      if (canvasData) {
        formData.append("data", JSON.stringify(canvasData))
      }

      if (imageBlob) {
        formData.append("image", imageBlob, `${type}_${order_id}_${Date.now()}.png`)
      }

      console.log("[v0] Creating order result:", {
        order_id,
        machine_order_id,
        type,
        hasData: !!canvasData,
        hasImage: !!imageBlob,
      })

      const response = await orderResultsAPI.create(formData)

      if (response.data.success) {
        console.log("[v0] Order result created successfully:", response.data.data.result)
        return {
          success: true,
          result: response.data.data.result,
          message: response.data.message,
        }
      } else {
        error.value = response.data.message || "Failed to create order result"
        return { success: false, result: null, message: error.value }
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || "Failed to create order result"
      console.error("[v0] Error creating order result:", err)
      return { success: false, result: null, message: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const updateOrderResult = async (
    id: number,
    updates: {
      type?: "notes" | "template"
      canvasData?: any
      imageBlob?: Blob
    },
  ) => {
    isLoading.value = true
    error.value = null

    try {
      const formData = new FormData()

      if (updates.type) {
        formData.append("type", updates.type)
      }

      if (updates.canvasData) {
        formData.append("data", JSON.stringify(updates.canvasData))
      }

      if (updates.imageBlob) {
        formData.append("image", updates.imageBlob, `updated_${id}_${Date.now()}.png`)
      }

      console.log("[v0] Updating order result:", id, {
        hasType: !!updates.type,
        hasData: !!updates.canvasData,
        hasImage: !!updates.imageBlob,
      })

      const response = await orderResultsAPI.create(formData)

      if (response.data.success) {
        console.log("[v0] Order result updated successfully:", response.data.data.result)
        return {
          success: true,
          result: response.data.data.result,
          message: response.data.message,
        }
      } else {
        error.value = response.data.message || "Failed to update order result"
        return { success: false, result: null, message: error.value }
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || "Failed to update order result"
      console.error("[v0] Error updating order result:", err)
      return { success: false, result: null, message: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const deleteOrderResult = async (id: number) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await orderResultsAPI.delete(id)

      if (response.data.success) {
        console.log("[v0] Order result deleted successfully:", id)
        return {
          success: true,
          message: response.data.message,
        }
      } else {
        error.value = response.data.message || "Failed to delete order result"
        return { success: false, message: error.value }
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || "Failed to delete order result"
      console.error("[v0] Error deleting order result:", err)
      return { success: false, message: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const canvasToBlob = async (canvas: any): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!canvas) {
        resolve(null)
        return
      }

      try {
        const dataURL = canvas.toDataURL("image/png", 1.0)
        fetch(dataURL)
          .then((res) => res.blob())
          .then((blob) => resolve(blob))
          .catch(() => resolve(null))
      } catch (error) {
        console.error("[v0] Error converting canvas to blob:", error)
        resolve(null)
      }
    })
  }

  return {
    isLoading,
    error,
    getOrderResults,
    getOrderResultById,
    createOrderResult,
    updateOrderResult,
    deleteOrderResult,
    canvasToBlob,
  }
}
