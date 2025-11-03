<template>
  <div class="drawing-preview-container">
    <h3 v-if="title" class="drawing-title">{{ title }}</h3>

    <div v-if="drawingPreviewUrl" class="drawing-preview" @click.stop.prevent="openDrawingModal">
      <img :src="drawingPreviewUrl" alt="Drawing preview" />
      <div class="preview-overlay">
        <ion-icon :icon="createOutline" size="large"></ion-icon>
        <p>Click to edit</p>
      </div>
    </div>
    <div v-else class="drawing-placeholder" @click.stop.prevent="openDrawingModal">
      <ion-icon :icon="brushOutline" size="large" color="medium"></ion-icon>
      <p>No {{ title ? title.toLowerCase() : 'drawing' }} yet</p>
      <ion-button fill="outline" size="small" @click.stop.prevent="openDrawingModal">
        <ion-icon :icon="addOutline" slot="start"></ion-icon>
        Create {{ title || 'Drawing' }}
      </ion-button>
    </div>

    <!-- Set display: none to completely remove canvas from layout -->
    <canvas ref="previewCanvas" style="display: none;"></canvas>
  </div>

  <DrawingModal
      v-show="showDrawingModal"
      :is-open="showDrawingModal"
      :drawing-id="drawingId"
      :initial-image-url="initialImageUrl || ''"
      @close="handleDrawingClose"
  />
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { IonIcon, IonButton } from '@ionic/vue'
import { brushOutline, addOutline, createOutline } from 'ionicons/icons'
import DrawingModal from '@/components/DrawingModal.vue'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Capacitor } from '@capacitor/core'
import { fabric } from 'fabric'

interface Props {
  drawingId: string
  title?: string
  initialImageUrl?: string
}

const props = defineProps<Props>()

const drawingPreviewUrl = ref('')
const previewCanvas = ref<HTMLCanvasElement | null>(null)
const showDrawingModal = ref(false)

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
    const previewWidth = 400
    const previewHeight = 150

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
      const padding = 20
      const scaleX = (previewWidth - padding * 2) / contentWidth
      const scaleY = (previewHeight - padding * 2) / contentHeight
      const scale = Math.min(scaleX, scaleY, 1)

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

.drawing-title {
  margin: 0 0 1rem 0;
  color: var(--ion-color-primary);
  font-size: 1.1rem;
  font-weight: 600;
}

.drawing-preview {
  position: relative;
  width: 100%;
  max-height: 200px;
  border: 2px solid var(--ion-color-primary);
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--ion-color-light);
}

.drawing-preview img {
  width: 100%;
  height: auto;
  max-height: 200px;
  object-fit: contain;
  display: block;
}

.drawing-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 150px;
  border: 2px dashed var(--ion-color-medium);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 1.5rem;
  text-align: center;
}

.drawing-placeholder:hover {
  border-color: var(--ion-color-primary);
  background-color: var(--ion-color-light);
}

.drawing-placeholder p {
  margin: 1rem 0;
  color: var(--ion-color-medium);
}

.preview-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  color: white;
}

.drawing-preview:hover .preview-overlay {
  opacity: 1;
}

.preview-overlay p {
  margin-top: 0.5rem;
  font-size: 0.9rem;
}
</style>
