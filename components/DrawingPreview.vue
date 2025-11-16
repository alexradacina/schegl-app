<template>
  <div class="drawing-preview-container">
    <div class="notes-layout">
      <!-- Edit Icon -->
      <div class="edit-icon" @click.stop.prevent="openDrawingModal">
        <ion-icon :icon="create"></ion-icon>
      </div>

      <!-- Preview or Grid Background with Button Overlay -->
      <div class="preview-wrapper" @click.stop.prevent="openDrawingModal">
        <!-- Grid background always visible -->
        <div class="grid-background-full">
          <!-- Grid background always visible -->
        </div>
        <div v-if="drawingPreviewUrl" class="drawing-preview-full">
          <img :src="drawingPreviewUrl" alt="Drawing preview" />
        </div>

        <!-- Dynamic button label based on machineOrderId, resultType, and preview existence -->
        <ion-button fill="outline" size="small" class="add-note-btn" @click.stop.prevent="openDrawingModal">
          {{ buttonLabel }}
        </ion-button>
      </div>
    </div>

    <!-- Set display: none to completely remove canvas from layout -->
    <canvas ref="previewCanvas" style="display: none;"></canvas>
  </div>

  <DrawingModal
      v-show="showDrawingModal"
      :is-open="showDrawingModal"
      :drawing-id="drawingId"
      :initial-image-url="initialImageUrl || ''"
      :order-id="orderId"
      :machine-order-id="machineOrderId"
      :result-type="resultType"
      @close="handleDrawingClose"
  />
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { IonIcon, IonButton } from '@ionic/vue'
import { brushOutline, addOutline, createOutline, create } from 'ionicons/icons'
import DrawingModal from '@/components/DrawingModal.vue'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Capacitor } from '@capacitor/core'
import { fabric } from 'fabric'

interface Props {
  drawingId: string
  title?: string
  initialImageUrl?: string
  orderId?: number
  machineOrderId?: number
  resultType?: 'notes' | 'template'
}

const props = defineProps<Props>()

const drawingPreviewUrl = ref('')
const previewCanvas = ref<HTMLCanvasElement | null>(null)
const showDrawingModal = ref(false)

const buttonLabel = computed(() => {
  const hasPreview = !!drawingPreviewUrl.value
  const action = hasPreview ? 'Edit' : 'Add'

  // If machineOrderId is not set, null, or 0 - general note
  if (!props.machineOrderId || props.machineOrderId === 0) {
    return `${action} general note`
  }

  // If machineOrderId is set, check resultType
  if (props.resultType === 'template') {
    return `${action} template`
  }

  // Default to 'notes' or if resultType is 'notes'
  return `${action} note`
})

const openDrawingModal = (event?: Event) => {
  if (event) {
    event.stopPropagation()
    event.preventDefault()
  }
  console.log('[v0] Opening DrawingModal for:', props.drawingId)
  console.log('[v0] initialImageUrl prop:', props.initialImageUrl)
  showDrawingModal.value = true
}

const handleDrawingClose = async () => {
  console.log('[v0] DrawingModal closed for:', props.drawingId)
  showDrawingModal.value = false
  await loadDrawingPreview()
}

