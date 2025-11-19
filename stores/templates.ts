import { defineStore } from "pinia"
import { ref } from "vue"
import { templatesAPI } from "@/services/api"
import { Filesystem, Directory } from '@capacitor/filesystem'
import { useNetworkStatus } from '@/composables/useNetworkStatus'

export const useTemplatesStore = defineStore("templates", () => {
  const templates = ref<any[]>([])
  const currentTemplate = ref<any>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isCached = ref(false)

  const { isOnline } = useNetworkStatus()

  const CACHE_KEY = 'machine_order_templates_cache'
  const CACHE_TIMESTAMP_KEY = 'machine_order_templates_cache_timestamp'
  const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds

  const ensureDirectoryExists = async () => {
    try {
      // Try to read directory to check if it exists
      await Filesystem.readdir({
        path: 'templates',
        directory: Directory.Data,
      })
      // Directory exists, no need to create
    } catch (err: any) {
      // Directory doesn't exist, create it
      try {
        await Filesystem.mkdir({
          path: 'templates',
          directory: Directory.Data,
          recursive: true
        })
      } catch (mkdirErr: any) {
        // Ignore if directory was created by another concurrent call
        if (!mkdirErr.message?.includes('exists')) {
          console.error('[v0] Error creating directory:', mkdirErr)
        }
      }
    }
  }

  const cacheImage = async (imageUrl: string, templateId: number): Promise<string> => {
    try {
      if (!imageUrl) return ''

      await ensureDirectoryExists()

      let base64Data: string

      if (imageUrl.startsWith('data:image')) {
        base64Data = imageUrl.split(',')[1]
      } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        const response = await fetch(imageUrl)
        if (!response.ok) {
          return imageUrl // Return original URL if fetch fails
        }

        const blob = await response.blob()
        base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => {
            const result = reader.result as string
            const base64 = result.split(',')[1] // Remove data URL prefix
            resolve(base64)
          }
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
      } else {
        return imageUrl
      }

      if (!base64Data || base64Data.trim() === '') {
        return imageUrl
      }

      const fileName = `template_${templateId}.jpg`
      await Filesystem.writeFile({
        path: `templates/${fileName}`,
        data: base64Data,
        directory: Directory.Data,
      })

      return fileName
    } catch (err) {
      console.error('[v0] Error caching image:', err)
      return imageUrl // Return original URL on error
    }
  }

  const getCachedImageUrl = async (fileName: string, originalUrl: string): Promise<string> => {
    try {
      if (!fileName || fileName.startsWith('http')) {
        return originalUrl
      }

      const result = await Filesystem.readFile({
        path: `templates/${fileName}`,
        directory: Directory.Data,
      })
      return `data:image/jpeg;base64,${result.data}`
    } catch (err) {
      return originalUrl // Return original URL if cache read fails
    }
  }

  const loadFromCache = (): boolean => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY)

      if (!cached || !timestamp) {
        return false
      }

      const cacheAge = Date.now() - parseInt(timestamp)
      if (cacheAge > CACHE_DURATION) {
        localStorage.removeItem(CACHE_KEY)
        localStorage.removeItem(CACHE_TIMESTAMP_KEY)
        return false
      }

      templates.value = JSON.parse(cached)
      isCached.value = true
      return true
    } catch (err) {
      console.error('[v0] Error loading templates from cache:', err)
      return false
    }
  }

  const saveToCache = async (templatesData: any[]) => {
    try {
      // Cache all images in parallel
      const templatesWithCachedImages = await Promise.all(
          templatesData.map(async (template) => {
            if (template.image_src) {
              const cachedFileName = await cacheImage(template.image_src, template.id)
              return {
                ...template,
                cached_image: cachedFileName, // Store cached file name
                original_image: template.image_src // Keep original URL as backup
              }
            }
            return template
          })
      )

      localStorage.setItem(CACHE_KEY, JSON.stringify(templatesWithCachedImages))
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString())
      templates.value = templatesWithCachedImages
      isCached.value = true
    } catch (err) {
      console.error('[v0] Error saving templates to cache:', err)
      // Still save to localStorage even if image caching fails
      localStorage.setItem(CACHE_KEY, JSON.stringify(templatesData))
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString())
      templates.value = templatesData
      isCached.value = true
    }
  }

  const fetchTemplates = async (forceRefresh: boolean = false) => {
    if (!forceRefresh && !isCached.value) {
      const loaded = loadFromCache()
      if (loaded) {
        return
      }
    }

    if (!forceRefresh && isCached.value && templates.value.length > 0) {
      return
    }

    if (!isOnline.value) {
      console.log('[v0] Offline mode: using cached templates only')
      if (!isCached.value) {
        loadFromCache()
      }
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const response = await templatesAPI.getAll()
      if (response.data.success) {
        const templatesData = response.data.data.templates || []
        await saveToCache(templatesData)
      } else {
        error.value = response.data.message || "Failed to fetch templates"
        templates.value = []
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || "Failed to fetch templates"

      if (!isCached.value) {
        loadFromCache()
      }
    } finally {
      isLoading.value = false
    }
  }

  const fetchTemplateById = async (id: number) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await templatesAPI.getById(id)
      if (response.data.success) {
        currentTemplate.value = response.data.data.template
        return response.data.data.template
      } else {
        error.value = response.data.message || "Failed to fetch template"
        return null
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || "Failed to fetch template"
      return null
    } finally {
      isLoading.value = false
    }
  }

  const getTemplateImageUrl = async (template: any): Promise<string> => {
    if (!template) return ''

    // Always try to use cached image first
    if (template.cached_image) {
      const cachedUrl = await getCachedImageUrl(template.cached_image, template.original_image || template.image_src)
      // If cached image is successfully loaded, return it
      if (cachedUrl && !cachedUrl.startsWith('http')) {
        return cachedUrl
      }
    }

    // Fall back to original URL if cache fails or doesn't exist
    return template.original_image || template.image_src || ''
  }

  return {
    templates,
    currentTemplate,
    isLoading,
    error,
    isCached,
    fetchTemplates,
    fetchTemplateById,
    getTemplateImageUrl,
  }
})