const loadDrawingPreview = async () => {
  console.log('[v0] Loading drawing preview for:', props.drawingId)
  if (!props.drawingId) {
    drawingPreviewUrl.value = ''
    return
  }

  try {
    const isNative = Capacitor.isNativePlatform()
    let dataString

    if (isNative) {
      try {
        const result = await Filesystem.readFile({
          path: `drawings/drawing_${props.drawingId}.json`,
          directory: Directory.Data,
          encoding: Encoding.UTF8,
        })
        dataString = result.data
      } catch (error) {
        console.log('[v0] No drawing file found')
        drawingPreviewUrl.value = ''
        return
      }
    } else {
      dataString = localStorage.getItem(`drawing_${props.drawingId}`)
    }

    if (!dataString) {
      console.log('[v0] No drawing data found')
      drawingPreviewUrl.value = ''
      return
    }

    const drawingData = JSON.parse(dataString)
    const canvasData = drawingData.canvas || drawingData
    const objectCount = canvasData.objects?.length || 0

    if (objectCount === 0) {
      console.log('[v0] Drawing is empty')
      drawingPreviewUrl.value = ''
      return
    }

    await nextTick()

    if (!previewCanvas.value) {
      await new Promise(resolve => setTimeout(resolve, 100))
      if (!previewCanvas.value) {
        drawingPreviewUrl.value = ''
        return
      }
    }

    const canvasEl = previewCanvas.value
    const previewWidth = 800 // Higher resolution for better quality
    const previewHeight = 180 // Maintain 90px display height but 2x for quality

    canvasEl.width = previewWidth
    canvasEl.height = previewHeight

    const fabricCanvas = new fabric.Canvas(canvasEl, {
      width: previewWidth,
      height: previewHeight,
      backgroundColor: '#ffffff',
    })

    await new Promise<void>((resolve) => {
      fabricCanvas.loadFromJSON(canvasData, () => {
        fabricCanvas.renderAll()
        resolve()
      })
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    const objects = fabricCanvas.getObjects()

    if (objects.length === 0) {
      drawingPreviewUrl.value = ''
      fabricCanvas.dispose()
      return
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    objects.forEach(obj => {
      const bounds = obj.getBoundingRect(true, true)
      minX = Math.min(minX, bounds.left)
      minY = Math.min(minY, bounds.top)
      maxX = Math.max(maxX, bounds.left + bounds.width)
      maxY = Math.max(maxY, bounds.top + bounds.height)
    })

    const contentWidth = maxX - minX
    const contentHeight = maxY - minY

    if (contentWidth > 0 && contentHeight > 0) {
      const scaleX = previewWidth / contentWidth
      const scaleY = previewHeight / contentHeight
      const scale = Math.max(scaleX, scaleY) // Use max instead of min to fill/crop

      const scaledWidth = contentWidth * scale
      const scaledHeight = contentHeight * scale
      const offsetX = (previewWidth - scaledWidth) / 2 - minX * scale
      const offsetY = (previewHeight - scaledHeight) / 2 - minY * scale

      fabricCanvas.setViewportTransform([scale, 0, 0, scale, offsetX, offsetY])
      fabricCanvas.renderAll()

      await new Promise(resolve => setTimeout(resolve, 100))
    }

    const dataUrl = canvasEl.toDataURL('image/png')
    drawingPreviewUrl.value = dataUrl
    fabricCanvas.dispose()

  } catch (error) {
    console.error('[v0] Error loading drawing preview:', error)
    drawingPreviewUrl.value = ''
  }
}

watch(() => props.drawingId, async () => {
  await loadDrawingPreview()
}, { immediate: true })
</script>

<style scoped>
.drawing-preview-container {
  width: 100%;
}

.notes-layout {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
}

.edit-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: #000;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.2s ease;
}

.edit-icon:hover {
  color: #4a9eff;
}

.preview-wrapper {
  position: relative;
  flex: 1;
  height: 90px; /* Increased height from 60px to 90px (1.5x more) */
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Grid background always visible */
.grid-background-full {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 4px;
  background-image:
      linear-gradient(#e0f0ff 1px, transparent 1px),
      linear-gradient(90deg, #e0f0ff 1px, transparent 1px);
  background-size: 10px 10px;
  background-color: #ffffff;
  z-index: 1;
}

/* Image appears on top of grid */
.drawing-preview-full {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 4px;
  overflow: hidden;
  background-color: transparent;
  z-index: 2;
}

/* Image appears on top of grid */
.drawing-preview-full img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.add-note-btn {
  --padding-start: 1rem;
  --padding-end: 1rem;
  height: 32px;
  font-size: 0.85rem;
  text-transform: none;
  position: relative;
  z-index: 10;
}
</style>
